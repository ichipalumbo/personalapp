const Aluno = require("../models/Aluno");
const Agendamento = require("../models/Agendamento");
const CicloFinanceiro = require("../models/CicloFinanceiro");
const Reposicao = require("../models/Reposicao");
const reposicaoService = require("./reposicaoService");
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

function dataEmJanela(dataISO, cicloInicio, cicloFim) {
  if (!dataISO) return false;

  const inicio = normalizarDateOnly(cicloInicio);
  const fim = normalizarDateOnly(cicloFim);
  const data = normalizarDateOnly(dataISO);
  if (!inicio || !fim || !data) {
    return false;
  }

  return data >= inicio && data <= fim;
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

function calcularPrazoReposicao(aluno, dataOriginal) {
  const dataOriginalNormalizada = normalizarDateOnly(dataOriginal);
  if (!dataOriginalNormalizada) {
    return { validoAte: null, pisoAplicado: false };
  }

  if (
    aluno &&
    aluno.objetivo !== "Consultoria Online" &&
    !aluno.fechamentoMesCheio &&
    !aluno.diaVencimento
  ) {
    return { validoAte: null, pisoAplicado: false };
  }

  const cicloAtual = calcularCicloVigente(aluno, dataOriginalNormalizada);
  if (!cicloAtual || !cicloAtual.cicloFimISO) {
    return { validoAte: null, pisoAplicado: false };
  }

  const cicloFimAtual = normalizarDateOnly(cicloAtual.cicloFimISO);
  if (!cicloFimAtual) {
    return { validoAte: null, pisoAplicado: false };
  }

  const diferencaDias = Math.floor(
    (cicloFimAtual.getTime() - dataOriginalNormalizada.getTime()) / 86400000,
  );

  if (diferencaDias < PRAZO_MINIMO_REPOSICAO_DIAS) {
    const proximaData = diaSeguinte(cicloFimAtual);
    const proximoCiclo = calcularCicloVigente(aluno, proximaData);
    return {
      validoAte: proximoCiclo && proximoCiclo.cicloFimISO ? proximoCiclo.cicloFimISO : null,
      pisoAplicado: true,
    };
  }

  return {
    validoAte: cicloAtual.cicloFimISO,
    pisoAplicado: false,
  };
}

function filtrarHistoricoExcluindoCicloAtual(aluno, hoje, ciclos) {
  const lista = Array.isArray(ciclos) ? ciclos : [];
  if (lista.length === 0) return [];

  const cicloAtual = calcularCicloVigente(aluno, hoje);
  if (!cicloAtual || !cicloAtual.cicloInicioISO) {
    return lista;
  }

  return lista.filter((ciclo) => {
    const inicioCiclo = ciclo && ciclo.cicloInicioISO
      ? ciclo.cicloInicioISO
      : toISODateOnly(ciclo && ciclo.cicloInicio);
    return !!inicioCiclo && inicioCiclo !== cicloAtual.cicloInicioISO;
  });
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
  reposicoes,
  cicloInicio,
  cicloFim,
) {
  const lista = Array.isArray(agendamentos) ? agendamentos : [];
  const listaReposicoes = Array.isArray(reposicoes) ? reposicoes : [];
  const alunoId = aluno && aluno.id;
  const cicloInicioISO = toISODateOnly(cicloInicio);

  const agendamentosNormais = lista.filter(
    (agendamento) =>
      agendamento &&
      agendamento.alunoId === alunoId &&
      !agendamento.reposicaoId &&
      (agendamento.tipo === "aula" || agendamento.tipo === "reposicao"),
  );

  const reposicoesCobraveis = listaReposicoes.filter(
    (reposicao) =>
      reposicao &&
      reposicao.alunoId === alunoId &&
      reposicao.cobravel === true &&
      dataEmJanela(reposicao.dataOriginal, cicloInicio, cicloFim),
  );

  const reposicoesNaoCobraveis = listaReposicoes.filter(
    (reposicao) =>
      reposicao &&
      reposicao.alunoId === alunoId &&
      reposicao.cobravel === false &&
      reposicao.cicloCobrancaResolvido &&
      reposicao.cicloCobrancaResolvido.inicio === cicloInicioISO,
  );

  const aulasNormais = agendamentosNormais.reduce(
    (total, agendamento) =>
      total + normalizarAulasContadas(agendamento, cicloInicio, cicloFim),
    0,
  );

  return aulasNormais + reposicoesCobraveis.length + reposicoesNaoCobraveis.length;
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

function formatarDataBR(dataISO) {
  if (!dataISO) return null;
  const partes = String(dataISO).slice(0, 10).split("-");
  if (partes.length !== 3) return null;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
}

function formatarPeriodoBR(cicloInicioISO, cicloFimISO) {
  return `${formatarDataBR(cicloInicioISO)}–${formatarDataBR(cicloFimISO)}`;
}

// 8.1–8.4: decomposição pura de aulasContadas/valorTotalCiclo em linhas. Cada linha com valor
// corresponde 1-a-1 a uma parcela já contada em calcularAulasContadasDoCiclo — a soma fecha por
// construção, sem nenhuma correção genérica (a única exceção nomeada é o piso_zero, ver abaixo).
function montarExtratoDoCiclo(ciclo, aluno, agendamentos, reposicoes) {
  if (!ciclo) return [];

  const cicloInicio = normalizarDateOnly(ciclo.cicloInicio);
  const cicloFim = normalizarDateOnly(ciclo.cicloFim);
  if (!cicloInicio || !cicloFim) return [];

  const cicloInicioISO = toISODateOnly(cicloInicio);
  const alunoId = ciclo.alunoId;
  const lista = Array.isArray(agendamentos) ? agendamentos : [];
  const listaReposicoes = Array.isArray(reposicoes) ? reposicoes : [];
  const metodoCobranca =
    ciclo.metodoCobranca || (aluno && aluno.metodoCobranca) || "por_aula";
  const isValorFixo = metodoCobranca === "valor_fixo";
  const preco = isValorFixo
    ? 0
    : Number(
        (ciclo.precoAulaSnapshot !== null && ciclo.precoAulaSnapshot !== undefined
          ? ciclo.precoAulaSnapshot
          : aluno && aluno.preco) || 0,
      );

  const linhas = [];

  // (A) agendamentos normais — recorrente vs. avulsa
  const agendamentosDoAluno = lista.filter(
    (agendamento) =>
      agendamento &&
      agendamento.alunoId === alunoId &&
      !agendamento.reposicaoId &&
      (agendamento.tipo === "aula" || agendamento.tipo === "reposicao"),
  );

  const recorrentes = agendamentosDoAluno.filter(
    (agendamento) => agendamento.frequencia !== "uma_vez",
  );
  const avulsas = agendamentosDoAluno.filter(
    (agendamento) => agendamento.frequencia === "uma_vez",
  );

  const qtdRecorrentes = recorrentes.reduce(
    (total, agendamento) =>
      total + normalizarAulasContadas(agendamento, cicloInicio, cicloFim),
    0,
  );
  const qtdAvulsas = avulsas.reduce(
    (total, agendamento) =>
      total + normalizarAulasContadas(agendamento, cicloInicio, cicloFim),
    0,
  );

  if (qtdRecorrentes > 0) {
    linhas.push({
      tipo: "recorrente",
      descricao: `${qtdRecorrentes} aula(s) recorrente(s)`,
      quantidade: qtdRecorrentes,
      valorUnitario: isValorFixo ? 0 : preco,
      valorTotal: isValorFixo ? 0 : qtdRecorrentes * preco,
      nota: null,
    });
  }

  if (qtdAvulsas > 0) {
    linhas.push({
      tipo: "avulsa",
      descricao: `${qtdAvulsas} aula(s) avulsa(s)`,
      quantidade: qtdAvulsas,
      valorUnitario: isValorFixo ? 0 : preco,
      valorTotal: isValorFixo ? 0 : qtdAvulsas * preco,
      nota: null,
    });
  }

  // (B)/(C) e linhas de valor zero — uma linha por reposição, com deduplicação por precedência.
  const reposicoesDoAluno = listaReposicoes.filter(
    (reposicao) => reposicao && reposicao.alunoId === alunoId,
  );
  const agendamentosComReposicao = lista.filter(
    (agendamento) => agendamento && agendamento.alunoId === alunoId && agendamento.reposicaoId,
  );

  const PRECEDENCIA = [
    "reposicao_cobravel_origem",
    "reposicao_nao_cobravel",
    "reposicao_cobranca_adiada",
    "reposicao_ja_cobrada",
    "reposicao_expirada",
    "reposicao_pendente",
  ];

  for (const reposicao of reposicoesDoAluno) {
    const candidatos = [];

    if (
      reposicao.cobravel === true &&
      dataEmJanela(reposicao.dataOriginal, cicloInicio, cicloFim)
    ) {
      candidatos.push("reposicao_cobravel_origem");
    }

    if (
      reposicao.cobravel === false &&
      reposicao.cicloCobrancaResolvido &&
      reposicao.cicloCobrancaResolvido.inicio === cicloInicioISO
    ) {
      candidatos.push("reposicao_nao_cobravel");
    }

    if (
      reposicao.cobravel === false &&
      reposicao.cicloCobrancaResolvido &&
      reposicao.cicloCobrancaResolvido.inicio !== cicloInicioISO
    ) {
      const agendamentoVinculado = agendamentosComReposicao.find(
        (agendamento) =>
          agendamento.reposicaoId === reposicao.id &&
          normalizarAulasContadas(agendamento, cicloInicio, cicloFim) > 0,
      );
      if (agendamentoVinculado) {
        candidatos.push("reposicao_cobranca_adiada");
      }
    }

    if (
      reposicao.cobravel === true &&
      !dataEmJanela(reposicao.dataOriginal, cicloInicio, cicloFim)
    ) {
      const agendamentoVinculado = agendamentosComReposicao.find(
        (agendamento) =>
          agendamento.reposicaoId === reposicao.id &&
          normalizarAulasContadas(agendamento, cicloInicio, cicloFim) > 0,
      );
      if (agendamentoVinculado) {
        candidatos.push("reposicao_ja_cobrada");
      }
    }

    if (
      reposicao.status === "expirada" &&
      dataEmJanela(reposicao.validoAte, cicloInicio, cicloFim)
    ) {
      candidatos.push("reposicao_expirada");
    }

    if (
      reposicao.cobravel === false &&
      reposicao.status === "pendente" &&
      dataEmJanela(reposicao.dataOriginal, cicloInicio, cicloFim)
    ) {
      candidatos.push("reposicao_pendente");
    }

    if (candidatos.length === 0) continue;

    const tipoEscolhido = PRECEDENCIA.find((tipo) => candidatos.includes(tipo));

    if (tipoEscolhido === "reposicao_cobravel_origem") {
      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição cobrável (origem)",
        quantidade: 1,
        valorUnitario: isValorFixo ? 0 : preco,
        valorTotal: isValorFixo ? 0 : preco,
        nota: null,
      });
    } else if (tipoEscolhido === "reposicao_nao_cobravel") {
      const nota = dataEmJanela(reposicao.dataOriginal, cicloInicio, cicloFim)
        ? null
        : `referente à aula de ${formatarDataBR(reposicao.dataOriginal)}, cobrada aqui por ciclo anterior já pago`;

      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição não cobrável",
        quantidade: 1,
        valorUnitario: isValorFixo ? 0 : preco,
        valorTotal: isValorFixo ? 0 : preco,
        nota,
      });
    } else if (tipoEscolhido === "reposicao_cobranca_adiada") {
      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição com cobrança adiada",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        nota: `cobrada no ciclo ${formatarPeriodoBR(reposicao.cicloCobrancaResolvido.inicio, reposicao.cicloCobrancaResolvido.fim)}`,
      });
    } else if (tipoEscolhido === "reposicao_ja_cobrada") {
      const origem = calcularCicloVigente(
        aluno,
        normalizarDateOnly(reposicao.dataOriginal),
      );
      const nota = origem
        ? `já cobrada no ciclo ${formatarPeriodoBR(origem.cicloInicioISO, origem.cicloFimISO)}`
        : "já cobrada em ciclo anterior";
      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição já cobrada",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        nota,
      });
    } else if (tipoEscolhido === "reposicao_expirada") {
      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição expirada",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        nota: `prazo expirado em ${formatarDataBR(reposicao.validoAte)}`,
      });
    } else if (tipoEscolhido === "reposicao_pendente") {
      const nota = reposicao.validoAte
        ? `aguardando reagendamento; válida até ${formatarDataBR(reposicao.validoAte)}`
        : "aguardando reagendamento; não cobrada";

      linhas.push({
        tipo: tipoEscolhido,
        descricao: "reposição pendente",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        nota,
      });
    }
  }

  // Ajuste manual — parcela explícita, pode ser negativa.
  const ajuste = Number(ciclo.aulasManuaisExtras) || 0;
  if (ajuste !== 0) {
    linhas.push({
      tipo: "ajuste_manual",
      descricao: "ajuste manual",
      quantidade: ajuste,
      valorUnitario: isValorFixo ? 0 : preco,
      valorTotal: isValorFixo ? 0 : ajuste * preco,
      nota: ciclo.observacaoAjuste || null,
    });
  }

  // Piso zero (5.5): única correção permitida, e só dispara na condição de truncamento.
  const aulasContadas = Number(ciclo.aulasContadas) || 0;
  const totalBruto = aulasContadas + ajuste;
  if (!isValorFixo && totalBruto < 0) {
    const somaLinhas = linhas.reduce(
      (total, linha) => total + Number(linha.valorTotal || 0),
      0,
    );
    const valorEsperado = Number(ciclo.valorTotalCiclo) || 0;
    const diferenca = valorEsperado - somaLinhas;
    if (diferenca > 0) {
      linhas.push({
        tipo: "piso_zero",
        descricao: "ajuste de piso zero",
        quantidade: 0,
        valorUnitario: 0,
        valorTotal: diferenca,
        nota: "total do ciclo não pode ser negativo",
      });
    }
  }

  // 5.5: aluno valor_fixo — extrato puramente informativo, não altera valorTotalCiclo.
  if (isValorFixo) {
    linhas.push({
      tipo: "valor_fixo",
      descricao: "valor fixo do ciclo",
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: Number(ciclo.valorFixoSnapshot) || 0,
      nota: null,
    });
  }

  return linhas;
}

