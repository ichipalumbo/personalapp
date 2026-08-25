const Reposicao = require('../models/Reposicao');

function normalizarDataSemHora(value) {
  if (!value) return null;

  const partes = String(value).slice(0, 10).split('-');
  if (partes.length !== 3) return null;

  const [anoTexto, mesTexto, diaTexto] = partes;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return null;
  }

  return new Date(ano, mes - 1, dia);
}

function aplicarExpiracaoLazy(reposicoes, hoje = new Date()) {
  if (!Array.isArray(reposicoes)) {
    return { reposicoes: [], alterou: false };
  }

  const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let alterou = false;

  const atualizadas = reposicoes.map((reposicao) => {
    if (!reposicao || reposicao.status !== 'pendente' || !reposicao.validoAte) {
      return reposicao;
    }

    const validoAte = normalizarDataSemHora(reposicao.validoAte);
    if (!validoAte) {
      return reposicao;
    }

    const expirada = hojeData > validoAte;
    if (!expirada) {
      return reposicao;
    }

    alterou = true;
    const copia = reposicao.toObject ? reposicao.toObject() : { ...reposicao };
    return { ...copia, status: 'expirada' };
  });

  return { reposicoes: atualizadas, alterou };
}

async function sincronizarExpiracaoLazy(ownerEmail, reposicoes, hoje = new Date()) {
  if (!Array.isArray(reposicoes) || !ownerEmail) {
    return Array.isArray(reposicoes) ? reposicoes : [];
  }

  const { reposicoes: atualizadas, alterou } = aplicarExpiracaoLazy(reposicoes, hoje);
  if (!alterou) {
    return atualizadas;
  }

  for (const reposicao of atualizadas) {
    const original = reposicoes.find((item) => item && item.id === reposicao.id);
    if (!original || original.status === reposicao.status) {
      continue;
    }

    await Reposicao.findOneAndUpdate(
      { ownerEmail, id: reposicao.id },
      { $set: { status: reposicao.status } },
      { runValidators: true }
    );
  }

  return atualizadas;
}

module.exports = {
  aplicarExpiracaoLazy,
  sincronizarExpiracaoLazy,
};
