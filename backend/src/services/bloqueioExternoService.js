const BloqueioExterno = require('../models/BloqueioExterno');

/**
 * Calcula o identificador de semana ISO (ex. '2026-W29') a partir de uma data YYYY-MM-DD.
 */
function _calcularSemanaISO(dataStr) {
  try {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    const date = new Date(ano, mes - 1, dia);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${ano}-W${String(weekNumber).padStart(2, '0')}`;
  } catch (e) {
    return null;
  }
}

/**
 * Sincroniza os eventos externos usando upsert baseado em googleCalendarEventId.
 * Estratégia: delete todos os eventos no range + insertMany dos novos.
 * Evita duplicatas e remove eventos que foram deletados no GCal.
 *
 * @param {Array}  eventos     - Array de objetos no formato do schema BloqueioExterno
 * @param {string} timeMin     - Data mínima (YYYY-MM-DD) para filtro
 * @param {string} timeMax     - Data máxima (YYYY-MM-DD) para filtro
 * @returns {Object} Resultado com numero de eventos processados
 */
async function sincronizarBloqueiosExternos(eventos, timeMin, timeMax) {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    // Se nenhum evento, apenas limpa o range para evitar stale data
    const deleteResult = await BloqueioExterno.deleteMany({
      data: { $gte: timeMin, $lte: timeMax }
    });
    return { 
      upserted: 0, 
      deleted: deleteResult.deletedCount,
      inserted: 0 
    };
  }

  // Primeiro, delete todos os eventos no range (para evitar orphans se eventos foram deletados no GCal)
  const deleteResult = await BloqueioExterno.deleteMany({
    data: { $gte: timeMin, $lte: timeMax }
  });

  // Enriquece cada evento com semanaISO calculado automaticamente
  const eventosEnriquecidos = eventos.map(e => ({
    ...e,
    semanaISO: _calcularSemanaISO(e.data) || e.semanaISO || null
  }));

  // Insere os novos eventos
  const insertResult = await BloqueioExterno.insertMany(eventosEnriquecidos, { ordered: false });
  
  return {
    upserted: 0,
    deleted: deleteResult.deletedCount,
    inserted: insertResult.length
  };
}

module.exports = {
  sincronizarBloqueiosExternos
};
