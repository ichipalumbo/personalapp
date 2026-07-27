const {
  converterHorarioParaMinutos,
  normalizarDataParaISO,
  normalizarHorarioHHMM
} = require('../utils/time');

const BLOQUEIO_MAX_MINUTOS = 480;

function normalizarFormatoAgendamentoPersistencia(agendamento) {
  if (!agendamento) {
    return agendamento;
  }

  const normalizado = { ...agendamento };

  if (normalizado.data !== undefined && normalizado.data !== null) {
    const dataISO = normalizarDataParaISO(normalizado.data);
    if (dataISO) {
      normalizado.data = dataISO;
    }
  }

  if (normalizado.horarioInicio !== undefined && normalizado.horarioInicio !== null) {
    const horarioInicio = normalizarHorarioHHMM(normalizado.horarioInicio);
    if (horarioInicio) {
      normalizado.horarioInicio = horarioInicio;
    }
  }

  if (normalizado.horarioFim !== undefined && normalizado.horarioFim !== null) {
    const horarioFim = normalizarHorarioHHMM(normalizado.horarioFim);
    if (horarioFim) {
      normalizado.horarioFim = horarioFim;
    }
  }

  if (normalizado.horario !== undefined && normalizado.horario !== null) {
    const horario = normalizarHorarioHHMM(normalizado.horario);
    if (horario) {
      normalizado.horario = horario;
    }
  }

  return normalizado;
}

function normalizarBloqueio(agendamento) {
  const base = normalizarFormatoAgendamentoPersistencia(agendamento);

  if (!base || base.tipo !== 'bloqueio') return base;

  const inicio = converterHorarioParaMinutos(base.horarioInicio);
  const fim = converterHorarioParaMinutos(base.horarioFim);
  const ehJanelaDiaInteiro = base.horarioInicio === '00:00'
    && (base.horarioFim === '23:59' || base.horarioFim === '24:00');
  const duracao = (inicio === null || fim === null) ? null : (fim - inicio);

  if (base.fullDay === true || ehJanelaDiaInteiro || duracao === 1439 || duracao === 1440) {
    return {
      ...base,
      fullDay: true,
      horarioInicio: '00:00',
      horarioFim: '23:59'
    };
  }

  if (duracao === null || duracao <= 0) {
    throw new Error(`Bloqueio inválido no agendamento ${base.id || '[sem-id]'}: horário final precisa ser maior que o inicial.`);
  }

  if (duracao > BLOQUEIO_MAX_MINUTOS) {
    throw new Error(`Bloqueio inválido no agendamento ${base.id || '[sem-id]'}: máximo de 8h para bloqueios por hora.`);
  }

  const normalizado = { ...base };
  delete normalizado.fullDay;
  return normalizado;
}

module.exports = {
  BLOQUEIO_MAX_MINUTOS,
  normalizarBloqueio,
  normalizarFormatoAgendamentoPersistencia
};
