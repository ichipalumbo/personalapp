const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const Agendamento = require('../models/Agendamento');
const BloqueioExterno = require('../models/BloqueioExterno');
const GoogleCalendarConnection = require('../models/GoogleCalendarConnection');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');
const { decryptRefreshToken } = require('../utils/gcalCrypto');
const { normalizeEmail } = require('../utils/emailNormalizer');
const recurrenceHelpers = require('../../../assets/js/shared/recurrence-helpers');

const GCAL_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const APP_ORIGIN = 'corepersonal';

function isAppOwnedEvent(event) {
  const appOrigin = event && event.extendedProperties && event.extendedProperties.private
    ? event.extendedProperties.private.app_origin
    : null;

  return String(appOrigin || '').toLowerCase() === APP_ORIGIN;
}

function classificarEventoDeLeitura(event) {
  if (!event || !event.id) {
    return 'ignorar';
  }

  if (isAppOwnedEvent(event)) {
    return 'ignorar';
  }

  if (event.status === 'cancelled') {
    return 'remover';
  }

  return 'upsert';
}

function formatDateTimePartsFromZone(dateTimeValue, timeZone) {
  if (!dateTimeValue || !timeZone) {
    return null;
  }

  const parsed = new Date(String(dateTimeValue));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(parsed);
    const values = {};

    for (const part of parts) {
      if (part && part.type && part.type !== 'literal') {
        values[part.type] = part.value;
      }
    }

    if (!values.year || !values.month || !values.day || !values.hour || !values.minute) {
      return null;
    }

    return {
      data: `${values.year}-${values.month}-${values.day}`,
      horario: `${values.hour}:${values.minute}`
    };
  } catch (_) {
    return null;
  }
}

function parseDateTimeLiteralParts(dateTimeValue) {
  const match = String(dateTimeValue || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  return {
    data: match[1],
    horario: `${match[2]}:${match[3]}`
  };
}

function parseDateTimeUtcParts(dateTimeValue) {
  const parsed = new Date(String(dateTimeValue || ''));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    data: parsed.toISOString().slice(0, 10),
    horario: `${String(parsed.getUTCHours()).padStart(2, '0')}:${String(parsed.getUTCMinutes()).padStart(2, '0')}`
  };
}

function mapDateTimeToStorageParts(dateTimeValue, timeZone) {
  return (
    formatDateTimePartsFromZone(dateTimeValue, timeZone)
    || parseDateTimeLiteralParts(dateTimeValue)
    || parseDateTimeUtcParts(dateTimeValue)
  );
}

function mapEventToBloqueio(event) {
  const fullDay = !!(event && event.start && event.start.date);
  let data = '';
  let horarioInicio = '00:00';
  let horarioFim = '23:59';

  if (fullDay) {
    data = event.start.date;
  } else if (event && event.start && event.start.dateTime && event.end && event.end.dateTime) {
    const startTimeZone = event.start.timeZone || event.end.timeZone || null;
    const endTimeZone = event.end.timeZone || event.start.timeZone || null;
    const inicio = mapDateTimeToStorageParts(event.start.dateTime, startTimeZone);
    const fim = mapDateTimeToStorageParts(event.end.dateTime, endTimeZone);

    if (inicio) {
      data = inicio.data;
      horarioInicio = inicio.horario;
    }

    if (fim) {
      horarioFim = fim.horario;
    }
  }

  const dataNormalizada = normalizarDataParaISO(data);
  const horarioInicioNormalizado = normalizarHorarioHHMM(horarioInicio);
  const horarioFimNormalizado = normalizarHorarioHHMM(horarioFim);

  return {
    googleCalendarEventId: event.id,
    titulo: event.summary || 'Evento externo',
    data: dataNormalizada || data,
    horarioInicio: horarioInicioNormalizado || horarioInicio,
    horarioFim: horarioFimNormalizado || horarioFim,
    fullDay,
    source: 'google_external'
  };
}

function getHorarioPadraoInicio(agendamento) {
  return agendamento && agendamento.horarioInicio ? String(agendamento.horarioInicio) : '00:00';
}