async function resolverCicloCobranca(ownerEmail, aluno, dataISO) {
  const dataAlvo = normalizarDateOnly(dataISO);
  if (!dataAlvo) return null;
  if (!aluno) return null;

  let ciclo = calcularCicloVigente(aluno, dataAlvo);
  if (!ciclo) return null;

  const MAX_ITERACOES = 24;
  let iteracoes = 0;

  while (iteracoes < MAX_ITERACOES) {
    const documento = await CicloFinanceiro.findOne({
      ownerEmail,
      alunoId: aluno.id,
      cicloInicio: ciclo.cicloInicioISO,
    }).lean();

    if (!documento || !documento.dataPagamento) {
      return { inicio: ciclo.cicloInicioISO, fim: ciclo.cicloFimISO };
    }

    iteracoes += 1;
    const proximaData = diaSeguinte(ciclo.cicloFim);
    ciclo = calcularCicloVigente(aluno, proximaData);
    if (!ciclo) {
      return null;
    }
  }

  return { inicio: ciclo.cicloInicioISO, fim: ciclo.cicloFimISO };
}

// 5.8: ciclo sem dataPagamento é recontado a partir da agenda a cada leitura; ciclo pago fica congelado.
async function sincronizarCicloComAgenda(documento, aluno, agendamentos, reposicoes) {
  if (!documento || documento.dataPagamento) return documento;

  const cicloInicio = normalizarDateOnly(documento.cicloInicio);
  const cicloFim = normalizarDateOnly(documento.cicloFim);
  if (!cicloInicio || !cicloFim) return documento;

  const alunoParaContagem = aluno || { id: documento.alunoId };
  const aulasContadas = calcularAulasContadasDoCiclo(
    alunoParaContagem,
    agendamentos,
    reposicoes,
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

function encerrarCicloSobrepostoSeNecessario(cicloAnterior, cicloNovo) {
  if (!cicloAnterior || !cicloNovo) return cicloAnterior;

  const inicioAnterior = normalizarDateOnly(cicloAnterior.cicloInicio);
  const fimAnterior = normalizarDateOnly(cicloAnterior.cicloFim);
  const inicioNovo = normalizarDateOnly(cicloNovo.cicloInicio);
  const fimNovo = normalizarDateOnly(cicloNovo.cicloFim);

  if (!inicioAnterior || !fimAnterior || !inicioNovo || !fimNovo) {
    return cicloAnterior;
  }

  const sobrepoe = inicioAnterior <= fimNovo && inicioNovo <= fimAnterior;
  if (!sobrepoe) {
    return cicloAnterior;
  }

  const fimAnteriorCorreto = new Date(inicioNovo.getTime());
  fimAnteriorCorreto.setDate(fimAnteriorCorreto.getDate() - 1);

  const fimISO = toISODateOnly(fimAnteriorCorreto);
  if (!fimISO) {
    return cicloAnterior;
  }

  const fimAntes = cicloAnterior.cicloFim;
  const statusAntes = cicloAnterior.status;

  cicloAnterior.cicloFim = fimISO;
  if (Object.prototype.hasOwnProperty.call(cicloAnterior, "cicloFimISO")) {
    cicloAnterior.cicloFimISO = fimISO;
  }

  if (cicloAnterior.status === "em_aberto" || cicloAnterior.status === "atrasado") {
    cicloAnterior.status = calcularStatusCiclo(cicloAnterior, new Date());
  }

  if (cicloAnterior.cicloFim !== fimAntes || cicloAnterior.status !== statusAntes) {
    cicloAnterior._alteradoPorSobreposicao = true;
  }

  return cicloAnterior;
}

async function obterOuCriarCicloVigente(
  ownerEmail,
  aluno,
  agendamentos,
  reposicoes,
  hoje = new Date(),
) {
  const ciclo = calcularCicloVigente(aluno, hoje);
  if (!ciclo) return null;

  const ciclosAbertos = await CicloFinanceiro.find({
    ownerEmail,
    alunoId: aluno.id,
    dataPagamento: null,
    status: { $ne: "pago" },
  }).sort({ cicloInicio: 1 });

  for (const cicloAberto of ciclosAbertos) {
    if (String(cicloAberto.cicloInicio) === String(ciclo.cicloInicioISO)) continue;

    const fimAntes = cicloAberto.cicloFim;
    const statusAntes = cicloAberto.status;
    encerrarCicloSobrepostoSeNecessario(cicloAberto, ciclo);

    if (
      cicloAberto.cicloFim !== fimAntes ||
      cicloAberto.status !== statusAntes
    ) {
      await cicloAberto.save();
    }
  }

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
      reposicoes,
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

  await sincronizarCicloComAgenda(documento, aluno, agendamentos, reposicoes);

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
  const reposicoes = await Reposicao.find({ ownerEmail });
  const reposicoesAtualizadas = await reposicaoService.sincronizarExpiracaoLazy(
    ownerEmail,
    reposicoes,
    hoje,
  );
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
      reposicoesAtualizadas,
      hoje,
    );

    if (cicloAtual) {
      cicloAtual.extrato = cicloAtual.dataPagamento
        ? cicloAtual.extrato
        : montarExtratoDoCiclo(cicloAtual, aluno, agendamentos, reposicoesAtualizadas);
    }

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
  if (!aluno) return [];

  const ciclosSemAtual = filtrarHistoricoExcluindoCicloAtual(aluno, hoje, ciclos);
  const agendamentos = await Agendamento.find({ ownerEmail });
  const reposicoes = await Reposicao.find({ ownerEmail });
  const reposicoesAtualizadas = await reposicaoService.sincronizarExpiracaoLazy(
    ownerEmail,
    reposicoes,
    hoje,
  );
  const historico = [];

  for (const doc of ciclosSemAtual) {
    await sincronizarCicloComAgenda(doc, aluno, agendamentos, reposicoesAtualizadas);
    const statusCalculado = calcularStatusCiclo(doc, hoje);
    if (doc.status !== statusCalculado) {
      doc.status = statusCalculado;
      doc.atualizadoEm = new Date();
      await doc.save();
    }
    const cicloObjeto = aplicarStatusCiclo(doc.toObject ? doc.toObject() : doc, hoje);
    cicloObjeto.extrato = cicloObjeto.dataPagamento
      ? cicloObjeto.extrato
      : montarExtratoDoCiclo(cicloObjeto, aluno, agendamentos, reposicoesAtualizadas);
    historico.push(cicloObjeto);
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

  const aluno = await Aluno.findOne({ ownerEmail, id: ciclo.alunoId });
  const agendamentos = await Agendamento.find({ ownerEmail, alunoId: ciclo.alunoId });
  const reposicoes = await Reposicao.find({ ownerEmail, alunoId: ciclo.alunoId });

  ciclo.dataPagamento = payload.dataPagamento || toISODateOnly(hoje);
  ciclo.formaPagamento = Object.prototype.hasOwnProperty.call(
    payload,
    "formaPagamento",
  )
    ? payload.formaPagamento || null
    : ciclo.formaPagamento;
  ciclo.extrato = montarExtratoDoCiclo(ciclo, aluno, agendamentos, reposicoes);
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
  filtrarHistoricoExcluindoCicloAtual,
  encerrarCicloSobrepostoSeNecessario,
  calcularAulasContadasDoCiclo,
  calcularValorTotalCiclo,
  calcularTotalAulasCobradas,
  montarExtratoDoCiclo,
  resolverCicloCobranca,
  listarFinancasDoOwner,
  obterHistoricoFinancasPorAluno,
  marcarCicloComoPago,
  atualizarAjusteCiclo,
  obterOuCriarCicloVigente,
  recalcularStatusCiclo: aplicarStatusCiclo,
};
