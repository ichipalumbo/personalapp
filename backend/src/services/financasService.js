const Aluno = require("../models/Aluno");
const Agendamento = require("../models/Agendamento");
const CicloFinanceiro = require("../models/CicloFinanceiro");
const recurrenceHelpers = require("../../../assets/js/shared/recurrence-helpers");

const PRAZO_MINIMO_REPOSICAO_DIAS = 7;

function toISODateOnly(value) {
  if (!value) return null;
  const data = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(data.getTime())) return null;
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizarDateOnly(value) {
  const data = recurrenceHelpers.parseDataFlex(value);
  return data
    ? new Date(data.getFullYear(), data.getMonth(), data.getDate())
    : null;
}

function inicioDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function fimDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

function diaSeguinte(data) {
  const prox = new Date(data);
  prox.setDate(prox.getDate() + 1);
  return new Date(prox.getFullYear(), prox.getMonth(), prox.getDate());
}

function ajustarDiaParaMesValido(ano, mes, diaVencimento) {
  const ultimoDia = recurrenceHelpers.getDiasNoMes(mes, ano);
  const dia = Math.min(
    Math.max(parseInt(diaVencimento, 10) || 1, 1),
    ultimoDia,
  );
  return new Date(ano, mes, dia, 12, 0, 0, 0);
}

function calcularCicloVigente(aluno, hoje = new Date()) {
  if (
    aluno &&
    aluno.objetivo !== "Consultoria Online" &&
    !aluno.fechamentoMesCheio &&
    !aluno.diaVencimento
  ) {
    return null;
  }

  const dataHoje = normalizarDateOnly(hoje) || new Date();
  const criadoEm = normalizarDateOnly(aluno && aluno.criadoEm) || dataHoje;
  let cicloInicio;
  let cicloFim;

  if (aluno && aluno.fechamentoMesCheio === true) {
    cicloInicio = inicioDoMes(dataHoje);
    cicloFim = fimDoMes(dataHoje);
  } else {
    const vencimentoEsteMes = ajustarDiaParaMesValido(
      dataHoje.getFullYear(),
      dataHoje.getMonth(),
      aluno && aluno.diaVencimento,
    );

    if (dataHoje <= vencimentoEsteMes) {
      cicloFim = vencimentoEsteMes;
      const mesAnterior =
        dataHoje.getMonth() === 0 ? 11 : dataHoje.getMonth() - 1;
      const anoAnterior =
        dataHoje.getMonth() === 0
          ? dataHoje.getFullYear() - 1
          : dataHoje.getFullYear();
      cicloInicio = diaSeguinte(
        ajustarDiaParaMesValido(
          anoAnterior,
          mesAnterior,
          aluno && aluno.diaVencimento,
        ),
      );
    } else {
      const mesSeguinte =
        dataHoje.getMonth() === 11 ? 0 : dataHoje.getMonth() + 1;
      const anoSeguinte =
        dataHoje.getMonth() === 11
          ? dataHoje.getFullYear() + 1
          : dataHoje.getFullYear();
      cicloFim = ajustarDiaParaMesValido(
        anoSeguinte,
        mesSeguinte,
        aluno && aluno.diaVencimento,
      );
      cicloInicio = diaSeguinte(vencimentoEsteMes);
    }
  }

  if (criadoEm && cicloInicio < criadoEm) {
    cicloInicio = criadoEm;
  }

  return {
    cicloInicio,
    cicloFim,
    cicloInicioISO: toISODateOnly(cicloInicio),
    cicloFimISO: toISODateOnly(cicloFim),
  };
}

function normalizarAulasContadas(agendamento, cicloInicio, cicloFim) {
  const dataInicio = new Date(
    cicloInicio.getFullYear(),
    cicloInicio.getMonth(),
    cicloInicio.getDate(),
  );
  const dataFim = new Date(
    cicloFim.getFullYear(),
    cicloFim.getMonth(),
    cicloFim.getDate(),
  );
  let total = 0;

  for (
    let cursor = new Date(dataInicio);
    cursor <= dataFim;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dataAtual = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
    );
    if (
      recurrenceHelpers.checarCompromissoNaData(
        agendamento,
        dataAtual,
        null,
        recurrenceHelpers.DEFAULT_DIAS_SEMANA,
      )
    ) {
      total += 1;
    }
  }

  return total;
}