function getHorarioPadraoFim(agendamento) {
  if (agendamento && agendamento.horarioFim) {
    return String(agendamento.horarioFim);
  }

  const inicio = getHorarioPadraoInicio(agendamento);
  const [horaTexto, minutoTexto] = inicio.split(':');
  const hora = Number(horaTexto || '0');
  const minuto = Number(minutoTexto || '0');
  const fimTotal = (hora * 60) + minuto + 60;
  const fimHora = Math.floor(fimTotal / 60) % 24;
  const fimMinuto = fimTotal % 60;
  return String(fimHora).padStart(2, '0') + ':' + String(fimMinuto).padStart(2, '0');
}

function resolverDataISO(agendamento) {
  const data = agendamento && agendamento.data ? String(agendamento.data) : '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  return new Date().toISOString().slice(0, 10);
}

function montarTituloEvento(agendamento) {
  const alunoPopulado = agendamento && agendamento.aluno && typeof agendamento.aluno === 'object'
    ? agendamento.aluno
    : null;

  const alunoNome = (
    (agendamento && agendamento.alunoNome)
    || (agendamento && agendamento.nomeAluno)
    || (alunoPopulado && alunoPopulado.nome)
    || ''
  );

  const objetivo = (
    (agendamento && agendamento.objetivo)
    || (agendamento && agendamento.alunoObjetivo)
    || (alunoPopulado && alunoPopulado.objetivo)
    || ''
  );

  const nomeLimpo = String(alunoNome || '').trim();
  const objetivoLimpo = String(objetivo || '').trim();

  if (objetivoLimpo && nomeLimpo) {
    return objetivoLimpo + ' - ' + nomeLimpo;
  }

  if (objetivoLimpo) {
    return objetivoLimpo;
  }

  const descricao = agendamento && agendamento.descricao ? String(agendamento.descricao).trim() : '';
  if (descricao) {
    return descricao;
  }

  const tipo = agendamento && agendamento.tipo ? String(agendamento.tipo).trim().toLowerCase() : '';

  if (tipo === 'aula') {
    return nomeLimpo ? 'Aula - ' + nomeLimpo : 'Aula';
  }

  if (tipo === 'deslocamento') {
    return nomeLimpo ? 'Deslocamento - ' + nomeLimpo : 'Deslocamento';
  }

  if (tipo === 'bloqueio') {
    return 'Bloqueio';
  }

  if (tipo === 'reposicao') {
    return nomeLimpo ? 'Reposição - ' + nomeLimpo : 'Reposição';
  }

  return nomeLimpo ? nomeLimpo : 'Compromisso';
}

function montarExtendedProperties(agendamento) {
  return {
    private: {
      app_origin: APP_ORIGIN,
      app_id: agendamento && agendamento.id ? String(agendamento.id) : ''
    }
  };
}

function adicionarDiasISO(dataISO, quantidadeDias) {
  const data = new Date(dataISO + 'T12:00:00Z');
  data.setUTCDate(data.getUTCDate() + quantidadeDias);
  return data.toISOString().slice(0, 10);
}

function parseDataISOParaDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value + 'T12:00:00Z');
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dia, mes, ano] = value.split('/').map(Number);
    const parsed = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = recurrenceHelpers.parseDataFlex(value);
  if (!parsed) {
    return null;
  }

  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0));
}

function formatarDataUtcRfc5545(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString()
    .replace(/-/g, '')
    .replace(/:/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function formatterDateTimeUtcInclusivo(valuePtBr) {
  const parsed = parseDataISOParaDate(valuePtBr);
  if (!parsed) {
    return null;
  }

  const utc = new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    23,
    59,
    59,
    0
  ));

  return formatarDataUtcRfc5545(utc);
}

function obterUltimoDiaMesISO(dataISO) {
  const data = parseDataISOParaDate(dataISO);
  if (!data) {
    return null;
  }

  const ultimoDiaMes = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0, 12, 0, 0));
  return ultimoDiaMes.toISOString().slice(0, 10);
}

function mapearDiaSemanaParaCodigoRFC(nomeDia) {
  const nomes = recurrenceHelpers.DEFAULT_DIAS_SEMANA || [];
  const indice = nomes.findIndex((nome) => nome && nome.toLowerCase() === String(nomeDia || '').trim().toLowerCase());
  if (indice >= 0) {
    const mapa = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return mapa[indice] || null;
  }

  if (typeof nomeDia === 'number' && nomeDia >= 0 && nomeDia <= 6) {
    const mapa = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return mapa[nomeDia] || null;
  }

  return null;
}

