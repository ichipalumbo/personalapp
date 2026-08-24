const Aluno = require('../models/Aluno');
const { limparPayload, responderErro } = require('../utils/controllerHelpers');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const { normalizarDataParaISO } = require('../utils/time');
const financasService = require('../services/financasService');

let Reposicao = null;
try {
  Reposicao = require('../models/Reposicao');
} catch (error) {
  Reposicao = null;
}

function responderErroReposicao(res, err, contexto) {
  return responderErro(res, err, contexto, Reposicao, 'ReposicaoController');
}

function validarDataOriginal(dataOriginal) {
  const valor = normalizarDataParaISO(dataOriginal);
  if (!valor) {
    const error = new Error('dataOriginal inválida.');
    error.statusCode = 400;
    throw error;
  }
  return valor;
}

async function criarReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayload(req.body || {});

    if (Object.prototype.hasOwnProperty.call(payload, 'validoAte')) {
      return res.status(400).json({
        error: 'validoAte é derivado no servidor e não pode ser definido diretamente.',
      });
    }

    const validacaoDataOriginal = validarDataOriginal(payload.dataOriginal);
    const aluno = await Aluno.findOne({ ownerEmail, id: payload.alunoId });

    if (!aluno) {
      return res.status(400).json({ error: 'Aluno da reposição não encontrado.' });
    }

    const prazo = financasService.calcularPrazoReposicao(aluno, validacaoDataOriginal);
    const payloadParaSalvar = {
      ...payload,
      ownerEmail,
      dataOriginal: validacaoDataOriginal,
      validoAte: prazo.validoAte,
    };

    if (Reposicao && typeof Reposicao.create === 'function') {
      const documento = await Reposicao.create(payloadParaSalvar);
      const resposta = documento.toObject ? documento.toObject() : documento;
      if (prazo.pisoAplicado) {
        return res.status(201).json({ ...resposta, pisoAplicado: true });
      }
      return res.status(201).json(resposta);
    }

    if (prazo.pisoAplicado) {
      return res.status(201).json({ ...payloadParaSalvar, pisoAplicado: true });
    }

    return res.status(201).json(payloadParaSalvar);
  } catch (err) {
    responderErroReposicao(res, err, 'criar reposição');
  }
}

async function atualizarReposicao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayload(req.body || {});

    if (Object.prototype.hasOwnProperty.call(payload, 'validoAte')) {
      return res.status(400).json({
        error: 'validoAte é derivado no servidor e não pode ser definido diretamente.',
      });
    }

    if (Reposicao && typeof Reposicao.findOne === 'function') {
      const { id } = req.params;
      const existente = await Reposicao.findOne({ ownerEmail, id });

      if (!existente) {
        return res.status(404).json({ error: 'Reposição não encontrada.' });
      }

      const payloadAtualizado = {
        ...existente.toObject ? existente.toObject() : existente,
        ...payload,
      };

      const salvo = await Reposicao.findOneAndUpdate(
        { ownerEmail, id },
        { $set: payloadAtualizado },
        { new: true, runValidators: true },
      );

      return res.json(salvo && salvo.toObject ? salvo.toObject() : salvo);
    }

    return res.json({ ok: true, ownerEmail, payload });
  } catch (err) {
    responderErroReposicao(res, err, 'atualizar reposição');
  }
}

module.exports = {
  criarReposicao,
  atualizarReposicao,
};
