const Reposicao = require('../models/Reposicao');
const { limparPayload, responderErro } = require('../utils/controllerHelpers');
const { normalizarDataParaISO } = require('../utils/time');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroReposicao(res, err, contexto) {
  return responderErro(res, err, contexto, Reposicao, 'ReposicaoController');
}

function limparPayloadReposicao(payload) {
  return limparPayload(payload);
}

function validarDataISO(data, nomeCampo) {
  if (data === undefined || data === null || data === '') {
    return { valido: false, mensagem: `${nomeCampo} é obrigatório.` };
  }

  const dataNormalizada = normalizarDataParaISO(data);
  if (!dataNormalizada) {
    return {
      valido: false,
      mensagem: `${nomeCampo} deve ser uma data válida em ISO ou no formato dd/mm/yyyy.`
    };
  }

  return { valido: true, valor: dataNormalizada };
}

async function listarReposicoes(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const filtro = { ownerEmail };

    if (req.query.alunoId) {
      filtro.alunoId = String(req.query.alunoId);
    }

    if (req.query.status) {
      filtro.status = req.query.status;
    }

    if (req.query.dataMin || req.query.dataMax) {
      filtro.dataOriginal = {};

      if (req.query.dataMin) {
        const dataMin = normalizarDataParaISO(String(req.query.dataMin));
        if (dataMin) {
          filtro.dataOriginal.$gte = dataMin;
        }
      }

      if (req.query.dataMax) {
        const dataMax = normalizarDataParaISO(String(req.query.dataMax));
        if (dataMax) {
          filtro.dataOriginal.$lte = dataMax;
        }
      }
    }

    const reposicoes = await Reposicao.find(filtro).sort({ dataOriginal: 1, horarioOriginal: 1 });
    res.json(reposicoes);
  } catch (err) {
    responderErroReposicao(res, err, 'listar reposições');
  }
}

async function obterReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const reposicao = await Reposicao.findOne({ ownerEmail, id });

    if (!reposicao) {
      return res.status(404).json({ error: `Reposição com id '${id}' não encontrada.` });
    }

    res.json(reposicao);
  } catch (err) {
    responderErroReposicao(res, err, 'obter reposição');
  }
}

async function criarReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayloadReposicao(req.body);

    if (!payload.alunoId) {
      return res.status(400).json({ error: 'alunoId é obrigatório.' });
    }

    if (!payload.id) {
      return res.status(400).json({ error: 'id é obrigatório.' });
    }

    const validacaoDataOriginal = validarDataISO(payload.dataOriginal, 'dataOriginal');
    if (!validacaoDataOriginal.valido) {
      return res.status(400).json({ error: validacaoDataOriginal.mensagem });
    }

    if (payload.cobravel === undefined || payload.cobravel === null || typeof payload.cobravel !== 'boolean') {
      return res.status(400).json({ error: 'cobravel é obrigatório e deve ser booleano.' });
    }

    const payloadParaSalvar = {
      ...payload,
      ownerEmail,
      id: String(payload.id),
      alunoId: String(payload.alunoId),
      dataOriginal: validacaoDataOriginal.valor,
      dataEnvio: payload.dataEnvio ? normalizarDataParaISO(String(payload.dataEnvio)) || payload.dataEnvio : new Date().toISOString().slice(0, 10),
      ...(payload.validoAte ? { validoAte: normalizarDataParaISO(String(payload.validoAte)) || payload.validoAte } : {}),
      ...(payload.cicloCobrancaResolvido && typeof payload.cicloCobrancaResolvido === 'object'
        ? {
            cicloCobrancaResolvido: {
              ...(payload.cicloCobrancaResolvido.inicio ? { inicio: normalizarDataParaISO(String(payload.cicloCobrancaResolvido.inicio)) || payload.cicloCobrancaResolvido.inicio } : { inicio: null }),
              ...(payload.cicloCobrancaResolvido.fim ? { fim: normalizarDataParaISO(String(payload.cicloCobrancaResolvido.fim)) || payload.cicloCobrancaResolvido.fim } : { fim: null })
            }
          }
        : {}),
      ...(payload.historico ? { historico: payload.historico } : {})
    };

    const reposicao = await Reposicao.findOneAndUpdate(
      { ownerEmail, id: payloadParaSalvar.id },
      { $set: payloadParaSalvar },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(reposicao);
  } catch (err) {
    responderErroReposicao(res, err, 'criar reposição');
  }
}

async function atualizarReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payload = limparPayloadReposicao(req.body);

    if (payload.id && payload.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    if (payload.dataOriginal !== undefined) {
      const validacaoDataOriginal = validarDataISO(payload.dataOriginal, 'dataOriginal');
      if (!validacaoDataOriginal.valido) {
        return res.status(400).json({ error: validacaoDataOriginal.mensagem });
      }
      payload.dataOriginal = validacaoDataOriginal.valor;
    }

    if (payload.cobravel !== undefined && typeof payload.cobravel !== 'boolean') {
      return res.status(400).json({ error: 'cobravel deve ser booleano.' });
    }

    if (payload.dataEnvio !== undefined) {
      const validacaoDataEnvio = validarDataISO(payload.dataEnvio, 'dataEnvio');
      if (!validacaoDataEnvio.valido) {
        return res.status(400).json({ error: validacaoDataEnvio.mensagem });
      }
      payload.dataEnvio = validacaoDataEnvio.valor;
    }

    if (payload.validoAte !== undefined && payload.validoAte !== null) {
      const validacaoValidoAte = validarDataISO(payload.validoAte, 'validoAte');
      if (!validacaoValidoAte.valido) {
        return res.status(400).json({ error: validacaoValidoAte.mensagem });
      }
      payload.validoAte = validacaoValidoAte.valor;
    }

    if (payload.cicloCobrancaResolvido !== undefined && payload.cicloCobrancaResolvido !== null) {
      const inicioNormalizado = payload.cicloCobrancaResolvido.inicio !== undefined && payload.cicloCobrancaResolvido.inicio !== null
        ? normalizarDataParaISO(String(payload.cicloCobrancaResolvido.inicio)) || payload.cicloCobrancaResolvido.inicio
        : null;
      const fimNormalizado = payload.cicloCobrancaResolvido.fim !== undefined && payload.cicloCobrancaResolvido.fim !== null
        ? normalizarDataParaISO(String(payload.cicloCobrancaResolvido.fim)) || payload.cicloCobrancaResolvido.fim
        : null;

      payload.cicloCobrancaResolvido = { inicio: inicioNormalizado, fim: fimNormalizado };
    }

    const reposicao = await Reposicao.findOneAndUpdate(
      { ownerEmail, id },
      { $set: { ...payload, ownerEmail, id } },
      { new: true, runValidators: true }
    );

    if (!reposicao) {
      return res.status(404).json({ error: `Reposição com id '${id}' não encontrada.` });
    }

    res.json(reposicao);
  } catch (err) {
    responderErroReposicao(res, err, 'atualizar reposição');
  }
}

module.exports = {
  listarReposicoes,
  obterReposicao,
  criarReposicao,
  atualizarReposicao
};