function obterListaDiasSemanaParaRrule(agendamento) {
  const lista = Array.isArray(agendamento && agendamento.diasSemana)
    ? agendamento.diasSemana
    : [];

  const dias = [];
  for (const valor of lista) {
    const codigo = mapearDiaSemanaParaCodigoRFC(valor);
    if (codigo) {
      dias.push(codigo);
    }
  }

  if (dias.length === 0 && agendamento && agendamento.dia) {
    const codigo = mapearDiaSemanaParaCodigoRFC(agendamento.dia);
    if (codigo) {
      dias.push(codigo);
    }
  }

  return Array.from(new Set(dias));
}

function montarExdatesDeAgendamento(agendamento) {
  if (!agendamento) {
    return [];
  }

  const source = Array.isArray(agendamento.excecoesDetalhadas) && agendamento.excecoesDetalhadas.length > 0
    ? agendamento.excecoesDetalhadas
    : (Array.isArray(agendamento.excecoes) ? agendamento.excecoes : []);

  const timezone = agendamento.timeZone || process.env.GCAL_TIMEZONE || 'America/Sao_Paulo';
  const startDate = parseDataISOParaDate(agendamento.recorrenciaDataInicio || agendamento.data || agendamento.dataCriacao);
  const endDate = agendamento.recorrenciaFimCondicao === 'untilDate' && agendamento.recorrenciaDataFim
    ? parseDataISOParaDate(agendamento.recorrenciaDataFim)
    : null;

  const valores = new Set();

  for (const item of source) {
    if (!item) {
      continue;
    }

    const rawData = typeof item === 'string'
      ? item
      : (item.data || item.dataISO || item.dataIso || item.dataOriginal || item.dataOriginalISO || item.iso || item.dataExcecao || '');

    if (!rawData) {
      continue;
    }

    const dataISO = parseDataISOParaDate(rawData);
    if (!dataISO) {
      continue;
    }

    const dataSomente = new Date(Date.UTC(dataISO.getUTCFullYear(), dataISO.getUTCMonth(), dataISO.getUTCDate()));
    if (startDate && dataSomente < startDate) {
      continue;
    }
    if (endDate && dataSomente > endDate) {
      continue;
    }

    const ehDiaInteiro = agendamento && (
      agendamento.fullDay === true
      || (agendamento.horarioInicio === '00:00' && (agendamento.horarioFim === '23:59' || agendamento.horarioFim === '24:00'))
    );

    const horarioBase = typeof item === 'string'
      ? (agendamento.horarioInicio || '00:00')
      : (item.horarioInicio || item.horario || agendamento.horarioInicio || '00:00');
    const horario = String(horarioBase || '00:00').trim();
    const versao = horario.match(/^\d{2}:\d{2}$/) ? horario : '00:00';
    const [hora, minuto] = versao.split(':').map((parte) => Number(parte || 0));

    if (ehDiaInteiro) {
      valores.add(`EXDATE;VALUE=DATE:${dataSomente.toISOString().slice(0, 10).replace(/-/g, '')}`);
      continue;
    }

    const dataGoogle = dataSomente.toISOString().slice(0, 10).replace(/-/g, '');
    valores.add(`EXDATE;TZID=${timezone}:${dataGoogle}T${String(hora).padStart(2, '0')}${String(minuto).padStart(2, '0')}00`);
  }

  return Array.from(valores);
}

