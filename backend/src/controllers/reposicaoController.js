const Reposicao = require('../models/Reposicao');
const reposicaoService = require('../services/reposicaoService');
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

function validarISO8601Completo(valor, nomeCampo) {
  if (valor === undefined || valor === null || valor === '') {
    return { valido: false, mensagem: `${nomeCampo} é obrigatório.` };
  }

  if (typeof valor !== 'string') {
    return { valido: false, mensagem: `${nomeCampo} deve ser um timestamp ISO 8601 válido.` };
  }

  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/;
  if (!regex.test(valor.trim())) {
    return { valido: false, mensagem: `${nomeCampo} deve ser um timestamp ISO 8601 válido.` };
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return { valido: false, mensagem: `${nomeCampo} deve ser um timestamp ISO 8601 válido.` };
  }

  return { valido: true, valor: valor.trim() };
}

function normalizarHistorico(historico, nomeCampo) {
  if (historico === undefined) {
    return historico;
  }

  if (!Array.isArray(historico)) {
    return { erro: `${nomeCampo} deve ser um array.` };
  }

  const historicoNormalizado = historico.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`${nomeCampo}[${index}] deve ser um objeto.`);
    }

    if (item.data === undefined || item.data === null || item.data === '') {
      throw new Error(`${nomeCampo}[${index}].data é obrigatório.`);
    }

    const dataValidada = validarISO8601Completo(item.data, `${nomeCampo}[${index}].data`);
    if (!dataValidada.valido) {
      throw new Error(dataValidada.mensagem);
    }

    return {
      ...item,
      data: dataValidada.valor
    };
  });

  return { historico: historicoNormalizado };
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
    const reposicoesAtualizadas = await reposicaoService.sincronizarExpiracaoLazy(ownerEmail, reposicoes, new Date());
    res.json(reposicoesAtualizadas);
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

    const idNormalizado = String(payload.id);
    const existente = await Reposicao.findOne({ ownerEmail, id: idNormalizado }).lean();
    if (existente) {
      return res.status(409).json({ error: `Já existe uma reposição com id '${idNormalizado}' para este usuário.` });
    }

    const validacaoDataOriginal = validarDataISO(payload.dataOriginal, 'dataOriginal');
    if (!validacaoDataOriginal.valido) {
      return res.status(400).json({ error: validacaoDataOriginal.mensagem });
    }

    if (payload.cobravel === undefined || payload.cobravel === null || typeof payload.cobravel !== 'boolean') {
      return res.status(400).json({ error: 'cobravel é obrigatório e deve ser booleano.' });
    }

    if (payload.dataEnvio !== undefined) {
      const validacaoDataEnvio = validarISO8601Completo(payload.dataEnvio, 'dataEnvio');
      if (!validacaoDataEnvio.valido) {
        return res.status(400).json({ error: validacaoDataEnvio.mensagem });
      }
    }

    if (payload.historico !== undefined) {
      try {
        const historicoNormalizado = normalizarHistorico(payload.historico, 'historico');
        if (historicoNormalizado && historicoNormalizado.erro) {
          return res.status(400).json({ error: historicoNormalizado.erro });
        }
        payload.historico = historicoNormalizado.historico;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    if (payload.validoAte !== undefined && payload.validoAte !== null) {
      const validacaoValidoAte = validarDataISO(payload.validoAte, 'validoAte');
      if (!validacaoValidoAte.valido) {
        return res.status(400).json({ error: validacaoValidoAte.mensagem });
      }
    }

    if (payload.cicloCobrancaResolvido !== undefined && payload.cicloCobrancaResolvido !== null && typeof payload.cicloCobrancaResolvido === 'object') {
      const ciclo = payload.cicloCobrancaResolvido;

      if (ciclo.inicio !== undefined && ciclo.inicio !== null) {
        const validacaoInicio = validarDataISO(ciclo.inicio, 'cicloCobrancaResolvido.inicio');
        if (!validacaoInicio.valido) {
          return res.status(400).json({ error: validacaoInicio.mensagem });
        }
      }

      if (ciclo.fim !== undefined && ciclo.fim !== null) {
        const validacaoFim = validarDataISO(ciclo.fim, 'cicloCobrancaResolvido.fim');
        if (!validacaoFim.valido) {
          return res.status(400).json({ error: validacaoFim.mensagem });
        }
      }
    }

    const payloadParaSalvar = {
      ...payload,
      ownerEmail,
      id: idNormalizado,
      alunoId: String(payload.alunoId),
      dataOriginal: validacaoDataOriginal.valor,
      dataEnvio: payload.dataEnvio ? (validarISO8601Completo(payload.dataEnvio, 'dataEnvio').valor) : new Date().toISOString(),
      ...(payload.validoAte ? { validoAte: validarDataISO(payload.validoAte, 'validoAte').valor } : {}),
      ...(payload.cicloCobrancaResolvido && typeof payload.cicloCobrancaResolvido === 'object'
        ? {
            cicloCobrancaResolvido: {
              ...(payload.cicloCobrancaResolvido.inicio !== undefined && payload.cicloCobrancaResolvido.inicio !== null ? { inicio: validarDataISO(String(payload.cicloCobrancaResolvido.inicio), 'cicloCobrancaResolvido.inicio').valor } : { inicio: null }),
              ...(payload.cicloCobrancaResolvido.fim !== undefined && payload.cicloCobrancaResolvido.fim !== null ? { fim: validarDataISO(String(payload.cicloCobrancaResolvido.fim), 'cicloCobrancaResolvido.fim').valor } : { fim: null })
            }
          }
        : {}),
      ...(payload.historico ? { historico: payload.historico } : {})
    };

    let reposicao;
    try {
      reposicao = await Reposicao.create(payloadParaSalvar);
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: `Já existe uma reposição com id '${idNormalizado}' para este usuário.` });
      }
      throw err;
    }

    res.status(201).json(reposicao);
  } catch (err) {
    responderErroReposicao(res, err, 'criar reposição');
  }
}