function calcularAulasContadasDoCiclo(
  aluno,
  agendamentos,
  cicloInicio,
  cicloFim,
) {
  const lista = Array.isArray(agendamentos) ? agendamentos : [];
  const alunoId = aluno && aluno.id;

  return lista
    .filter(
      (agendamento) =>
        agendamento &&
        agendamento.alunoId === alunoId &&
        (agendamento.tipo === "aula" || agendamento.tipo === "reposicao"),
    )
    .reduce(
      (total, agendamento) =>
        total + normalizarAulasContadas(agendamento, cicloInicio, cicloFim),
      0,
    );
}

// Piso zero (5.5): o total cobrado nunca pode ser negativo, mesmo com ajuste manual negativo.
function calcularTotalAulasCobradas(aulasContadas, aulasManuaisExtras) {
  return Math.max(
    0,
    (Number(aulasContadas) || 0) + (Number(aulasManuaisExtras) || 0),
  );
}

function calcularValorTotalCiclo(aluno, aulasContadas, aulasManuaisExtras) {
  const metodo =
    aluno && aluno.metodoCobranca ? aluno.metodoCobranca : "por_aula";
  if (metodo === "valor_fixo") {
    return (
      Number(aluno && (aluno.valorFixoCiclo ?? aluno.valorFixoSnapshot)) || 0
    );
  }

  const preco = Number(aluno && aluno.preco) || 0;
  return calcularTotalAulasCobradas(aulasContadas, aulasManuaisExtras) * preco;
}

// 5.9: no recálculo de um ciclo já existente, o preço é SEMPRE o snapshot do próprio ciclo
// (nunca o valor atual do aluno). Fallback: snapshot ausente (legado) herda o valor atual do
// aluno e passa a ser gravado no ciclo, sem nunca sobrescrever um snapshot já preenchido.
function resolverSnapshotParaRecalculo(ciclo, aluno) {
  const metodo = ciclo.metodoCobranca || "por_aula";
  let snapshotAlterado = false;

  if (metodo === "valor_fixo") {
    if (!ciclo.valorFixoSnapshot) {
      const fallback = Number(aluno && aluno.valorFixoCiclo) || 0;
      if (fallback) {
        ciclo.valorFixoSnapshot = fallback;
        snapshotAlterado = true;
      }
    }
    return {
      snapshot: {
        metodoCobranca: metodo,
        valorFixoCiclo: ciclo.valorFixoSnapshot,
      },
      snapshotAlterado,
    };
  }

  if (!ciclo.precoAulaSnapshot) {
    const fallback = Number(aluno && aluno.preco) || 0;
    if (fallback) {
      ciclo.precoAulaSnapshot = fallback;
      snapshotAlterado = true;
    }
  }
  return {
    snapshot: { metodoCobranca: metodo, preco: ciclo.precoAulaSnapshot },
    snapshotAlterado,
  };
}

// 5.8: ciclo sem dataPagamento é recontado a partir da agenda a cada leitura; ciclo pago fica congelado.
async function sincronizarCicloComAgenda(documento, aluno, agendamentos) {
  if (!documento || documento.dataPagamento) return documento;

  const cicloInicio = normalizarDateOnly(documento.cicloInicio);
  const cicloFim = normalizarDateOnly(documento.cicloFim);
  if (!cicloInicio || !cicloFim) return documento;

  const alunoParaContagem = aluno || { id: documento.alunoId };
  const aulasContadas = calcularAulasContadasDoCiclo(
    alunoParaContagem,
    agendamentos,
    cicloInicio,
    cicloFim,
  );
  const { snapshot, snapshotAlterado } = resolverSnapshotParaRecalculo(
    documento,
    aluno,
  );
  const valorTotalCiclo = calcularValorTotalCiclo(
    snapshot,
    aulasContadas,
    documento.aulasManuaisExtras,
  );

  const divergiu =
    documento.aulasContadas !== aulasContadas ||
    documento.valorTotalCiclo !== valorTotalCiclo ||
    snapshotAlterado;
  if (!divergiu) {
    return documento;
  }

  documento.aulasContadas = aulasContadas;
  documento.valorTotalCiclo = valorTotalCiclo;
  documento.atualizadoEm = new Date();
  if (typeof documento.save === "function") {
    await documento.save();
  }
  return documento;
}

