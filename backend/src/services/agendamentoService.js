const { converterHorarioParaMinutos } = require('../utils/time');

const BLOQUEIO_MAX_MINUTOS = 480;

function normalizarBloqueio(agendamento) {
  if (!agendamento || agendamento.tipo !== 'bloqueio') return agendamento;

  const inicio = converterHorarioParaMinutos(agendamento.horarioInicio);
  const fim = converterHorarioParaMinutos(agendamento.horarioFim);
  const ehJanelaDiaInteiro = agendamento.horarioInicio === '00:00'
    && (agendamento.horarioFim === '23:59' || agendamento.horarioFim === '24:00');
  const duracao = (inicio === null || fim === null) ? null : (fim - inicio);

  if (agendamento.fullDay === true || ehJanelaDiaInteiro || duracao === 1439 || duracao === 1440) {
    return {
      ...agendamento,
      fullDay: true,
      horarioInicio: '00:00',
      horarioFim: '23:59'
    };
  }

  if (duracao === null || duracao <= 0) {
    throw new Error(`Bloqueio inválido no agendamento ${agendamento.id || '[sem-id]'}: horário final precisa ser maior que o inicial.`);
  }

  if (duracao > BLOQUEIO_MAX_MINUTOS) {
    throw new Error(`Bloqueio inválido no agendamento ${agendamento.id || '[sem-id]'}: máximo de 8h para bloqueios por hora.`);
  }

  const normalizado = { ...agendamento };
  delete normalizado.fullDay;
  return normalizado;
}

module.exports = {
  BLOQUEIO_MAX_MINUTOS,
  normalizarBloqueio
};
