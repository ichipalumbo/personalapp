function converterHorarioParaMinutos(horario) {
  if (typeof horario !== 'string') return null;
  const partes = horario.split(':').map(Number);
  if (partes.length !== 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  const [h, m] = partes;
  if (h === 24 && m === 0) return 1440;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

module.exports = {
  converterHorarioParaMinutos
};