function montarRecurrence(agendamento) {
  if (!agendamento || !agendamento.tipoRecorrencia) {
    return null;
  }

  if ((agendamento.frequencia && agendamento.frequencia !== 'semanal') || agendamento.tipoRecorrencia === 'uma_vez') {
    return null;
  }

  const tipo = String(agendamento.tipoRecorrencia).trim().toLowerCase();
  const mapaFreq = {
    diaria: 'DAILY',
    semanal: 'WEEKLY',
    mensal: 'MONTHLY',
    anual: 'YEARLY'
  };

  const freq = mapaFreq[tipo];
  if (!freq) {
    return null;
  }

  const ruleParts = [`FREQ=${freq}`];
  const intervalo = Number(agendamento.intervaloRecorrencia || 1);
  if (Number.isFinite(intervalo) && intervalo > 1) {
    ruleParts.push(`INTERVAL=${intervalo}`);
  }

  if (tipo === 'semanal') {
    const dias = obterListaDiasSemanaParaRrule(agendamento);
    if (dias.length === 0) {
      return null;
    }
    ruleParts.push(`BYDAY=${dias.join(',')}`);
  }

  if (tipo === 'mensal') {
    const dias = obterListaDiasSemanaParaRrule(agendamento);
    if (dias.length > 0) {
      ruleParts.push(`BYDAY=${dias.join(',')}`);
    } else {
      const dataInicio = parseDataISOParaDate(agendamento.recorrenciaDataInicio || agendamento.data || agendamento.dataCriacao);
      if (!dataInicio) {
        return null;
      }
      const mesDia = dataInicio.getUTCDate();
      ruleParts.push(`BYMONTHDAY=${mesDia}`);
    }
  }

  if (tipo === 'anual') {
    const dataInicio = parseDataISOParaDate(agendamento.recorrenciaDataInicio || agendamento.data || agendamento.dataCriacao);
    if (!dataInicio) {
      return null;
    }
    ruleParts.push(`BYMONTH=${dataInicio.getUTCMonth() + 1}`);
    ruleParts.push(`BYMONTHDAY=${dataInicio.getUTCDate()}`);
  }

  const fimCondicao = agendamento.recorrenciaFimCondicao || null;
  if (fimCondicao === 'occurrences') {
    const quantidade = Number(agendamento.recorrenciaQuantidadeOcorrencias || 0);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return null;
    }
    ruleParts.push(`COUNT=${quantidade}`);
  } else if (fimCondicao === 'untilDate' && agendamento.recorrenciaDataFim) {
    const until = formatterDateTimeUtcInclusivo(agendamento.recorrenciaDataFim);
    if (!until) {
      return null;
    }
    ruleParts.push(`UNTIL=${until}`);
  } else if (agendamento.recorrenciaEscopo === 'monthOfDate') {
    const dataInicio = parseDataISOParaDate(agendamento.recorrenciaDataInicio || agendamento.data || agendamento.dataCriacao);
    if (!dataInicio) {
      return null;
    }
    const ultimoDiaMes = new Date(Date.UTC(dataInicio.getUTCFullYear(), dataInicio.getUTCMonth() + 1, 0, 23, 59, 59));
    const until = formatarDataUtcRfc5545(ultimoDiaMes);
    if (!until) {
      return null;
    }
    ruleParts.push(`UNTIL=${until}`);
  }

  const recurrence = [`RRULE:${ruleParts.join(';')}`];
  const exdates = montarExdatesDeAgendamento(agendamento);
  if (exdates.length > 0) {
    recurrence.push(...exdates);
  }

  return recurrence;
}

function montarEventoGoogle(agendamento) {
  const dataISO = resolverDataISO(agendamento);
  const titulo = montarTituloEvento(agendamento);
  const timezone = process.env.GCAL_TIMEZONE || 'America/Sao_Paulo';
  const fullDay = agendamento && (
    agendamento.fullDay === true
    || (agendamento.horarioInicio === '00:00' && (agendamento.horarioFim === '23:59' || agendamento.horarioFim === '24:00'))
  );
  const evento = {
    summary: titulo,
    colorId: '6',
    extendedProperties: montarExtendedProperties(agendamento)
  };

  const recurrence = montarRecurrence(agendamento);
  if (recurrence && recurrence.length > 0) {
    evento.recurrence = recurrence;
  }

  if (agendamento && agendamento.local) {
    evento.location = String(agendamento.local);
  }

  if (fullDay) {
    evento.start = { date: dataISO };
    evento.end = { date: adicionarDiasISO(dataISO, 1) };
    return evento;
  }

  const horarioInicio = getHorarioPadraoInicio(agendamento);
  const horarioFim = getHorarioPadraoFim(agendamento);
  const [inicioHora, inicioMinuto] = horarioInicio.split(':').map((parte) => Number(parte || 0));
  const [fimHora, fimMinuto] = horarioFim.split(':').map((parte) => Number(parte || 0));
  const inicioEmMinutos = (inicioHora * 60) + inicioMinuto;
  const fimEmMinutos = (fimHora * 60) + fimMinuto;
  const dataFimISO = fimEmMinutos < inicioEmMinutos ? adicionarDiasISO(dataISO, 1) : dataISO;

  evento.start = {
    dateTime: dataISO + 'T' + horarioInicio + ':00',
    timeZone: timezone
  };
  evento.end = {
    dateTime: dataFimISO + 'T' + horarioFim + ':00',
    timeZone: timezone
  };

  return evento;
}

