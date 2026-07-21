const Config = require('../models/Config');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroConfig(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  if (err && err.code === 11000) {
    res.status(409).json({ error: 'Já existe uma configuração com essa chave para este usuário.' });
    return;
  }

  console.error(`[ConfigController] Erro ao ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[ConfigController] Stack:', err.stack);
  }

  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    message: err.message,
    connectionState: Config.db.readyState
  });
}

async function listarConfiguracoes(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const configuracoes = await Config.find({ ownerEmail });
    res.json(configuracoes);
  } catch (err) {
    responderErroConfig(res, err, 'listar configurações');
  }
}

async function obterConfiguracao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const config = await Config.findOne({ ownerEmail, chave: 'grade_horarios' });

    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada.' });
    }

    res.json(config);
  } catch (err) {
    responderErroConfig(res, err, 'obter configuração padrão');
  }
}

async function obterConfiguracaoGradeHorarios(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const config = await Config.findOne({ ownerEmail, chave: 'grade_horarios' });

    if (!config) {
      return res.status(404).json({ error: 'Configuração grade_horarios não encontrada.' });
    }

    res.json(config);
  } catch (err) {
    responderErroConfig(res, err, 'obter configuração grade_horarios');
  }
}

async function obterConfiguracaoPorChave(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { chave } = req.params;
    const config = await Config.findOne({ ownerEmail, chave });

    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada.' });
    }

    res.json(config);
  } catch (err) {
    responderErroConfig(res, err, 'obter configuração por chave');
  }
}

async function criarConfiguracao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = req.body || {};
    const chave = payload.chave || 'grade_horarios';
    const config = await Config.create({ ...payload, chave, ownerEmail });
    res.status(201).json(config);
  } catch (err) {
    responderErroConfig(res, err, 'criar configuração');
  }
}

async function atualizarConfiguracao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { chave } = req.params;
    const payload = { ...req.body };

    delete payload.ownerEmail;
    delete payload._id;

    if (payload.chave && payload.chave !== chave) {
      return res.status(400).json({ error: 'A chave do corpo deve ser igual à chave da rota.' });
    }

    const config = await Config.findOneAndUpdate(
      { ownerEmail, chave },
      { $set: { ...payload, ownerEmail, chave } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(config);
  } catch (err) {
    responderErroConfig(res, err, 'atualizar configuração');
  }
}

async function excluirConfiguracao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { chave } = req.params;
    const config = await Config.findOneAndDelete({ ownerEmail, chave });

    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada.' });
    }

    res.status(204).send();
  } catch (err) {
    responderErroConfig(res, err, 'excluir configuração');
  }
}

async function salvarConfiguracao(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { horaInicio, horaFim } = req.body;
    const config = await Config.findOneAndUpdate(
      { ownerEmail, chave: 'grade_horarios' },
      { ownerEmail, chave: 'grade_horarios', horaInicio, horaFim },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (err) {
    responderErroConfig(res, err, 'salvar configuração padrão');
  }
}

module.exports = {
  listarConfiguracoes,
  obterConfiguracao,
  obterConfiguracaoGradeHorarios,
  obterConfiguracaoPorChave,
  criarConfiguracao,
  atualizarConfiguracao,
  excluirConfiguracao,
  salvarConfiguracao
};
