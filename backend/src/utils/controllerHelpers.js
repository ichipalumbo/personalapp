function limparPayload(payload, campos = ['_id', '__v', 'ownerEmail']) {
  const limpo = { ...(payload || {}) };

  campos.forEach((campo) => {
    delete limpo[campo];
  });

  return limpo;
}

function responderErro(res, err, contexto, Model, prefixoLog) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;
  const label = prefixoLog || 'Controller';

  console.error(`[${label}] Erro ao ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error(`[${label}] Stack:`, err.stack);
  }

  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    message: err.message,
    connectionState: Model && Model.db ? Model.db.readyState : undefined
  });
}

module.exports = {
  limparPayload,
  responderErro
};