function calcularPrazoReposicao(aluno, dataOriginal) {
  const dataOriginalNormalizada = normalizarDateOnly(dataOriginal);

  if (!dataOriginalNormalizada) {
    return { validoAte: null, pisoAplicado: false };
  }

  const ciclo = calcularCicloVigente(aluno, dataOriginalNormalizada);
  if (!ciclo || !ciclo.cicloFimISO) {
    return { validoAte: null, pisoAplicado: false };
  }

  const cicloFim = normalizarDateOnly(ciclo.cicloFimISO);
  if (!cicloFim) {
    return { validoAte: null, pisoAplicado: false };
  }

  const diferencaDias = Math.round(
    (cicloFim.getTime() - dataOriginalNormalizada.getTime()) / 86400000,
  );

  if (diferencaDias < PRAZO_MINIMO_REPOSICAO_DIAS) {
    const cicloSeguinte = calcularCicloVigente(
      aluno,
      diaSeguinte(cicloFim),
    );

    if (!cicloSeguinte || !cicloSeguinte.cicloFimISO) {
      return { validoAte: null, pisoAplicado: false };
    }

    return {
      validoAte: cicloSeguinte.cicloFimISO,
      pisoAplicado: true,
    };
  }

  return {
    validoAte: ciclo.cicloFimISO,
    pisoAplicado: false,
  };
}

function calcularStatusCiclo(ciclo, hoje = new Date()) {
  if (!ciclo) return "em_aberto";
  if (ciclo.dataPagamento) return "pago";

  const hojeIso = toISODateOnly(hoje);
  return hojeIso > ciclo.cicloFim ? "atrasado" : "em_aberto";
}

function aplicarStatusCiclo(ciclo, hoje = new Date()) {
  if (!ciclo) return ciclo;
  ciclo.status = calcularStatusCiclo(ciclo, hoje);
  return ciclo;
}

async function obterOuCriarCicloVigente(
  ownerEmail,
  aluno,
  agendamentos,
  hoje = new Date(),
) {
  const ciclo = calcularCicloVigente(aluno, hoje);
  if (!ciclo) return null;
  const query = {
    ownerEmail,
    alunoId: aluno.id,
    cicloInicio: ciclo.cicloInicioISO,
  };

  let documento = await CicloFinanceiro.findOne(query);
  if (!documento) {
    const aulasContadas = calcularAulasContadasDoCiclo(
      aluno,
      agendamentos,
      ciclo.cicloInicio,
      ciclo.cicloFim,
    );
    const aulasManuaisExtras = 0;
    const valorTotalCiclo = calcularValorTotalCiclo(
      aluno,
      aulasContadas,
      aulasManuaisExtras,
    );

    try {
      documento = await CicloFinanceiro.create({
        ownerEmail,
        alunoId: aluno.id,
        cicloInicio: ciclo.cicloInicioISO,
        cicloFim: ciclo.cicloFimISO,
        aulasContadas,
        aulasManuaisExtras,
        observacaoAjuste: "",
        metodoCobranca: aluno.metodoCobranca || "por_aula",
        precoAulaSnapshot:
          aluno.metodoCobranca === "valor_fixo"
            ? null
            : Number(aluno.preco) || null,
        valorFixoSnapshot:
          aluno.metodoCobranca === "valor_fixo"
            ? Number(aluno.valorFixoCiclo) || null
            : null,
        valorTotalCiclo,
        status: "em_aberto",
        dataPagamento: null,
        formaPagamento: null,
      });
    } catch (error) {
      if (error && error.code === 11000) {
        documento = await CicloFinanceiro.findOne(query);
      } else {
        throw error;
      }
    }
  }

  if (!documento) {
    return null;
  }

  await sincronizarCicloComAgenda(documento, aluno, agendamentos);

  const statusCalculado = calcularStatusCiclo(documento, hoje);
  if (documento.status !== statusCalculado) {
    documento.status = statusCalculado;
    documento.atualizadoEm = new Date();
    await documento.save();
  }

  return documento.toObject ? documento.toObject() : documento;
}

async function listarFinancasDoOwner(ownerEmail, hoje = new Date()) {
  const alunos = await Aluno.find({ ownerEmail, status: "ativo" });
  const agendamentos = await Agendamento.find({ ownerEmail });
  const elegiveis = alunos.filter(
    (aluno) => aluno.objetivo !== "Consultoria Online",
  );
  const cards = [];

  for (const aluno of elegiveis) {
    const configuracaoPendente =
      !aluno.fechamentoMesCheio && !aluno.diaVencimento;
    if (configuracaoPendente) {
      cards.push({
        alunoId: aluno.id,
        aluno: aluno.toObject ? aluno.toObject() : aluno,
        configuracaoPendente: true,
        cicloAtual: null,
        historicoDisponivel: false,
      });
      continue;
    }

    const cicloAtual = await obterOuCriarCicloVigente(
      ownerEmail,
      aluno,
      agendamentos,
      hoje,
    );

    // 6.2.1: histórico não entra no payload da listagem; apenas um indicador booleano, sem find().
    const filtroHistorico = { ownerEmail, alunoId: aluno.id };
    if (cicloAtual) {
      filtroHistorico.cicloInicio = { $ne: cicloAtual.cicloInicio };
    }
    const existeHistorico = await CicloFinanceiro.countDocuments(
      filtroHistorico,
      { limit: 1 },
    );

    cards.push({
      alunoId: aluno.id,
      aluno: aluno.toObject ? aluno.toObject() : aluno,
      configuracaoPendente: false,
      cicloAtual,
      historicoDisponivel: existeHistorico > 0,
    });
  }

  const ordemStatus = {
    atrasado: 0,
    em_aberto: 1,
    pago: 2,
    pendente_configuracao: 3,
  };
  return cards.sort((a, b) => {
    const statusA = a.configuracaoPendente
      ? "pendente_configuracao"
      : (a.cicloAtual && a.cicloAtual.status) || "em_aberto";
    const statusB = b.configuracaoPendente
      ? "pendente_configuracao"
      : (b.cicloAtual && b.cicloAtual.status) || "em_aberto";
    return (ordemStatus[statusA] || 99) - (ordemStatus[statusB] || 99);
  });
}

