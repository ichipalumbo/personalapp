function converterHorarioParaMinutos(horario) {
  if (typeof horario !== 'string') return null;
  const partes = horario.split(':').map(Number);
  if (partes.length !== 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  const [h, m] = partes;
  if (h === 24 && m === 0) return 1440;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function isDataISOValida(dataISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataISO || ''))) {
    return false;
  }

  const [anoTexto, mesTexto, diaTexto] = String(dataISO).split('-');
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const utc = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    !Number.isNaN(utc.getTime())
    && utc.getUTCFullYear() === ano
    && (utc.getUTCMonth() + 1) === mes
    && utc.getUTCDate() === dia
  );
}

function normalizarDataParaISO(data) {
  if (data === undefined || data === null) {
    return null;
  }

  const texto = String(data).trim();

  if (!texto) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return isDataISOValida(texto) ? texto : null;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split('/');
    const iso = `${ano}-${mes}-${dia}`;
    return isDataISOValida(iso) ? iso : null;
  }

  const matchDateTime = texto.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (matchDateTime && matchDateTime[1]) {
    return isDataISOValida(matchDateTime[1]) ? matchDateTime[1] : null;
  }

  return null;
}

function normalizarHorarioHHMM(horario) {
  if (horario === undefined || horario === null) {
    return null;
  }

  const texto = String(horario).trim();
  const match = texto.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hora = Number(match[1]);
  const minuto = Number(match[2]);

  if (Number.isNaN(hora) || Number.isNaN(minuto)) {
    return null;
  }

  if (hora === 24 && minuto === 0) {
    return '24:00';
  }

  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
    return null;
  }

  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

module.exports = {
  converterHorarioParaMinutos,
  normalizarDataParaISO,
  normalizarHorarioHHMM
};
