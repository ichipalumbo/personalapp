const BloqueioExterno = require('../models/BloqueioExterno');

/**
 * Sincroniza os eventos externos usando upsert baseado em googleCalendarEventId.
 * Estratégia: Para cada evento, faz replaceOne com upsert=true.
 * Evita duplicatas e permite atualizações de eventos que mudaram de horário/título.
 *
 * @param {Array}  eventos     - Array de objetos no formato do schema BloqueioExterno
 * @param {string} timeMin     - Data mínima (YYYY-MM-DD) para filtro
 * @param {string} timeMax     - Data máxima (YYYY-MM-DD) para filtro
 * @returns {Object} Resultado com numero de eventos processados
 */
async function sincronizarBloqueiosExternos(eventos, timeMin, timeMax) {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    // Se nenhum evento, apenas limpa o range para evitar stale data
    await BloqueioExterno.deleteMany({
      data: { $gte: timeMin, $lte: timeMax }
    });
    return { upserted: 0, deleted: 0 };
  }

  // Primeiro, delete todos os eventos no range (para evitar orphans se eventos foram deletados no GCal)
  const deleteResult = await BloqueioExterno.deleteMany({
    data: { $gte: timeMin, $lte: timeMax }
  });

  // Depois, faz upsert de cada evento
  const bulkOps = eventos.map(e => ({
    replaceOne: {
      filter: { googleCalendarEventId: e.googleCalendarEventId },
      replacement: { ...e },
      upsert: true
    }
  }));

  const result = await BloqueioExterno.bulkWrite(bulkOps);
  return {
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
    deleted: deleteResult.deletedCount,
    inserted: result.insertedCount
  };
}

module.exports = {
  sincronizarBloqueiosExternos
};
