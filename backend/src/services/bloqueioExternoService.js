const BloqueioExterno = require('../models/BloqueioExterno');

/**
 * Sincroniza os eventos externos de uma semana específica.
 * Estratégia: delete-by-week + insertMany.
 * A coleção `agendamentos` nunca é tocada.
 *
 * @param {Array}  eventos   - Array de objetos no formato do schema BloqueioExterno
 * @param {string} semanaISO - Identificador da semana, ex. '2026-W29'
 * @returns {Array} Documentos salvos
 */
async function sincronizarBloqueiosExternos(eventos, semanaISO) {
  await BloqueioExterno.deleteMany({ semanaISO });

  if (!Array.isArray(eventos) || eventos.length === 0) {
    return [];
  }

  const docs = eventos.map(e => ({ ...e, semanaISO }));
  const salvos = await BloqueioExterno.insertMany(docs, { ordered: false });
  return salvos;
}

module.exports = {
  sincronizarBloqueiosExternos
};