async function atualizarReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payloadBruto = req.body || {};
    const payload = limparPayloadReposicao(payloadBruto);

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'id') && payloadBruto.id && payloadBruto.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'cobravel')) {
      return res.status(400).json({ error: 'cobravel é imutável após a criação da reposição.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'dataOriginal')) {
      return res.status(400).json({ error: 'dataOriginal é imutável após a criação da reposição.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'dataEnvio')) {
      return res.status(400).json({ error: 'dataEnvio é imutável após a criação da reposição.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'agendamentoOriginalId')) {
      return res.status(400).json({ error: 'agendamentoOriginalId é imutável após a criação da reposição.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'ownerEmail')) {
      return res.status(400).json({ error: 'ownerEmail é imutável após a criação da reposição.' });
    }

    if (Object.prototype.hasOwnProperty.call(payloadBruto, 'historico')) {
      return res.status(400).json({ error: 'historico é append-only; use POST /api/reposicoes/:id/historico.' });
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
        ? validarDataISO(String(payload.cicloCobrancaResolvido.inicio), 'cicloCobrancaResolvido.inicio').valor
        : null;
      const fimNormalizado = payload.cicloCobrancaResolvido.fim !== undefined && payload.cicloCobrancaResolvido.fim !== null
        ? validarDataISO(String(payload.cicloCobrancaResolvido.fim), 'cicloCobrancaResolvido.fim').valor
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

async function adicionarHistoricoReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payload = limparPayloadReposicao(req.body || {});

    if (!payload.evento || typeof payload.evento !== 'string' || !payload.evento.trim()) {
      return res.status(400).json({ error: 'evento é obrigatório.' });
    }

    if (!payload.data) {
      return res.status(400).json({ error: 'data é obrigatória.' });
    }

    const validacaoData = validarISO8601Completo(payload.data, 'data');
    if (!validacaoData.valido) {
      return res.status(400).json({ error: validacaoData.mensagem });
    }

    const historico = {
      evento: payload.evento.trim(),
      data: validacaoData.valor,
      agendamentoId: payload.agendamentoId || null,
    };

    const reposicao = await Reposicao.findOneAndUpdate(
      { ownerEmail, id },
      { $push: { historico } },
      { new: true, runValidators: true }
    );

    if (!reposicao) {
      return res.status(404).json({ error: `Reposição com id '${id}' não encontrada.` });
    }

    res.status(201).json(reposicao);
  } catch (err) {
    responderErroReposicao(res, err, 'adicionar histórico da reposição');
  }
}

module.exports = {
  listarReposicoes,
  obterReposicao,
  criarReposicao,
  atualizarReposicao,
  adicionarHistoricoReposicao
};
