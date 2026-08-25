const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const Agendamento = require('../models/Agendamento');
const BloqueioExterno = require('../models/BloqueioExterno');
const GoogleCalendarConnection = require('../models/GoogleCalendarConnection');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');
const { decryptRefreshToken } = require('../utils/gcalCrypto');
const { normalizeEmail } = require('../utils/emailNormalizer');

const GCAL_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const APP_ORIGIN = 'corepersonal';

function isAppOwnedEvent(event) {
  const appOrigin = event && event.extendedProperties && event.extendedProperties.private
    ? event.extendedProperties.private.app_origin
    : null;

  return String(appOrigin || '').toLowerCase() === APP_ORIGIN;
}

function deveIgnorarEventoDeLeitura(event) {
  return isAppOwnedEvent(event);
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
  const data = new Date(dataISO + 'T12:00:00');
  data.setDate(data.getDate() + quantidadeDias);
  return data.toISOString().slice(0, 10);
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

  if (agendamento && agendamento.local) {
    evento.location = String(agendamento.local);
  }

  if (fullDay) {
    const dtFim = new Date(dataISO + 'T12:00:00Z');
    dtFim.setUTCDate(dtFim.getUTCDate() + 1);
    const dataFim = dtFim.toISOString().slice(0, 10);

    evento.start = { date: dataISO };
    evento.end = { date: dataFim };
    return evento;
  }

  const horarioInicio = getHorarioPadraoInicio(agendamento);
  const horarioFim = getHorarioPadraoFim(agendamento);
  const [inicioHora, inicioMinuto] = horarioInicio.split(':').map((parte) => Number(parte || 0));
  const [fimHora, fimMinuto] = horarioFim.split(':').map((parte) => Number(parte || 0));
  const inicioEmMinutos = (inicioHora * 60) + inicioMinuto;
  const fimEmMinutos = (fimHora * 60) + fimMinuto;
  const dataFimISO = fimEmMinutos <= inicioEmMinutos ? adicionarDiasISO(dataISO, 1) : dataISO;

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

    return fetchCalendarPage(oauth2Client, `/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events?${params.toString()}`);
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

  return fetchCalendarPage(oauth2Client, `/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events?${params.toString()}`);
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
    if (!event || !event.id) {
      continue;
    }

    if (deveIgnorarEventoDeLeitura(event)) {
      continue;
    }

    if (event.status === 'cancelled') {
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
    if (!event || !event.id) {
      continue;
    }

    if (deveIgnorarEventoDeLeitura(event)) {
      continue;
    }

    console.log('[GcalWebhookDiag] Evento cancelado recebido; removendo localmente.', {
      ownerEmail,
      eventId: event.id
    });

    await deleteBloqueio(ownerEmail, event.id);
  }

  if (!connection.syncToken) {
    const currentRemoteIds = new Set(remoteIds);
    const localBloqueios = await BloqueioExterno.find({ ownerEmail }).select('googleCalendarEventId').lean();

    for (const bloqueio of localBloqueios) {
      if (!bloqueio || !bloqueio.googleCalendarEventId) {
        continue;
      }

      if (!currentRemoteIds.has(bloqueio.googleCalendarEventId)) {
        await deleteBloqueio(ownerEmail, bloqueio.googleCalendarEventId);
      }
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
  pushEventToGoogle,
  updateEventInGoogle,
  deleteEventFromGoogle,
  registerWebhookChannel,
  renewWebhookChannelForOwner,
  decryptRefreshToken,
  isAppOwnedEvent,
  deveIgnorarEventoDeLeitura,
  mapEventToBloqueio,
  getHorarioPadraoFim,
  montarTituloEvento,
  resolverDataISO
};