async function createCalendarClient(connection) {
  const refreshToken = decryptRefreshToken(connection.refreshTokenEncrypted, connection.refreshTokenIv);

  if (!refreshToken) {
    const error = new Error('Stored Google refresh token is missing or unreadable.');
    error.statusCode = 400;
    throw error;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GIS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error('Google OAuth configuration is missing on the server.');
    error.statusCode = 500;
    throw error;
  }

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: 'postmessage'
  });

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return oauth2Client;
}

async function getConnectionForOwner(ownerEmail) {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);

  if (!normalizedOwnerEmail) {
    const error = new Error('ownerEmail is required to access Google Calendar connection.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await GoogleCalendarConnection.findOne({ ownerEmail: normalizedOwnerEmail });

  if (!connection) {
    const error = new Error('Google Calendar connection not found for the authenticated owner.');
    error.statusCode = 404;
    throw error;
  }

  return connection;
}

async function getClientForOwner(ownerEmail) {
  const connection = await getConnectionForOwner(ownerEmail);
  const oauth2Client = await createCalendarClient(connection);
  return { connection, oauth2Client };
}

function getWebhookAddress() {
  const rawBaseUrl = process.env.BACKEND_URL;

  if (!rawBaseUrl) {
    const error = new Error('BACKEND_URL is not configured.');
    error.statusCode = 500;
    throw error;
  }

  let parsed;

  try {
    parsed = new URL(String(rawBaseUrl));
  } catch (_) {
    const error = new Error('BACKEND_URL is not a valid URL.');
    error.statusCode = 500;
    throw error;
  }

  if (parsed.protocol !== 'https:') {
    const error = new Error('BACKEND_URL must be a public HTTPS URL for Google Calendar webhooks.');
    error.statusCode = 500;
    throw error;
  }

  const basePath = parsed.pathname && parsed.pathname !== '/'
    ? parsed.pathname.replace(/\/$/, '')
    : '';

  return `${parsed.origin}${basePath}/api/webhooks/gcal`;
}

async function calendarFetch(oauth2Client, path, options = {}) {
  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = typeof accessTokenResponse === 'string'
    ? accessTokenResponse
    : accessTokenResponse && accessTokenResponse.token;

  if (!accessToken) {
    const error = new Error('Unable to obtain a Google access token from the stored refresh token.');
    error.statusCode = 401;
    throw error;
  }

  const url = path.startsWith('http') ? path : `${GCAL_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Google Calendar API returned ${response.status} for ${url}: ${body}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

async function fetchCalendarPage(oauth2Client, path) {
  const activeItems = [];
  const cancelledItems = [];
  let nextPageToken = null;
  let nextSyncToken = null;
  let pagePath = path;

  while (pagePath) {
    const payload = await calendarFetch(oauth2Client, pagePath);
    const items = payload && Array.isArray(payload.items) ? payload.items : [];

    for (const event of items) {
      if (event && event.status === 'cancelled') {
        cancelledItems.push(event);
      } else {
        activeItems.push(event);
      }
    }

    if (payload && payload.nextPageToken) {
      const url = new URL(pagePath.startsWith('http') ? pagePath : `${GCAL_BASE_URL}${pagePath}`);
      url.searchParams.set('pageToken', payload.nextPageToken);
      pagePath = url.toString();
      continue;
    }

    nextPageToken = null;
    nextSyncToken = payload && payload.nextSyncToken ? payload.nextSyncToken : null;
    pagePath = null;
  }

  return {
    activeItems,
    cancelledItems,
    nextSyncToken
  };
}

function extrairDataISOValida(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }

  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  return normalizarDataParaISO(texto);
}

function obterJanelaConsulta(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const timeMin = extrairDataISOValida(payload.timeMin);
  const timeMax = extrairDataISOValida(payload.timeMax);

  if (!timeMin || !timeMax || timeMin > timeMax) {
    return null;
  }

  return {
    timeMin,
    timeMax
  };
}

function isBloqueioDentroDaJanela(bloqueio, janela) {
  if (!bloqueio || !janela) {
    return false;
  }

  const dataBloqueio = extrairDataISOValida(bloqueio.data);
  if (!dataBloqueio) {
    return false;
  }

  const timeMin = extrairDataISOValida(janela.timeMin);
  const timeMax = extrairDataISOValida(janela.timeMax);

  if (!timeMin || !timeMax || timeMin > timeMax) {
    return false;
  }

  return dataBloqueio >= timeMin && dataBloqueio <= timeMax;
}

async function listCalendarEvents(oauth2Client, connection) {
  const syncToken = connection.syncToken || null;

  console.log('[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao.', {
    ownerEmail: connection.ownerEmail,
    syncMode: syncToken ? 'incremental' : 'full',
    syncToken
  });

  if (syncToken) {
    const params = new URLSearchParams({
      syncToken,
      singleEvents: 'true',
      maxResults: '250'
    });

    return {
      ...(await fetchCalendarPage(oauth2Client, `/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events?${params.toString()}`)),
      timeMin: null,
      timeMax: null
    };
  }

  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 1);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 2);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    showDeleted: 'false',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString()
  });

  const result = await fetchCalendarPage(oauth2Client, `/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events?${params.toString()}`);

  return {
    ...result,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString()
  };
}

async function upsertBloqueio(ownerEmail, event) {
  const payload = mapEventToBloqueio(event);

  return BloqueioExterno.findOneAndUpdate(
    { ownerEmail, googleCalendarEventId: payload.googleCalendarEventId },
    {
      $set: {
        ownerEmail,
        ...payload
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
}

async function deleteBloqueio(ownerEmail, googleCalendarEventId) {
  return BloqueioExterno.findOneAndDelete({ ownerEmail, googleCalendarEventId });
}

async function deleteAgendamento(ownerEmail, googleCalendarEventId) {
  return Agendamento.findOneAndDelete({ ownerEmail, googleCalendarEventId });
}

async function persistSyncResults(connection, payload) {
  const ownerEmail = connection.ownerEmail;
  const activeEvents = Array.isArray(payload.activeItems) ? payload.activeItems : [];
  const cancelledEvents = Array.isArray(payload.cancelledItems) ? payload.cancelledItems : [];

  console.log('[GcalWebhookDiag] Persistindo resultados de sincronizacao.', {
    ownerEmail,
    activeEvents: activeEvents.length,
    cancelledItems: cancelledEvents.length
  });

  const remoteIds = new Set();

  for (const event of activeEvents) {
    const acao = classificarEventoDeLeitura(event);

    if (acao === 'ignorar') {
      continue;
    }

    if (acao === 'remover') {
      console.log('[GcalWebhookDiag] Evento marcado como cancelado durante varredura de ativos; removendo localmente.', {
        ownerEmail,
        eventId: event.id
      });
      await deleteBloqueio(ownerEmail, event.id);
      continue;
    }

    console.log('[GcalWebhookDiag] Upsert de evento externo no bloqueio.', {
      ownerEmail,
      eventId: event.id,
      summary: event.summary || null
    });

    remoteIds.add(event.id);
    await upsertBloqueio(ownerEmail, event);
  }

  for (const event of cancelledEvents) {
    const acao = classificarEventoDeLeitura(event);

    if (acao === 'ignorar') {
      continue;
    }

    if (acao !== 'remover') {
      continue;
    }

    console.log('[GcalWebhookDiag] Evento cancelado recebido; removendo localmente.', {
      ownerEmail,
      eventId: event.id
    });

    await deleteBloqueio(ownerEmail, event.id);
  }

  if (!connection.syncToken) {
    const janelaConsulta = obterJanelaConsulta(payload);

    if (!janelaConsulta) {
      console.warn('[GcalWebhookDiag] Full sync sem janela válida; nenhum purge executado por segurança.', {
        ownerEmail,
        payload: payload && typeof payload === 'object' ? {
          timeMin: payload.timeMin,
          timeMax: payload.timeMax
        } : null
      });
      return;
    }

    const currentRemoteIds = new Set(remoteIds);
    const localBloqueios = await BloqueioExterno.find({ ownerEmail }).select('googleCalendarEventId data').lean();

    for (const bloqueio of localBloqueios) {
      if (!bloqueio || !bloqueio.googleCalendarEventId) {
        continue;
      }

      if (currentRemoteIds.has(bloqueio.googleCalendarEventId)) {
        continue;
      }

      if (!isBloqueioDentroDaJanela(bloqueio, janelaConsulta)) {
        console.log('[GcalWebhookDiag] Preservando bloqueio local fora da janela de full sync.', {
          ownerEmail,
          eventId: bloqueio.googleCalendarEventId,
          data: bloqueio.data,
          timeMin: janelaConsulta.timeMin,
          timeMax: janelaConsulta.timeMax
        });
        continue;
      }

      await deleteBloqueio(ownerEmail, bloqueio.googleCalendarEventId);
    }
  }
}

async function saveConnectionSyncState(connectionId, updates) {
  return GoogleCalendarConnection.findByIdAndUpdate(
    connectionId,
    { $set: updates },
    { new: true }
  );
}

async function registerWebhookChannel(connection, oauth2Client) {
  if (!connection || !connection._id) {
    const error = new Error('Google Calendar connection not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!oauth2Client) {
    const error = new Error('Authenticated Google client is required to register the webhook channel.');
    error.statusCode = 500;
    throw error;
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const watchRequest = {
    id: crypto.randomUUID(),
    type: 'web_hook',
    address: getWebhookAddress()
  };

  const response = await calendar.events.watch({
    calendarId: connection.calendarId || 'primary',
    requestBody: watchRequest
  });

  const channelExpiration = response && response.data && response.data.expiration
    ? new Date(Number(response.data.expiration))
    : null;

  return saveConnectionSyncState(connection._id, {
    channelId: response && response.data && response.data.id ? String(response.data.id) : watchRequest.id,
    channelResourceId: response && response.data && response.data.resourceId ? String(response.data.resourceId) : null,
    channelExpiration: channelExpiration && !Number.isNaN(channelExpiration.getTime()) ? channelExpiration : null
  });
}

async function renewWebhookChannelForOwner(ownerEmail) {
  const { connection, oauth2Client } = await getClientForOwner(ownerEmail);
  return registerWebhookChannel(connection, oauth2Client);
}

async function pushEventToGoogle(ownerEmail, agendamento) {
  const { connection, oauth2Client } = await getClientForOwner(ownerEmail);
  const evento = montarEventoGoogle(agendamento);
  const calendarioId = connection.calendarId || 'primary';

  const criado = await calendarFetch(oauth2Client, `/calendars/${encodeURIComponent(calendarioId)}/events`, {
    method: 'POST',
    body: evento
  });

  return {
    googleCalendarEventId: criado && criado.id ? String(criado.id) : null,
    googleEvent: criado
  };
}

async function updateEventInGoogle(ownerEmail, agendamento) {
  const { connection, oauth2Client } = await getClientForOwner(ownerEmail);
  const googleCalendarEventId = agendamento && agendamento.googleCalendarEventId ? String(agendamento.googleCalendarEventId) : '';

  if (!googleCalendarEventId) {
    const error = new Error('googleCalendarEventId is required to update a Google Calendar event.');
    error.statusCode = 400;
    throw error;
  }

  const evento = montarEventoGoogle(agendamento);
  const calendarioId = connection.calendarId || 'primary';

  const atualizado = await calendarFetch(
    oauth2Client,
    `/calendars/${encodeURIComponent(calendarioId)}/events/${encodeURIComponent(googleCalendarEventId)}`,
    {
      method: 'PUT',
      body: evento
    }
  );

  return {
    googleCalendarEventId: atualizado && atualizado.id ? String(atualizado.id) : googleCalendarEventId,
    googleEvent: atualizado
  };
}

async function deleteEventFromGoogle(ownerEmail, googleCalendarEventId) {
  const { connection, oauth2Client } = await getClientForOwner(ownerEmail);
  const eventId = googleCalendarEventId ? String(googleCalendarEventId) : '';

  if (!eventId) {
    const error = new Error('googleCalendarEventId is required to delete a Google Calendar event.');
    error.statusCode = 400;
    throw error;
  }

  const calendarioId = connection.calendarId || 'primary';

  await calendarFetch(
    oauth2Client,
    `/calendars/${encodeURIComponent(calendarioId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE'
    }
  );

  return {
    googleCalendarEventId: eventId,
    deleted: true
  };
}

async function syncConnection(connection) {
  if (!connection) {
    const error = new Error('Google Calendar connection not found.');
    error.statusCode = 404;
    throw error;
  }

  const oauth2Client = await createCalendarClient(connection);

  try {
    const payload = await listCalendarEvents(oauth2Client, connection);
    await persistSyncResults(connection, payload);

    const updates = {
      lastSyncAt: new Date(),
      syncToken: payload.nextSyncToken || null
    };

    await saveConnectionSyncState(connection._id, updates);

    return {
      ok: true,
      ownerEmail: connection.ownerEmail,
      activeItems: Array.isArray(payload.activeItems) ? payload.activeItems.length : 0,
      cancelledItems: Array.isArray(payload.cancelledItems) ? payload.cancelledItems.length : 0,
      syncTokenSaved: !!payload.nextSyncToken
    };
  } catch (err) {
    if (err && (err.statusCode === 410 || err.status === 410 || /\b410\b/.test(err.message || ''))) {
      await saveConnectionSyncState(connection._id, { syncToken: null });

      const fallbackConnection = await GoogleCalendarConnection.findById(connection._id);
      const fallbackOauthClient = await createCalendarClient(fallbackConnection);
      const payload = await listCalendarEvents(fallbackOauthClient, fallbackConnection);

      await persistSyncResults(fallbackConnection, payload);

      const updates = {
        lastSyncAt: new Date(),
        syncToken: payload.nextSyncToken || null
      };

      await saveConnectionSyncState(connection._id, updates);

      return {
        ok: true,
        ownerEmail: fallbackConnection.ownerEmail,
        activeItems: Array.isArray(payload.activeItems) ? payload.activeItems.length : 0,
        cancelledItems: Array.isArray(payload.cancelledItems) ? payload.cancelledItems.length : 0,
        syncTokenSaved: !!payload.nextSyncToken,
        recoveredFromExpiredSyncToken: true
      };
    }

    throw err;
  }
}

async function syncConnectionByWebhookHeaders(channelId, resourceId) {
  console.log('[GcalWebhookDiag] Iniciando sincronizacao por webhook headers.', {
    channelId,
    resourceId
  });

  if (!channelId || !resourceId) {
    const error = new Error('x-goog-channel-id and x-goog-resource-id are required.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await GoogleCalendarConnection.findOne({
    channelId: String(channelId),
    channelResourceId: String(resourceId)
  });

  if (!connection) {
    const error = new Error('Google Calendar connection not found for the provided webhook channel.');
    error.statusCode = 404;
    throw error;
  }

  console.log('[GcalWebhookDiag] Conexao encontrada para webhook.', {
    connectionId: String(connection._id),
    ownerEmail: connection.ownerEmail
  });

  const result = await syncConnection(connection);

  await GoogleCalendarConnection.findByIdAndUpdate(connection._id, {
    $set: {
      lastWebhookAt: new Date()
    }
  });

  console.log(`Webhook processing complete for user ${connection.ownerEmail}.`);

  return result;
}

module.exports = {
  syncConnection,
  syncConnectionByWebhookHeaders,
  listCalendarEvents,
  persistSyncResults,
  pushEventToGoogle,
  updateEventInGoogle,
  deleteEventFromGoogle,
  registerWebhookChannel,
  renewWebhookChannelForOwner,
  decryptRefreshToken,
  APP_ORIGIN,
  isAppOwnedEvent,
  classificarEventoDeLeitura,
  mapEventToBloqueio,
  adicionarDiasISO,
  getHorarioPadraoFim,
  montarEventoGoogle,
  montarRecurrence,
  montarTituloEvento,
  resolverDataISO
};