async function obterHistoricoFinancasPorAluno(
  ownerEmail,
  alunoId,
  hoje = new Date(),
) {
  const ciclos = await CicloFinanceiro.find({ ownerEmail, alunoId }).sort({
    cicloInicio: -1,
  });
  if (ciclos.length === 0) return [];

  const aluno = await Aluno.findOne({ ownerEmail, id: alunoId });
  const agendamentos = await Agendamento.find({ ownerEmail });
  const historico = [];

  for (const doc of ciclos) {
    await sincronizarCicloComAgenda(doc, aluno, agendamentos);
    const statusCalculado = calcularStatusCiclo(doc, hoje);
    if (doc.status !== statusCalculado) {
      doc.status = statusCalculado;
      doc.atualizadoEm = new Date();
      await doc.save();
    }
    historico.push(
      aplicarStatusCiclo(doc.toObject ? doc.toObject() : doc, hoje),
    );
  }

  return historico;
}

async function marcarCicloComoPago(
  ownerEmail,
  cicloId,
  payload = {},
  hoje = new Date(),
) {
  const ciclo = await CicloFinanceiro.findOne({ _id: cicloId, ownerEmail });
  if (!ciclo) {
    const error = new Error("Ciclo financeiro não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  ciclo.dataPagamento = payload.dataPagamento || toISODateOnly(hoje);
  ciclo.formaPagamento = Object.prototype.hasOwnProperty.call(
    payload,
    "formaPagamento",
  )
    ? payload.formaPagamento || null
    : ciclo.formaPagamento;
  ciclo.status = "pago";
  ciclo.atualizadoEm = new Date();
  await ciclo.save();
  return ciclo.toObject ? ciclo.toObject() : ciclo;
}

async function atualizarAjusteCiclo(
  ownerEmail,
  cicloId,
  payload = {},
  hoje = new Date(),
) {
  const ciclo = await CicloFinanceiro.findOne({ _id: cicloId, ownerEmail });
  if (!ciclo) {
    const error = new Error("Ciclo financeiro não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (ciclo.dataPagamento) {
    const error = new Error(
      "Este ciclo já foi pago e não pode mais ser ajustado.",
    );
    error.statusCode = 409;
    throw error;
  }

  const extras = Number.parseInt(payload.aulasManuaisExtras, 10);
  ciclo.aulasManuaisExtras = Number.isNaN(extras) ? 0 : extras;
  ciclo.observacaoAjuste =
    typeof payload.observacaoAjuste === "string"
      ? payload.observacaoAjuste
      : "";

  const aluno = await Aluno.findOne({ ownerEmail, id: ciclo.alunoId });
  const { snapshot } = resolverSnapshotParaRecalculo(ciclo, aluno);
  ciclo.valorTotalCiclo = calcularValorTotalCiclo(
    snapshot,
    ciclo.aulasContadas,
    ciclo.aulasManuaisExtras,
  );
  ciclo.atualizadoEm = new Date();
  aplicarStatusCiclo(ciclo, hoje);
  await ciclo.save();
  return ciclo.toObject ? ciclo.toObject() : ciclo;
}

module.exports = {
  PRAZO_MINIMO_REPOSICAO_DIAS,
  calcularPrazoReposicao,
  calcularCicloVigente,
  calcularAulasContadasDoCiclo,
  calcularValorTotalCiclo,
  calcularTotalAulasCobradas,
  listarFinancasDoOwner,
  obterHistoricoFinancasPorAluno,
  marcarCicloComoPago,
  atualizarAjusteCiclo,
  obterOuCriarCicloVigente,
  recalcularStatusCiclo: aplicarStatusCiclo,
};
