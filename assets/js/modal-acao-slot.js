// [TAG-MODAL-ACAO-SLOT] modal-acao-slot.js
// Responsabilidade: Modais de ação sobre slots existentes — Edição, Cancelamento, Reagendamento e Reposição
// Depende de: state.js (aulas, alunos, aulasParaRepor, HORARIOS), storage.js (salvarDados),
//             utils-datetime.js (somarMinutos, diferencaMinutos, converterPtBrParaISO, getDataSelecionadaPtBr, formatarDataPtBrLegivel),
//             widget-stepper-duracao.js (aplicarLimitesDuracaoPorContexto, sincronizarSteppersDuracao),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso, atualizarEstadoBloqueioDiaInteiroEdicao),
//             agenda-conflitos.js (getCompromissoSerializadoParaConflito, getConflitosNoDia, getDatasConflitoRecorrencia, getConflitosRecorrenciaEmDatas, gerarResumoConflitosDatas),
//             utils-kpi.js (mostrarToast), view-home.js (inicializarHome, dataSelecionada, dataAlvoAcaoStr — em runtime)
// Expõe: window.idCompromissoSelecionado, window.abrirModalAcaoSlot, window.fecharModalAcaoSlot,
//         window.atualizarAvisoConflitoEdicao, window.getLabelEscopoRecorrencia,
//         window.getResumoEscopoRecorrencia, window.atualizarResumoEscopoRecorrencia,
//         window.configurarEscopoRecorrenciaEdicao, window.abrirReagendarAulaModalSlot,
//         window.iniciarReagendamentoReposicao, window.fecharReagendarAulaModal,
//         window.togglePainelReposicoes, window.renderizarListaReposicoes

// Exposto em window para acesso cross-módulo (widget-stepper-duracao usa para edicao)
window.idCompromissoSelecionado = window.idCompromissoSelecionado || "";

// Dirty-check key for renderizarListaReposicoes — null forces a render on the next call.
let _ultimaChaveRenderReposicoes = null;
let _submissaoEdicaoEmAndamento = false;

function obterBotaoSubmitEdicao() {
  return document.querySelector('#formEditarCompromisso button[type="submit"]');
}

function atualizarEstadoSubmitEdicao(emAndamento) {
  const botao = obterBotaoSubmitEdicao();
  if (!botao) return;

  if (emAndamento) {
    botao.dataset.disabledAntesEdicao = botao.disabled ? "true" : "false";
    botao.disabled = true;
    return;
  }

  const disabledAntesEdicao = botao.dataset.disabledAntesEdicao === "true";
  delete botao.dataset.disabledAntesEdicao;
  botao.disabled = disabledAntesEdicao;
}

function obterCompromissoPorId(id) {
  if (typeof window.getCompromisso === "function") {
    return window.getCompromisso(id);
  }
  return Array.isArray(aulas) ? aulas.find((a) => a.id === id) : null;
}

function obterCompromissoSelecionado() {
  return obterCompromissoPorId(window.idCompromissoSelecionado);
}

function gerarIdReposicao() {
  return `repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deveEnviarPatchReposicao(resultadoPersistencia) {
  if (
    window.reposicaoFlowHelpers &&
    typeof window.reposicaoFlowHelpers.deveEnviarPatch === "function"
  ) {
    return window.reposicaoFlowHelpers.deveEnviarPatch(resultadoPersistencia);
  }
  return Boolean(resultadoPersistencia && resultadoPersistencia.ok === true);
}

function obterMensagemFalhaPersistencia(resultadoPersistencia) {
  if (
    window.reposicaoFlowHelpers &&
    typeof window.reposicaoFlowHelpers.obterMensagemFalhaPersistencia ===
      "function"
  ) {
    return window.reposicaoFlowHelpers.obterMensagemFalhaPersistencia(
      resultadoPersistencia,
    );
  }

  const motivo =
    resultadoPersistencia && typeof resultadoPersistencia.motivo === "string"
      ? resultadoPersistencia.motivo
      : "falha_remota";
  if (motivo === "nao_autenticado" || motivo === "sessao_expirada") {
    return "Sessão expirada. Faça login com Google para continuar.";
  }
  return "Falha ao salvar alterações antes de concluir a reposição.";
}

async function enviarParaReposicao(compromisso, dataAlvoISO, cobravel) {
  if (!compromisso || !compromisso.alunoId) {
    throw new Error("Compromisso inválido para envio para reposição.");
  }

  const alunoAtual =
    typeof window.getAluno === "function"
      ? window.getAluno(compromisso.alunoId)
      : null;
  const dataOriginalISO = window.normalizarDataParaISO(
    dataAlvoISO || compromisso.data || window.getDataSelecionadaPtBr(),
  );
  const payload = {
    id: gerarIdReposicao(),
    alunoId: String(compromisso.alunoId),
    alunoNome: alunoAtual && alunoAtual.nome ? String(alunoAtual.nome) : "",
    dataOriginal: dataOriginalISO,
    horarioOriginal: compromisso.horarioInicio || "00:00",
    cobravel: Boolean(cobravel),
    agendamentoOriginalId: compromisso.id || null,
  };

  if (!payload.dataOriginal) {
    throw new Error("Data da aula inválida para enviar para reposição.");
  }

  const baseUrl = window.APP_API_CONFIG.apiBaseUrl;
  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resposta.ok) {
    let mensagem = "Não foi possível criar a reposição.";
    try {
      const erroJson = await resposta.json();
      mensagem = erroJson && erroJson.error ? erroJson.error : mensagem;
    } catch (_) {}
    throw new Error(mensagem);
  }

  const reposicaoCriada = await resposta.json().catch(() => null);
  const reposicaoFinal = reposicaoCriada || payload;
  window.log.info("[reposicao]", "Reposição criada", {
    id: reposicaoFinal && reposicaoFinal.id ? reposicaoFinal.id : payload.id,
    aluno: payload.alunoNome || payload.alunoId || null,
    prazo:
      reposicaoFinal && reposicaoFinal.validoAte
        ? reposicaoFinal.validoAte
        : null,
  });
  return reposicaoFinal;
}

function obterNomesDiasSemanaModalAcao() {
  return typeof window.getNomesDiasSemana === "function"
    ? window.getNomesDiasSemana()
    : ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
}

/**
 * Resolve a família completa de uma série, incluindo a própria série, a série
 * pai histórico e todos os descendentes desta ligação (séries de continuação e
 * avulsas), com proteção contra ciclo.
 * @param {string|Object} idOuCompromisso
 * @returns {{ id: string }[]} registros da família completa
 */
window.resolverFamiliaSerie = function (idOuCompromisso) {
 const baseId =
   idOuCompromisso && typeof idOuCompromisso === "object"
     ? idOuCompromisso.id
     : idOuCompromisso;
 if (!baseId || !Array.isArray(aulas)) return [];

 const fila = [baseId];
 const visitados = new Set();
 const familia = [];

 while (fila.length > 0) {
   const atualId = fila.shift();
   if (!atualId || visitados.has(atualId)) continue;
   visitados.add(atualId);

   const atual = aulas.find((item) => item && item.id === atualId);
   if (atual) familia.push(atual);

   aulas.forEach((item) => {
     if (!item || item.id === atualId) return;
     const filhoDireto = item.serieOrigemId === atualId;
     const paiDireto =
       atual && atual.serieOrigemId && item.id === atual.serieOrigemId;
     if ((filhoDireto || paiDireto) && !visitados.has(item.id)) {
       fila.push(item.id);
     }
   });
 }

 return familia.filter(
   (item, indice, lista) =>
     item && lista.findIndex((outro) => outro && outro.id === item.id) === indice,
 );
};

/**
 * Resolve apenas os descendentes diretos e transitivos da série, sem subir para
 * o pai histórico. Serve ao fluxo de exclusão em cascata, que não deve apagar a
 * série original quando a série em edição é uma continuação.
 * @param {string|Object} idOuCompromisso
 * @returns {{ id: string }[]} registros descendentes da família
 */
window.resolverFamiliaDescendenteSerie = function (idOuCompromisso) {
 const baseId =
   idOuCompromisso && typeof idOuCompromisso === "object"
     ? idOuCompromisso.id
     : idOuCompromisso;
 if (!baseId || !Array.isArray(aulas)) return [];

 const fila = [baseId];
 const visitados = new Set();
 const familia = [];

 while (fila.length > 0) {
   const atualId = fila.shift();
   if (!atualId || visitados.has(atualId)) continue;
   visitados.add(atualId);

   const atual = aulas.find((item) => item && item.id === atualId);
   if (atual) familia.push(atual);

   aulas.forEach((item) => {
     if (!item || item.id === atualId) return;
     const filhoDireto = item.serieOrigemId === atualId;
     if (filhoDireto && !visitados.has(item.id)) {
       fila.push(item.id);
     }
   });
 }

 return familia.filter(
   (item, indice, lista) =>
     item && lista.findIndex((outro) => outro && outro.id === item.id) === indice,
 );
};

window.removerFamiliaSerie = function (idOuCompromisso) {
 if (!Array.isArray(aulas)) return 0;
 const familia = window.resolverFamiliaDescendenteSerie(idOuCompromisso);
 const idsParaRemover = new Set(
   familia
     .filter((item) => item && !item.isReposicao)
     .map((item) => item.id),
 );

 if (idsParaRemover.size === 0) return 0;

 const antes = aulas.length;
 aulas.splice(
   0,
   aulas.length,
   ...aulas.filter((item) => !idsParaRemover.has(item && item.id)),
 );
 return antes - aulas.length;
};

window.montarResumoExclusaoCadeiaSerie = function (idOuCompromisso) {
 if (!Array.isArray(aulas)) {
   return {
     total: 0,
     reposicoesPreservadas: 0,
     ids: [],
     desde: null,
     ate: null,
     mensagem: "Período: sem dados",
   };
 }

 const familia = window.resolverFamiliaSerie(idOuCompromisso);
 const ids = familia
   .filter((item) => item && !item.isReposicao)
   .map((item) => item.id);
 const reposicoesPreservadas = familia.filter((item) => item && item.isReposicao).length;

 const datasInicio = familia
   .filter((item) => item && (item.recorrenciaDataInicio || item.data || item.dataCriacao))
   .map((item) => item.recorrenciaDataInicio || item.data || item.dataCriacao)
   .filter(Boolean);

 const converterParaDataJs = (valor) => {
   if (!valor) return null;
   if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
   if (typeof valor === "string") {
     const valorNormalizado = valor.trim();
     if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorNormalizado)) {
       const [dia, mes, ano] = valorNormalizado.split("/").map(Number);
       return new Date(ano, mes - 1, dia);
     }
     if (/^\d{4}-\d{2}-\d{2}$/.test(valorNormalizado)) {
       const [ano, mes, dia] = valorNormalizado.split("-").map(Number);
       return new Date(ano, mes - 1, dia);
     }
     if (typeof window.parseDataFlex === "function") {
       const data = window.parseDataFlex(valorNormalizado);
       if (data && !Number.isNaN(data.getTime())) return data;
     }
     const dataIso = new Date(valorNormalizado);
     if (!Number.isNaN(dataIso.getTime())) return dataIso;
   }
   return null;
 };

 const formatarDataPtBr = (valor) => {
   const data = converterParaDataJs(valor);
   if (!data) return null;
   const dia = String(data.getDate()).padStart(2, "0");
   const mes = String(data.getMonth() + 1).padStart(2, "0");
   const ano = String(data.getFullYear());
   return `${dia}/${mes}/${ano}`;
 };

 const desde = datasInicio.reduce((menor, valorAtual) => {
   if (!menor) return valorAtual;
   const menorData = converterParaDataJs(menor);
   const atualData = converterParaDataJs(valorAtual);
   if (!menorData || !atualData) return menor;
   return atualData < menorData ? valorAtual : menor;
 }, null);

 const membrosComFim = familia.filter(
   (item) =>
     item &&
     !item.isReposicao &&
     item.frequencia !== "uma_vez" &&
     item.recorrenciaDataFim,
 );
 const datasFim = membrosComFim
   .map((item) => item.recorrenciaDataFim)
   .filter(Boolean);
 const temInfinito = familia.some(
   (item) =>
     item &&
     !item.isReposicao &&
     item.frequencia !== "uma_vez" &&
     !item.recorrenciaDataFim,
 );

 let ate = null;
 if (!temInfinito && datasFim.length > 0) {
   ate = datasFim.reduce((maior, valorAtual) => {
     const maiorData = converterParaDataJs(maior);
     const atualData = converterParaDataJs(valorAtual);
     if (!maiorData || !atualData) return maior;
     return atualData > maiorData ? valorAtual : maior;
   }, datasFim[0]);
   ate = formatarDataPtBr(ate);
 }

 const mensagem = ate
   ? `Período: desde ${formatarDataPtBr(desde) || desde} até ${ate}`
   : `Período: desde ${formatarDataPtBr(desde) || desde} até sem data de término`;

 return {
   total: ids.length,
   reposicoesPreservadas,
   ids,
   desde: formatarDataPtBr(desde) || desde || null,
   ate,
   mensagem,
 };
};

window.removerCadeiaCompletaSerie = function (idOuCompromisso) {
 if (!Array.isArray(aulas)) return 0;
 const familia = window.resolverFamiliaSerie(idOuCompromisso);
 const idsParaRemover = new Set(
   familia
     .filter((item) => item && !item.isReposicao)
     .map((item) => item.id),
 );

 if (idsParaRemover.size === 0) return 0;

 const antes = aulas.length;
 aulas.splice(
   0,
   aulas.length,
   ...aulas.filter((item) => !idsParaRemover.has(item && item.id)),
 );
 return antes - aulas.length;
};

window.montarOpcoesExclusaoSlot = function (compromisso, dataAlvoStr) {
 if (!compromisso) return [];

 const dataExibicao =
   dataAlvoStr ||
   (compromisso.data ? compromisso.data : "esta data") ||
   "esta data";

 if (compromisso.frequencia === "uma_vez") {
   return [
     {
       acao: "instancia",
       titulo: "Excluir esta aula",
       detalhe: `${dataExibicao}. Esta aula não se repete.`,
     },
   ];
 }

 const resumo = window.montarResumoExclusaoCadeiaSerie
   ? window.montarResumoExclusaoCadeiaSerie(compromisso)
   : { total: 0, desde: null, reposicoesPreservadas: 0 };
 const totalSerie = Number(resumo && resumo.total ? resumo.total : 0);
 const unidadeSerie = totalSerie === 1 ? "aula" : "aulas";
 const detalheSerie = `${totalSerie || 0} ${unidadeSerie}, desde ${resumo.desde || "início"}. Apaga também o histórico.`;

 const opcoes = [
   {
     acao: "instancia",
     titulo: "Excluir esta aula",
     detalhe: `Só ${dataExibicao} sai. A série continua.`,
   },
   {
     acao: "daqui",
     titulo: "Excluir daqui pra frente",
     detalhe: `${dataExibicao} em diante. O histórico anterior fica.`,
   },
   {
     acao: "serie",
     titulo: "Excluir a série toda",
     detalhe: detalheSerie,
   },
 ];

 if (resumo && resumo.reposicoesPreservadas > 0) {
   opcoes[2].detalhe = `${opcoes[2].detalhe} As reposições serão mantidas.`;
 }

 return opcoes;
};

window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte, opcoes) {
 const emSimulacao = !!(opcoes && opcoes.simular === true);
 if (!Array.isArray(aulas) || !dataCorte) {
   return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
 }

 const baseCompromisso =
   idOuCompromisso && typeof idOuCompromisso === "object"
     ? idOuCompromisso
     : aulas.find((item) => item && item.id === idOuCompromisso);

 if (!baseCompromisso || !baseCompromisso.id) {
   return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
 }

 const dataCorteJs = window.parseDataFlex(dataCorte);
 if (!dataCorteJs || Number.isNaN(dataCorteJs.getTime())) {
   return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
 }

 const formatarDataPtBr = (valor) => {
   const dataObj =
     valor instanceof Date && !Number.isNaN(valor.getTime())
       ? valor
       : window.parseDataFlex(valor);

   if (!dataObj || Number.isNaN(dataObj.getTime())) return null;
   const dia = String(dataObj.getDate()).padStart(2, "0");
   const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
   const ano = String(dataObj.getFullYear());
   return `${dia}/${mes}/${ano}`;
 };

 const dataAparo = new Date(dataCorteJs);
 dataAparo.setDate(dataAparo.getDate() - 1);

 const serieFicaVaziaAposAparo = (compromisso) => {
   const dataInicio = window.parseDataFlex(
     compromisso.recorrenciaDataInicio || compromisso.data || compromisso.dataCriacao,
   );
   if (!dataInicio || !dataAparo) return false;
   if (dataAparo < dataInicio) return true;

   const cursorInicio = new Date(dataInicio);
   const cursorFim = new Date(dataAparo);

   for (
     let cursor = new Date(cursorInicio);
     cursor <= cursorFim;
     cursor.setDate(cursor.getDate() + 1)
   ) {
     const dataTeste = new Date(
       cursor.getFullYear(),
       cursor.getMonth(),
       cursor.getDate(),
     );
     if (window.checarCompromissoNaData(compromisso, dataTeste)) {
       return false;
     }
   }

   return true;
 };

 const idsAtingidos = [];
 const idsAparadas = [];
 const idsRemovidas = [];
 const idsReposicoesPreservadas = new Set();

 const registrarAtingido = (id) => {
   if (!id || idsAtingidos.includes(id)) return;
   idsAtingidos.push(id);
 };

 const removerItem = (item) => {
   if (!item || !item.id) return;
   const indice = aulas.findIndex((registro) => registro && registro.id === item.id);
   if (indice >= 0 && !emSimulacao) {
     aulas.splice(indice, 1);
   }
   registrarAtingido(item.id);
   if (!idsRemovidas.includes(item.id)) idsRemovidas.push(item.id);
 };

 const apararItem = (item) => {
   if (!item || !item.id) return;
   if (!emSimulacao) {
     item.recorrenciaFimCondicao = "untilDate";
     item.recorrenciaDataFim = formatarDataPtBr(dataAparo);
     delete item.recorrenciaQuantidadeOcorrencias;
   }
   registrarAtingido(item.id);
   if (!idsAparadas.includes(item.id)) idsAparadas.push(item.id);
 };

 const idsAlvo = new Set();
 window.resolverFamiliaDescendenteSerie(baseCompromisso).forEach((item) => {
   if (item && item.id) idsAlvo.add(item.id);
 });

 const raizRelacionada = baseCompromisso.serieOrigemId || null;
 aulas.forEach((item) => {
   if (!item || !item.id) return;
   const mesmoRamo =
     item.id === baseCompromisso.id ||
     item.serieOrigemId === baseCompromisso.id ||
     (raizRelacionada &&
       item.serieOrigemId === raizRelacionada &&
       (item.frequencia === "uma_vez" || item.isReposicao));
   if (mesmoRamo) idsAlvo.add(item.id);
 });

 Array.from(idsAlvo)
   .map((id) => aulas.find((item) => item && item.id === id))
   .filter(Boolean)
   .forEach((item) => {
     if (!item) return;

     const dataItem = window.parseDataFlex(
       item.data || item.recorrenciaDataInicio || item.dataCriacao,
     );

     if (item.isReposicao) {
       if (dataItem && dataItem >= dataCorteJs) {
         idsReposicoesPreservadas.add(item.id);
       }
       return;
     }

     if (item.frequencia === "uma_vez") {
       if (dataItem && dataItem >= dataCorteJs) {
         removerItem(item);
       }
       return;
     }

     if (item.id === baseCompromisso.id) {
       if (serieFicaVaziaAposAparo(item)) {
         removerItem(item);
         return;
       }
       apararItem(item);
       return;
     }

     const dataInicio = window.parseDataFlex(
       item.recorrenciaDataInicio || item.data || item.dataCriacao,
     );
     if (!dataInicio) return;

     if (dataInicio >= dataCorteJs) {
       removerItem(item);
       return;
     }

     const dataFim = item.recorrenciaDataFim
       ? window.parseDataFlex(item.recorrenciaDataFim)
       : null;
     if (dataFim && dataFim < dataCorteJs) {
       return;
     }

     apararItem(item);
   });

 if (!emSimulacao && idsRemovidas.length > 0) {
   aulas.splice(
     0,
     aulas.length,
     ...aulas.filter((item) => !idsRemovidas.includes(item && item.id)),
   );
 }

 return {
   aparadas: idsAparadas.length,
   removidas: idsRemovidas.length,
   reposicoesPreservadas: idsReposicoesPreservadas.size,
   ids: idsAtingidos,
 };
};

function compromissoTemAlunoInativo(compromisso) {
  if (!compromisso || (compromisso.tipo || "aula") !== "aula") return false;
  if (
    typeof window.getAluno !== "function" ||
    typeof window.alunoEstaAtivo !== "function"
  )
    return false;
  const aluno = window.getAluno(compromisso.alunoId);
  return !window.alunoEstaAtivo(aluno);
}

function aplicarModoSomenteLeituraAlunoInativo(compromisso) {
  const aviso = document.getElementById("editAvisoAlunoInativo");
  const btnSalvar = document.querySelector(
    '#formEditarCompromisso button[type="submit"]',
  );
  const acoesUnico = document.getElementById("acoesCompromissoUnico");
  const acoesRecorrente = document.getElementById("acoesCompromissoRecorrente");
  const campos = [
    "editHoraInicio",
    "editDuracao",
    "editDiaSemana",
    "editDescricao",
    "editBloqueioDiaInteiro",
  ];

  const somenteLeitura = compromissoTemAlunoInativo(compromisso);
  if (aviso) aviso.style.display = somenteLeitura ? "block" : "none";
  if (btnSalvar)
    btnSalvar.style.display = somenteLeitura ? "none" : "inline-flex";
  if (acoesUnico)
    acoesUnico.style.display = somenteLeitura
      ? "none"
      : acoesUnico.style.display;
  if (acoesRecorrente)
    acoesRecorrente.style.display = somenteLeitura
      ? "none"
      : acoesRecorrente.style.display;

  campos.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = somenteLeitura;
  });
}

// ── Escopo de Edição da Recorrência ───────────────────────────────────────────────────────────

/** @param {string} escopo @returns {string} label curto do escopo */
window.getLabelEscopoRecorrencia = function (escopo) {
  if (typeof window.recorrenciaGetLabelEscopo === "function") {
    return window.recorrenciaGetLabelEscopo(escopo);
  }
  if (escopo === "occurrence") return "Somente esta aula";
  if (escopo === "entireSeries") return "Todas as aulas da série";
  return "Daqui pra frente";
};

/** @param {string} escopo @returns {string} descrição completa do escopo */
window.getResumoEscopoRecorrencia = function (escopo) {
  if (typeof window.recorrenciaGetResumoEscopo === "function") {
    return window.recorrenciaGetResumoEscopo(escopo);
  }
  if (escopo === "occurrence")
    return "Vai aplicar somente nesta aula específica.";
  if (escopo === "entireSeries") return "Vai aplicar na série inteira.";
  return "Vai aplicar nesta aula e nas próximas da série.";
};

window.atualizarResumoEscopoRecorrencia = function () {
  const inputEscopo = document.getElementById("editEscopoRecorrencia");
  const resumo = document.getElementById("editEscopoResumo");
  if (!inputEscopo || !resumo) return;
  resumo.textContent = window.getResumoEscopoRecorrencia(
    inputEscopo.value || "fromDate",
  );
};

window.configurarEscopoRecorrenciaEdicao = function () {
  const grid = document.getElementById("editEscopoRecorrenciaGrid");
  const inputEscopo = document.getElementById("editEscopoRecorrencia");
  if (!grid || !inputEscopo) return;

  grid.querySelectorAll(".btn-escopo-recorrencia").forEach((btn) => {
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener("click", () => {
      const escopo = novoBtn.dataset.escopo || "fromDate";
      inputEscopo.value = escopo;
      grid.querySelectorAll(".btn-escopo-recorrencia").forEach((b) => {
        b.classList.toggle("active", b.dataset.escopo === escopo);
      });
      window.atualizarResumoEscopoRecorrencia();
      window.atualizarAvisoConflitoEdicao();
    });
  });

  inputEscopo.value = "fromDate";
  window.atualizarResumoEscopoRecorrencia();
};

// ── Modal: Ação sobre Slot ─────────────────────────────────────────────────────────────────────

window.abrirModalAcaoSlot = function (id) {
  window.idCompromissoSelecionado = id;
  const modal = document.getElementById("modalAcaoSlot");
  const compromisso = obterCompromissoPorId(id);
  if (!compromisso) return;

  // [TAG-GCAL-READONLY] Eventos externos do Google Calendar são somente leitura
  if (compromisso.source === "google_external") {
    if (typeof mostrarToast === "function") {
      mostrarToast(
        "🔒 Este horário está bloqueado por um evento da Google Agenda.",
        "warning",
      );
    }
    return;
  }

  const freq = compromisso.frequencia || "uma_vez";
  const alunoInativo = compromissoTemAlunoInativo(compromisso);
  document.getElementById("editCompromissoFrequencia").value = freq;

  const badge = document.getElementById("badgeTipoCompromisso");
  const containerDiaSemana = document.getElementById("editDiaSemanaContainer");

  const acoesUnico = document.getElementById("acoesCompromissoUnico");
  const acoesRecorrente = document.getElementById("acoesCompromissoRecorrente");
  const btnMandarReposicao = document.getElementById("btnMandarParaReposicao");
  const btnReagendarInstancia = document.getElementById(
    "btnReagendarInstancia",
  );
  const recorrenteTopRow = document.querySelector(
    "#acoesCompromissoRecorrente > div",
  );

  const dataAlvoStr =
    window.dataAlvoAcaoStr ||
    window.dataSelecionada.toLocaleDateString("pt-BR");
  const containerEscopo = document.getElementById(
    "editEscopoRecorrenciaContainer",
  );
  const inputEscopo = document.getElementById("editEscopoRecorrencia");
  const impactoEscopo = document.getElementById("editEscopoImpacto");
  const tipo = compromisso.tipo || "aula";

  if (tipo !== "aula") {
    if (btnMandarReposicao) btnMandarReposicao.style.display = "none";
    if (btnReagendarInstancia) btnReagendarInstancia.style.display = "none";
  } else if (!alunoInativo) {
    if (btnMandarReposicao) btnMandarReposicao.style.display = "inline-flex";
    if (btnReagendarInstancia)
      btnReagendarInstancia.style.display = "inline-flex";
  } else {
    if (btnMandarReposicao) btnMandarReposicao.style.display = "none";
    if (btnReagendarInstancia) btnReagendarInstancia.style.display = "none";
  }

  if (freq === "semanal") {
    const padraoNome = compromisso.tipoRecorrencia
      ? compromisso.tipoRecorrencia.toUpperCase()
      : "SEMANAL";
    badge.innerHTML = `<i class="fa-solid fa-infinity"></i> ${padraoNome}`;
    badge.className = "modal-badge badge-aula";

    containerDiaSemana.style.display = "block";
    const _isoAlvoDia =
      typeof window.converterPtBrParaISO === "function"
        ? window.converterPtBrParaISO(dataAlvoStr)
        : null;
    const _idxDiaAlvo = _isoAlvoDia
      ? new Date(_isoAlvoDia + "T12:00:00").getDay()
      : -1;
    const _nomesDias = obterNomesDiasSemanaModalAcao();
    document.getElementById("editDiaSemana").value =
      (_idxDiaAlvo >= 0 ? _nomesDias[_idxDiaAlvo] : null) ||
      compromisso.dia ||
      "Segunda";
    document.getElementById("editInfoDia").textContent =
      `Série Recorrente • Gerenciando dia: ${dataAlvoStr}`;
    if (containerEscopo) containerEscopo.style.display = "block";
    if (inputEscopo) inputEscopo.value = "fromDate";
    document
      .querySelectorAll("#editEscopoRecorrenciaGrid .btn-escopo-recorrencia")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.escopo === "fromDate");
      });
    if (impactoEscopo) {
      impactoEscopo.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia("fromDate")}`;
    }
    window.atualizarResumoEscopoRecorrencia();
    window.atualizarAvisoConflitoEdicao();
    if (acoesUnico) acoesUnico.style.display = "none";
    if (acoesRecorrente) acoesRecorrente.style.display = "flex";
  } else {
    badge.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ÚNICO`;
    badge.className = "modal-badge badge-desloc";

    containerDiaSemana.style.display = "none";
    document.getElementById("editInfoDia").textContent =
      `Agendado para: ${compromisso.data || compromisso.dia}`;
    if (containerEscopo) containerEscopo.style.display = "none";
    if (impactoEscopo) impactoEscopo.textContent = "";
    if (acoesUnico) acoesUnico.style.display = "grid";
    if (acoesRecorrente) acoesRecorrente.style.display = "none";
  }

  const selectInicio = document.getElementById("editHoraInicio");
  const selectDuracao = document.getElementById("editDuracao");

  const optionsHtml = HORARIOS.map(
    (h) => `<option value="${h}">${h}</option>`,
  ).join("");
  selectInicio.innerHTML = optionsHtml;
  selectInicio.value = compromisso.horarioInicio;

  const minutes = window.diferencaMinutos(
    compromisso.horarioInicio,
    compromisso.horarioFim,
  );
  selectDuracao.value = minutes.toString();
  window.aplicarLimitesDuracaoPorContexto("edicao");
  window.sincronizarSteppersDuracao();

  const camposAula = document.getElementById("editCamposTipoAula");
  const camposBloqueio = document.getElementById("editCamposTipoBloqueio");
  const camposBloqueioDiaInteiro = document.getElementById(
    "editCamposTipoBloqueioDiaInteiro",
  );
  const checkDiaInteiro = document.getElementById("editBloqueioDiaInteiro");
  const ehDiaInteiro = window.ehBloqueioDiaInteiroCompromisso(compromisso);

  if (tipo === "aula") {
    camposAula.style.display = "block";
    camposBloqueio.style.display = "none";
    if (camposBloqueioDiaInteiro)
      camposBloqueioDiaInteiro.style.display = "none";
    if (checkDiaInteiro) checkDiaInteiro.checked = false;
    window.atualizarEstadoBloqueioDiaInteiroEdicao();

    const selectAluno = document.getElementById("editAluno");
    if (selectAluno) {
      selectAluno.innerHTML = alunos
        .map((a) => `<option value="${a.id}">${a.nome}</option>`)
        .join("");
      selectAluno.value = compromisso.alunoId;
    }
  } else if (tipo === "deslocamento") {
    camposAula.style.display = "none";
    camposBloqueio.style.display = "none";
    if (camposBloqueioDiaInteiro)
      camposBloqueioDiaInteiro.style.display = "none";
    if (checkDiaInteiro) checkDiaInteiro.checked = false;
    window.atualizarEstadoBloqueioDiaInteiroEdicao();
  } else if (tipo === "bloqueio") {
    camposAula.style.display = "none";
    camposBloqueio.style.display = "block";
    if (camposBloqueioDiaInteiro)
      camposBloqueioDiaInteiro.style.display = "block";
    if (checkDiaInteiro) checkDiaInteiro.checked = ehDiaInteiro;
    window.atualizarEstadoBloqueioDiaInteiroEdicao();
    document.getElementById("editDescricao").value =
      compromisso.descricao || "";
  }

  if (modal) modal.style.display = "flex";
  aplicarModoSomenteLeituraAlunoInativo(compromisso);
};

window.fecharModalAcaoSlot = function () {
  document.getElementById("modalAcaoSlot").style.display = "none";
};

window.abrirModalEscolhaCobrancaReposicao = function (compromisso, callback) {
  const modal = document.getElementById("modalEscolhaCobrancaReposicao");
  if (!modal || !compromisso) return;

  const aluno =
    typeof window.getAluno === "function"
      ? window.getAluno(compromisso.alunoId)
      : null;
  const dataOriginal =
    compromisso.data && typeof compromisso.data === "string"
      ? compromisso.data
      : window.getDataSelecionadaPtBr
        ? window.getDataSelecionadaPtBr()
        : "";
  const nomeAluno = aluno && aluno.nome ? String(aluno.nome) : "Aluno";
  const dataHora = `${window.formatarDataPtBrLegivel ? window.formatarDataPtBrLegivel(dataOriginal) : dataOriginal} · ${compromisso.horarioInicio || "00:00"}`;

  document.getElementById("reposicaoEscolhaAluno").textContent = nomeAluno;
  document.getElementById("reposicaoEscolhaDataHorario").textContent = dataHora;

  const opcaoButtons = modal.querySelectorAll("[data-reposicao-cobravel]");
  opcaoButtons.forEach((botao) => {
    botao.onclick = async () => {
      const cobravel = botao.dataset.reposicaoCobravel === "true";
      modal.style.display = "none";
      if (typeof callback === "function") {
        await callback(cobravel);
      }
    };
  });

  modal.style.display = "flex";
};

window.fecharModalEscolhaCobrancaReposicao = function () {
  const modal = document.getElementById("modalEscolhaCobrancaReposicao");
  if (modal) modal.style.display = "none";
};

window.atualizarAvisoConflitoEdicao = function () {
  const impacto = document.getElementById("editEscopoImpacto");
  const compromisso = obterCompromissoSelecionado();
  if (!impacto || !compromisso) return;

  const freq = compromisso.frequencia || "uma_vez";
  const escopo =
    document.getElementById("editEscopoRecorrencia")?.value || "fromDate";
  impacto.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia(escopo)}`;

  if (freq !== "semanal") return;

  const dataAlvoStr = window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();
  const ehDiaInteiroEdicao =
    document.getElementById("editBloqueioDiaInteiro")?.checked &&
    (compromisso.tipo || "aula") === "bloqueio";
  const horarioInicio = ehDiaInteiroEdicao
    ? window.BLOQUEIO_DIA_INTEIRO_INICIO
    : document.getElementById("editHoraInicio")?.value ||
      compromisso.horarioInicio;
  const horarioFim = ehDiaInteiroEdicao
    ? window.BLOQUEIO_DIA_INTEIRO_FIM
    : window.somarMinutos(
        horarioInicio,
        document.getElementById("editDuracao")?.value ||
          window.diferencaMinutos(
            compromisso.horarioInicio,
            compromisso.horarioFim,
          ),
      );
  const candidato = window.getCompromissoSerializadoParaConflito(
    {
      ...compromisso,
      horarioInicio,
      horarioFim,
      fullDay: ehDiaInteiroEdicao,
    },
    dataAlvoStr,
  );

  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);

  if (escopo === "occurrence") {
    const iso = window.converterPtBrParaISO(dataAlvoStr);
    if (!iso) return;
    const data = new Date(`${iso}T12:00:00`);
    const conflitos = window.getConflitosNoDia(candidato, data, {
      ignorarIds: familiaIgnorarIds,
    });
    if (conflitos.length > 0) {
      impacto.textContent = `Conflito detectado em ${window.formatarDataPtBrLegivel(dataAlvoStr)}.`;
    }
    return;
  }

  const datas = window.getDatasConflitoRecorrencia(candidato, 16);
  const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, {
    ignorarIds: familiaIgnorarIds,
  });
  if (conflitos.length > 0) {
    impacto.textContent = `Conflitos previstos em: ${window.gerarResumoConflitosDatas(conflitos, 4)}.`;
  }
};

// ── Modal: Reagendar Aula ──────────────────────────────────────────────────────────────────────

window.abrirReagendarAulaModalSlot = function (dia, hora) {
  window.reagendamentoDirectCardId = null;

  const modal = document.getElementById("modalReagendarAula");
  if (!modal) return;
  document.getElementById("containerSeletorReagendarAluno").style.display =
    "block";
  document.getElementById("containerLockReagendarAluno").style.display = "none";
  const selectAluno = document.getElementById("reagendarAluno");
  if (selectAluno) {
    const alunosComFila = [];
    const idsUnicos = new Set();

    aulasParaRepor.forEach((rep) => {
      if (!idsUnicos.has(rep.alunoId)) {
        idsUnicos.add(rep.alunoId);
        const alunoObj = window.getAluno(rep.alunoId);
        if (
          alunoObj &&
          (typeof window.alunoEstaAtivo !== "function" ||
            window.alunoEstaAtivo(alunoObj))
        ) {
          alunosComFila.push(alunoObj);
        }
      }
    });

    if (alunosComFila.length === 0) {
      selectAluno.innerHTML =
        '<option value="">Não existem alunos ativos com reposição pendente.</option>';
    } else {
      selectAluno.innerHTML =
        '<option value="">Selecione o aluno...</option>' +
        alunosComFila
          .map((a) => `<option value="${a.id}">${a.nome}</option>`)
          .join("");
    }
  }
  document.getElementById("reagendarDia").value = dia;

  const selectInicio = document.getElementById("reagendarHoraInicio");
  const optionsHtml = HORARIOS.map(
    (h) => `<option value="${h}">${h}</option>`,
  ).join("");
  selectInicio.innerHTML = optionsHtml;
  selectInicio.value = hora;

  const nomeDiaReagendamento =
    dia === "Sábado" || dia === "Domingo" ? dia : `${dia}-feira`;
  document.getElementById("infoReagendamentoSlot").textContent =
    `Agendar reposição às ${hora} de ${nomeDiaReagendamento}`;

  modal.style.display = "flex";
};

window.iniciarReagendamentoReposicao = function (id) {
  const rep = aulasParaRepor.find((r) => r.id === id);
  if (!rep) return;
  const alunoRep =
    typeof window.getAluno === "function" ? window.getAluno(rep.alunoId) : null;
  if (
    typeof window.alunoEstaAtivo === "function" &&
    !window.alunoEstaAtivo(alunoRep)
  ) {
    if (typeof mostrarToast === "function") {
      mostrarToast("Não é possível reagendar para aluno inativo.", "warning");
    }
    return;
  }
  window.reagendamentoDirectCardId = id;

  const modal = document.getElementById("modalReagendarAula");
  if (!modal) return;
  document.getElementById("containerSeletorReagendarAluno").style.display =
    "none";
  document.getElementById("containerLockReagendarAluno").style.display =
    "block";

  const aluno = window.getAluno(rep.alunoId);
  document.getElementById("reagendarAlunoLockedNome").textContent = aluno
    ? aluno.nome
    : "Aluno";
  document.getElementById("reagendarAlunoIdLocked").value = rep.alunoId;
  const diaTexto = window.getDiaTextoSelecionado();
  document.getElementById("reagendarDia").value = diaTexto;

  const selectInicio = document.getElementById("reagendarHoraInicio");
  const optionsHtml = HORARIOS.map(
    (h) => `<option value="${h}">${h}</option>`,
  ).join("");
  selectInicio.innerHTML = optionsHtml;
  selectInicio.value = window.horarioSelecionadoSlot || "08:00";

  document.getElementById("infoReagendamentoSlot").textContent =
    `Agendamento direto • Fila de espera`;

  modal.style.display = "flex";
};

window.fecharReagendarAulaModal = function () {
  const modal = document.getElementById("modalReagendarAula");
  if (modal) {
    modal.style.display = "none";
  }
  window.reagendamentoDirectCardId = null;
};

// ── Painel de Reposições Pendentes ────────────────────────────────────────────────────────────

window.togglePainelReposicoes = function () {
  const painel = document.getElementById("painelReposicoesPendentes");
  if (painel.style.display === "none") {
    painel.style.display = "block";
    window.renderizarListaReposicoes();
  } else {
    painel.style.display = "none";
  }
};

window.renderizarListaReposicoes = function () {
  const container = document.getElementById("listaReposicoesPendentes");
  if (!container) return;

  // Dirty-check: skip the DOM write if the list is unchanged.
  const _chaveAtual = (function () {
    try {
      return JSON.stringify(aulasParaRepor);
    } catch (_) {
      return null;
    }
  })();
  if (_chaveAtual !== null && _chaveAtual === _ultimaChaveRenderReposicoes)
    return;
  _ultimaChaveRenderReposicoes = _chaveAtual;

  if (!aulasParaRepor || aulasParaRepor.length === 0) {
    container.innerHTML = `<p style="font-size: 0.8rem; color: #666; text-align: center; padding: 10px;">Sem reposições pendentes.</p>`;
    return;
  }
  container.innerHTML = aulasParaRepor
    .map((rep) => {
      const aluno = window.getAluno(rep.alunoId);
      return `
            <div class="aluno-card" style="border-left-color: #FF5252; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: #222;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="display: block; color: #FFF; font-size: 0.9rem;">${aluno ? aluno.nome : "Aluno"}</strong>
                        <span style="font-size: 0.72rem; color: #FF5252; font-weight: 600;">Cancelada em ${rep.dataCancelamento}</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="iniciarReagendamentoReposicao('${rep.id}')" style="background: #FFD700; color: #0D0D0D; font-size: 0.7rem; border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-calendar-check"></i> Reagendar
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
};

window.executarExclusaoInstancia = function () {
  const compromisso = window.obterCompromissoSelecionado
    ? window.obterCompromissoSelecionado()
    : null;
  if (!compromisso) return;
  if (compromissoTemAlunoInativo(compromisso)) {
    alert("Aluno inativo: não é possível cancelar este compromisso.");
    return;
  }

  const dataAlvoStr =
    window.dataAlvoAcaoStr ||
    window.dataSelecionada.toLocaleDateString("pt-BR");
  const mensagemConfirmacao = dataAlvoStr
    ? `Excluir a aula de ${dataAlvoStr}?\n\nSó este dia sai da agenda — a série continua nos outros dias. Nada será enviado para reposição nem cobrado.`
    : "Excluir esta aula?\n\nSó este dia sai da agenda — a série continua nos outros dias. Nada será enviado para reposição nem cobrado.";
  if (!confirm(mensagemConfirmacao)) return;

  const _snapshot = {
    ...compromisso,
    excecoes: [...(compromisso.excecoes || [])],
  };
  if (!compromisso.excecoes) compromisso.excecoes = [];
  if (!compromisso.excecoes.includes(dataAlvoStr)) {
    compromisso.excecoes.push(dataAlvoStr);
  }
  window.log.info("[agenda]", "Instância cancelada", {
    id: compromisso.id,
    dataExcecao: dataAlvoStr,
  });
  window.log.info("[reposicao]", "Exceção adicionada ao agendamento", {
    id: compromisso.id,
    data: dataAlvoStr,
  });

  const toastMensagem = dataAlvoStr
    ? `✅ Aula de ${dataAlvoStr} excluída. A série continua nos outros dias.`
    : "✅ Aula excluída. A série continua nos outros dias.";

  window.fecharModalAcaoSlot();

  const _posDeletar = async () => {
    await window.inicializarHome({ sincronizar: true });
    if (typeof mostrarToast === "function") mostrarToast(toastMensagem);
  };

  if (
    typeof window.salvarEventoComGCal === "function" &&
    window.gcal &&
    window.gcal.isSignedIn()
  ) {
    window
      .salvarEventoComGCal(compromisso, {
        operacao: "atualizar",
        snapshotAnterior: _snapshot,
      })
      .then(_posDeletar);
  } else {
    if (typeof salvarDados === "function") salvarDados();
    _posDeletar();
  }
};

window.executarExclusaoSerie = async function () {
  const _serieDeletar = window.obterCompromissoSelecionado
    ? window.obterCompromissoSelecionado()
    : null;
  if (compromissoTemAlunoInativo(_serieDeletar)) {
    alert("Aluno inativo: não é possível cancelar esta série.");
    return;
  }
  const _resumoExclusao = window.montarResumoExclusaoCadeiaSerie(
    _serieDeletar || window.idCompromissoSelecionado,
  );
  const mensagemConfirmacaoSerie =
    _resumoExclusao.total > 0
      ? `Excluir ${_resumoExclusao.total} aulas desta série?\n\n${_resumoExclusao.mensagem}. Reposições continuam preservadas no app.`
      : "Nenhuma aula desta série pode ser removida porque todas são reposições e continuam preservadas.";
  if (!confirm(mensagemConfirmacaoSerie)) return;
  if (_resumoExclusao.total === 0) {
    window.log.info("[agenda]", "Série excluída", {
      id: _serieDeletar && _serieDeletar.id ? _serieDeletar.id : null,
      ocorrenciasAfetadas: 0,
      reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
    });
    return;
  }

  if (_serieDeletar && _serieDeletar.serieOrigemId) {
    const _continuar = confirm(
      "Esta série é uma continuação de uma série histórica anterior.\n\n" +
        "Ao excluí-la, a série histórica anterior também será removida porque a exclusão sobe até a origem da cadeia.\n\n" +
        "Deseja excluir esta série e a cadeia histórica relacionada?",
    );
    if (!_continuar) return;
  }

  const ocorrenciasAfetadas = window.removerCadeiaCompletaSerie(
    _serieDeletar || window.idCompromissoSelecionado,
  );
  window.log.info("[agenda]", "Série excluída", {
    id: _serieDeletar && _serieDeletar.id ? _serieDeletar.id : null,
    ocorrenciasAfetadas: ocorrenciasAfetadas,
    reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
  });
  window.fecharModalAcaoSlot();
  if (
    _serieDeletar &&
    typeof window.salvarEventoComGCal === "function" &&
    window.gcal &&
    window.gcal.isSignedIn()
  ) {
    window
      .salvarEventoComGCal(_serieDeletar, {
        operacao: "excluir",
        snapshotAnterior: _serieDeletar,
      })
      .then(async () => {
        await window.inicializarHome({ sincronizar: true });
        if (typeof mostrarToast === "function")
          mostrarToast("✅ Série excluída — todas as ocorrências.");
      });
  } else {
    if (typeof salvarDados === "function") salvarDados();
    await window.inicializarHome({ sincronizar: true });
    if (typeof mostrarToast === "function")
      mostrarToast("✅ Série excluída — todas as ocorrências.");
  }
};

window.executarExclusaoDefinitiva = async function () {
  const _compDeletar = window.obterCompromissoSelecionado
    ? window.obterCompromissoSelecionado()
    : null;
  if (compromissoTemAlunoInativo(_compDeletar)) {
    alert(
      "Aluno inativo: não é possível cancelar ou excluir este compromisso.",
    );
    return;
  }
  const dataParaTexto =
    window.dataAlvoAcaoStr ||
    (_compDeletar && _compDeletar.data) ||
    (window.getDataSelecionadaPtBr ? window.getDataSelecionadaPtBr() : "") ||
    "";
  const mensagemConfirmacao = dataParaTexto
    ? `Excluir a aula de ${dataParaTexto}?\n\nEla será removida da agenda. Nada será enviado para reposição nem cobrado.`
    : "Excluir esta aula?\n\nEla será removida da agenda. Nada será enviado para reposição nem cobrado.";
  if (!confirm(mensagemConfirmacao)) return;
  const _idxDeletar = aulas.findIndex(
    (a) => a.id === window.idCompromissoSelecionado,
  );
  if (_idxDeletar !== -1) aulas.splice(_idxDeletar, 1);
  const toastMensagem = dataParaTexto
    ? `✅ Aula de ${dataParaTexto} excluída.`
    : "✅ Aula excluída.";
  window.fecharModalAcaoSlot();
  if (
    _compDeletar &&
    typeof window.salvarEventoComGCal === "function" &&
    window.gcal &&
    window.gcal.isSignedIn()
  ) {
    window
      .salvarEventoComGCal(_compDeletar, {
        operacao: "excluir",
        snapshotAnterior: _compDeletar,
      })
      .then(async () => {
        await window.inicializarHome({ sincronizar: true });
        if (typeof mostrarToast === "function") mostrarToast(toastMensagem);
      });
  } else {
    if (typeof salvarDados === "function") salvarDados();
    await window.inicializarHome({ sincronizar: true });
    if (typeof mostrarToast === "function") mostrarToast(toastMensagem);
  }
};

window.abrirModalEscolhaExclusao = function (opcoes, contexto) {
  const modal = document.getElementById("modalEscolhaExclusao");
  const container = document.getElementById("modalEscolhaExclusaoLista");
  const titulo = document.getElementById("tituloModalEscolhaExclusao");
  const info = document.getElementById("infoEscolhaExclusao");
  const badge = document.getElementById("badgeModalEscolhaExclusao");
  if (!modal || !container) return;

  if (titulo) {
    titulo.innerHTML = '<i class="fa-solid fa-trash-can"></i> Excluir';
  }

  const compromisso =
    contexto && contexto.compromisso
      ? contexto.compromisso
      : window.obterCompromissoSelecionado
        ? window.obterCompromissoSelecionado()
        : null;

  if (info && compromisso) {
    const nomeAluno = compromisso.alunoNome || compromisso.aluno || "Aluno";
    const dia = compromisso.data || compromisso.dataInicio || "esta data";
    const horario = compromisso.horario || compromisso.horarioInicio || "--:--";
    info.textContent = `${nomeAluno} · ${dia} · ${horario}`;
  }

  if (badge) {
    if (compromisso && compromisso.frequencia && compromisso.frequencia !== "uma_vez") {
      badge.textContent = "∞ SEMANAL";
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }

  container.innerHTML = "";
  (Array.isArray(opcoes) ? opcoes : []).forEach((opcao) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "btn btn-primary modal-escolha-opcao";
    const iconeClasse =
      opcao.acao === "instancia"
        ? "modal-escolha-icone-exclusao-leve"
        : opcao.acao === "daqui"
          ? "modal-escolha-icone-exclusao-media"
          : "modal-escolha-icone-exclusao-total";
    const icone =
      opcao.acao === "instancia"
        ? "fa-calendar-xmark"
        : opcao.acao === "daqui"
          ? "fa-scissors"
          : "fa-trash-can";

    item.innerHTML = `
      <span class="modal-escolha-icone ${iconeClasse}">
        <i class="fa-solid ${icone}"></i>
      </span>
      <div class="modal-escolha-texto">
        <strong>${opcao.titulo || "Ação"}</strong>
        <span>${opcao.detalhe || ""}</span>
      </div>
    `;

    item.addEventListener("click", () => {
      window.fecharModalEscolhaExclusao();

      if (opcao.acao === "instancia") {
        window.executarExclusaoInstancia();
        return;
      }

      if (opcao.acao === "daqui") {
        const dataAlvo =
          window.dataAlvoAcaoStr ||
          (compromisso && compromisso.data) ||
          (window.getDataSelecionadaPtBr ? window.getDataSelecionadaPtBr() : "") ||
          "";
        const previsao = window.aparaCadeiaSerieAPartirDe(compromisso, dataAlvo, {
          simular: true,
        });
        const texto =
          previsao.reposicoesPreservadas > 0
            ? `Excluir daqui pra frente?\n\n${previsao.aparadas} aulas serão aparadas, ${previsao.removidas} removidas e ${previsao.reposicoesPreservadas} reposição(ões) será(ão) mantida(s).`
            : `Excluir daqui pra frente?\n\n${previsao.aparadas} aulas serão aparadas e ${previsao.removidas} removidas.`;
        if (!window.confirm(texto)) return;
        window.aparaCadeiaSerieAPartirDe(compromisso, dataAlvo);
        if (typeof salvarDados === "function") salvarDados();
        if (typeof window.inicializarHome === "function") {
          window.inicializarHome({ sincronizar: true });
        }
        window.fecharModalAcaoSlot();
        return;
      }

      if (opcao.acao === "serie") {
        window.executarExclusaoSerie();
      }
    });
    container.appendChild(item);
  });

  modal.style.display = "flex";
};

window.fecharModalEscolhaExclusao = function () {
  const modal = document.getElementById("modalEscolhaExclusao");
  if (modal) modal.style.display = "none";
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  window.configurarEscopoRecorrenciaEdicao();

  const btnExcluirSlot = document.getElementById("btnExcluirSlot");
  if (btnExcluirSlot) {
    btnExcluirSlot.addEventListener("click", () => {
      const compromisso = obterCompromissoSelecionado();
      const dataAlvo =
        window.dataAlvoAcaoStr ||
        (compromisso && compromisso.data) ||
        (window.getDataSelecionadaPtBr ? window.getDataSelecionadaPtBr() : "") ||
        "";
      const opcoes = window.montarOpcoesExclusaoSlot(compromisso, dataAlvo);

      if (!Array.isArray(opcoes) || opcoes.length === 0) return;
      if (opcoes.length === 1) {
        if (compromisso && compromisso.frequencia === "uma_vez") {
          window.executarExclusaoDefinitiva();
        } else {
          window.executarExclusaoInstancia();
        }
        return;
      }

      window.abrirModalEscolhaExclusao(opcoes);
    });
  }

  const formReagendarAula = document.getElementById("formReagendarAula");
  if (formReagendarAula) {
    formReagendarAula.addEventListener("submit", async (e) => {
      e.preventDefault();

      let alunoId = "";
      let repObj = null;

      if (window.reagendamentoDirectCardId) {
        repObj = aulasParaRepor.find(
          (r) => r.id === window.reagendamentoDirectCardId,
        );
        if (!repObj) {
          if (typeof mostrarToast === "function") {
            mostrarToast(
              "Reposição pendente não encontrada para este aluno.",
              "error",
            );
          } else {
            alert("Reposição pendente não encontrada para este aluno.");
          }
          return;
        }
        alunoId = repObj.alunoId;
      } else {
        alunoId = document.getElementById("reagendarAluno").value;
        if (!alunoId) {
          alert("Selecione um aluno para agendar a reposição.");
          return;
        }
        repObj = aulasParaRepor.find((r) => r.alunoId === alunoId);
        if (!repObj) {
          if (typeof mostrarToast === "function") {
            mostrarToast(
              "Não existe reposição pendente para este aluno.",
              "error",
            );
          } else {
            alert("Não existe reposição pendente para este aluno.");
          }
          return;
        }
      }

      const nomeDiaSelecionado = document.getElementById("reagendarDia").value;
      const hInicio = document.getElementById("reagendarHoraInicio").value;
      const duracao = document.getElementById("reagendarDuracao").value;
      const hFim = window.somarMinutos(hInicio, duracao);
      const alunoAgendamento =
        typeof window.getAluno === "function" ? window.getAluno(alunoId) : null;
      if (
        typeof window.alunoEstaAtivo === "function" &&
        !window.alunoEstaAtivo(alunoAgendamento)
      ) {
        alert("Não é possível agendar reposição para aluno inativo.");
        return;
      }

      const diaAtualIndex = window.dataSelecionada
        ? window.dataSelecionada.getDay()
        : 0;
      const nomesDias = window.getNomesDiasSemana
        ? window.getNomesDiasSemana()
        : [
            "Domingo",
            "Segunda",
            "Terça",
            "Quarta",
            "Quinta",
            "Sexta",
            "Sábado",
          ];
      const diaSelecionadoIndex = nomesDias.indexOf(nomeDiaSelecionado);
      const dataBase = new Date(window.dataSelecionada || new Date());
      const deslocamento = (diaSelecionadoIndex - diaAtualIndex + 7) % 7;
      dataBase.setDate(dataBase.getDate() + deslocamento);
      const dataSelecionadaISO = window.formatarDataLocalParaISODate(dataBase);

      let novoCompromisso = {
        id: `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        dia: nomeDiaSelecionado,
        data: dataSelecionadaISO,
        horarioInicio: hInicio,
        horarioFim: hFim,
        tipo: "aula",
        alunoId: alunoId,
        frequencia: "uma_vez",
        isReposicao: true,
        reagendada: true,
        reposicaoId: repObj.id,
      };

      try {
        aulas.push(novoCompromisso);
        const salvar =
          typeof window.salvarDados === "function"
            ? window.salvarDados
            : salvarDados;
        const resultadoPersistencia =
          typeof salvar === "function"
            ? await salvar(true)
            : { ok: false, motivo: "falha_remota" };
        if (!deveEnviarPatchReposicao(resultadoPersistencia)) {
          throw new Error(
            obterMensagemFalhaPersistencia(resultadoPersistencia),
          );
        }

        const respostaPatch = await window.apiFetchBackend(
          `${window.APP_API_CONFIG.apiBaseUrl}/reposicoes/${encodeURIComponent(repObj.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "agendada",
              agendamentoReposicaoId: novoCompromisso.id,
            }),
          },
        );

        if (!respostaPatch.ok) {
          const erroPatch = await respostaPatch.json().catch(() => ({}));
          throw new Error(
            erroPatch.error || "Falha ao vincular a reposição ao agendamento.",
          );
        }

        let avisoGCal = "";
        if (
          typeof window.salvarEventoComGCal === "function" &&
          window.gcal &&
          window.gcal.isSignedIn()
        ) {
          try {
            await window.salvarEventoComGCal(novoCompromisso, {
              operacao: "criar",
            });
          } catch (erroGCal) {
            window.log.error(
              "[reposicao]",
              "Falha ao sincronizar reposição no Google Calendar",
              erroGCal,
            );
            avisoGCal =
              " Reposição salva, mas não foi possível sincronizar com Google Agenda.";
          }
        }

        aulasParaRepor = aulasParaRepor.filter((r) => r.id !== repObj.id);
        window.fecharReagendarAulaModal();
        if (typeof window.enriquecerAgendamentoComDadosFrescos === "function") {
          window.enriquecerAgendamentoComDadosFrescos(novoCompromisso);
        }
        if (typeof window.carregarDados === "function") {
          await window.carregarDados({
            forcarRemoto: true,
            silenciosoUI: true,
          });
        }
        window.inicializarHome();

        let mensagemPrazo = "";
        try {
          const patchJson = await respostaPatch.clone().json();
          if (patchJson && patchJson.validoAte) {
            mensagemPrazo = ` Prazo: até ${window.formatarDataPtBr ? window.formatarDataPtBr(patchJson.validoAte) : patchJson.validoAte}.`;
          }
        } catch (_) {}
        if (typeof mostrarToast === "function") {
          const mensagemSucesso = `✅ Reposição reagendada com sucesso!${mensagemPrazo}`;
          if (avisoGCal) {
            mostrarToast(`${mensagemSucesso}${avisoGCal}`, "warning");
          } else {
            mostrarToast(mensagemSucesso);
          }
        }
      } catch (erro) {
        if (typeof mostrarToast === "function") {
          mostrarToast(
            erro && erro.message
              ? erro.message
              : "Falha ao reagendar reposição.",
            "error",
          );
        } else {
          alert(
            erro && erro.message
              ? erro.message
              : "Falha ao reagendar reposição.",
          );
        }
      }
    });
  }

  const formEditar = document.getElementById("formEditarCompromisso");
  if (formEditar) {
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (_submissaoEdicaoEmAndamento) {
        return;
      }

      _submissaoEdicaoEmAndamento = true;
      atualizarEstadoSubmitEdicao(true);

      try {
        const compromisso = obterCompromissoSelecionado();
        if (!compromisso) return;
        if (compromissoTemAlunoInativo(compromisso)) {
          alert(
            "Aluno inativo: compromisso disponível somente para visualização.",
          );
          return;
        }
        // [TAG-GCAL] Snapshot antes da mutação para revert se MongoDB falhar
        const _snapshotEdicao = {
          ...compromisso,
          excecoes: [...(compromisso.excecoes || [])],
        };
        // Captura nova ocorrência avulsa criada no escopo 'occurrence' para GCal sync duplo
        let _novaOcorrenciaSerie = null;
        // Captura nova série criada no escopo 'fromDate' para GCal sync duplo
        let _novaSerieSplit = null;

        const tipo = compromisso.tipo || "aula";
        const diaInteiro =
          tipo === "bloqueio" &&
          document.getElementById("editBloqueioDiaInteiro")?.checked;
        const hInicio = diaInteiro
          ? window.BLOQUEIO_DIA_INTEIRO_INICIO
          : document.getElementById("editHoraInicio").value;
        const duracaoMinutos = diaInteiro
          ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
          : parseInt(document.getElementById("editDuracao").value, 10);
        const hFim = diaInteiro
          ? window.BLOQUEIO_DIA_INTEIRO_FIM
          : window.somarMinutos(hInicio, duracaoMinutos);
        const freq = document.getElementById("editCompromissoFrequencia").value;
        const escopoRecorrencia =
          document.getElementById("editEscopoRecorrencia")?.value || "fromDate";
        const dataAlvoStr =
          window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();

        if (!diaInteiro && hInicio >= hFim) {
          alert("O horário de término deve ser posterior ao início!");
          return;
        }
        if (
          tipo === "bloqueio" &&
          !diaInteiro &&
          duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS
        ) {
          alert(
            "Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.",
          );
          return;
        }
        if (
          (tipo === "aula" || tipo === "deslocamento") &&
          duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO
        ) {
          alert("Aulas e deslocamentos podem ter no máximo 2h.");
          return;
        }

        const candidato = window.getCompromissoSerializadoParaConflito(
          {
            ...compromisso,
            horarioInicio: hInicio,
            horarioFim: hFim,
            fullDay: diaInteiro,
          },
          dataAlvoStr,
        );

        if (freq === "semanal") {
          if (escopoRecorrencia === "occurrence") {
            const iso = window.converterPtBrParaISO(dataAlvoStr);
            if (!iso) {
              alert("Não foi possível identificar a data da aula.");
              return;
            }
            const data = new Date(`${iso}T12:00:00`);
            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
            const conflitos = window.getConflitosNoDia(candidato, data, {
              ignorarIds: familiaIgnorarIds,
            });
            if (conflitos.length > 0) {
              alert(
                `Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`,
              );
              return;
            }

            if (!Array.isArray(compromisso.excecoes)) compromisso.excecoes = [];
            if (!Array.isArray(compromisso.excecoesDetalhadas))
              compromisso.excecoesDetalhadas = [];
            if (!compromisso.excecoes.includes(dataAlvoStr))
              compromisso.excecoes.push(dataAlvoStr);

            const novoId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            // Determina o dia da semana correto da ocorrência clicada (não o primeiro dia da série)
            const _isoOcorrencia = window.converterPtBrParaISO(dataAlvoStr);
            const _idxOcorrencia = _isoOcorrencia
              ? new Date(_isoOcorrencia + "T12:00:00").getDay()
              : -1;
            const _nomesDiasOcorrencia = obterNomesDiasSemanaModalAcao();
            const _diaOcorrencia =
              _idxOcorrencia >= 0
                ? _nomesDiasOcorrencia[_idxOcorrencia]
                : compromisso.dia || "Segunda";
            const novoCompromisso = {
              ...compromisso,
              id: novoId,
              frequencia: "uma_vez",
              data: dataAlvoStr,
              dia: _diaOcorrencia,
              horarioInicio: hInicio,
              horarioFim: hFim,
              fullDay: diaInteiro,
              excecoes: [],
              excecoesDetalhadas: [],
              serieOrigemId: compromisso.id,
              googleCalendarEventId: null, // novo evento — não herdar o ID da série
            };
            delete novoCompromisso.tipoRecorrencia;
            delete novoCompromisso.diasSemana;
            delete novoCompromisso.intervaloRecorrencia;
            delete novoCompromisso.recorrenciaEscopo;
            delete novoCompromisso.recorrenciaDataInicio;
            delete novoCompromisso.recorrenciaFimCondicao;
            delete novoCompromisso.recorrenciaDataFim;
            delete novoCompromisso.recorrenciaQuantidadeOcorrencias;
            aulas.push(novoCompromisso);
            _novaOcorrenciaSerie = novoCompromisso;
          } else if (escopoRecorrencia === "entireSeries") {
            const datas = window.getDatasConflitoRecorrencia(candidato, 20);
            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
            const conflitos = window.getConflitosRecorrenciaEmDatas(
              candidato,
              datas,
              { ignorarIds: familiaIgnorarIds },
            );
            if (conflitos.length > 0) {
              const resumo = window.gerarResumoConflitosDatas(conflitos, 5);
              alert(`Não foi possível salvar. Existem conflitos em: ${resumo}.`);
              return;
            }

            compromisso.horarioInicio = hInicio;
            compromisso.horarioFim = hFim;
            compromisso.fullDay = diaInteiro;
            compromisso.recorrenciaEscopo = escopoRecorrencia;
            // Não altera recorrenciaDataInicio — GCal deve manter o DTSTART original

            // Atualiza diasSemana se o dia da semana foi alterado
            const _selDiaEs = document.getElementById("editDiaSemana").value;
            const _isoAlvoEs = window.converterPtBrParaISO(dataAlvoStr);
            const _idxAlvoEs = _isoAlvoEs
              ? new Date(_isoAlvoEs + "T12:00:00").getDay()
              : -1;
            const _nomesDiasEs = obterNomesDiasSemanaModalAcao();
            const _diaClicadoEs =
              _idxAlvoEs >= 0 ? _nomesDiasEs[_idxAlvoEs] : compromisso.dia;
            if (
              _diaClicadoEs &&
              _selDiaEs &&
              _diaClicadoEs !== _selDiaEs &&
              Array.isArray(compromisso.diasSemana)
            ) {
              compromisso.diasSemana = compromisso.diasSemana.map((d) =>
                d === _diaClicadoEs ? _selDiaEs : d,
              );
            }
          } else if (escopoRecorrencia === "fromDate") {
            // Calcula o dia anterior à data clicada para UNTIL da série original
            const _isoAlvoFd = window.converterPtBrParaISO(dataAlvoStr);
            const _dtAlvoFd = new Date(_isoAlvoFd + "T12:00:00");
            _dtAlvoFd.setDate(_dtAlvoFd.getDate() - 1);
            const _isoAnteriorFd =
              _dtAlvoFd.getFullYear() +
              "-" +
              String(_dtAlvoFd.getMonth() + 1).padStart(2, "0") +
              "-" +
              String(_dtAlvoFd.getDate()).padStart(2, "0");
            const _ptBrAnteriorFd = _isoAnteriorFd.split("-").reverse().join("/");

            // Determina o dia clicado e o novo dia selecionado pelo usuário
            const _selDiaFd = document.getElementById("editDiaSemana").value;
            const _idxAlvoFd = _isoAlvoFd
              ? new Date(_isoAlvoFd + "T12:00:00").getDay()
              : -1;
            const _nomesDiasFd = obterNomesDiasSemanaModalAcao();
            const _diaClicadoFd =
              _idxAlvoFd >= 0 ? _nomesDiasFd[_idxAlvoFd] : compromisso.dia;
            const _diasSemanaNova = Array.isArray(compromisso.diasSemana)
              ? compromisso.diasSemana.map((d) =>
                  _diaClicadoFd && d === _diaClicadoFd ? _selDiaFd : d,
                )
              : compromisso.diasSemana;

            // Verifica conflitos para a nova série
            const _candidatoFd = window.getCompromissoSerializadoParaConflito(
              Object.assign({}, compromisso, {
                data: dataAlvoStr,
                recorrenciaDataInicio: dataAlvoStr,
                diasSemana: _diasSemanaNova,
                dia: _selDiaFd,
                horarioInicio: hInicio,
                horarioFim: hFim,
              }),
              dataAlvoStr,
            );
            const _datasFd = window.getDatasConflitoRecorrencia(_candidatoFd, 20);
            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
            const _conflitosFd = window.getConflitosRecorrenciaEmDatas(
              _candidatoFd,
              _datasFd,
              { ignorarIds: familiaIgnorarIds },
            );
            if (_conflitosFd.length > 0) {
              const _resumoFd = window.gerarResumoConflitosDatas(_conflitosFd, 5);
              alert(
                `Não foi possível salvar. Existem conflitos em: ${_resumoFd}.`,
              );
              return;
            }

            const _recorrenciaDataFimOriginalFd = compromisso.recorrenciaDataFim;
            const _recorrenciaFimCondicaoOriginalFd = compromisso.recorrenciaFimCondicao;
            const _recorrenciaQuantidadeOcorrenciasOriginalFd =
              compromisso.recorrenciaQuantidadeOcorrencias;
            const _recorrenciaDataInicioOriginalFd =
              compromisso.recorrenciaDataInicio || compromisso.data || compromisso.dataCriacao;
            const _compromissoOriginalParaCalculoFd = {
              ...compromisso,
              recorrenciaFimCondicao: _recorrenciaFimCondicaoOriginalFd,
              recorrenciaDataFim: _recorrenciaDataFimOriginalFd,
              recorrenciaQuantidadeOcorrencias: _recorrenciaQuantidadeOcorrenciasOriginalFd,
            };

            // Encerra a série original um dia antes da data clicada
            compromisso.recorrenciaFimCondicao = "untilDate";
            compromisso.recorrenciaDataFim = _ptBrAnteriorFd;
            // Não altera horário nem diasSemana da série original — as mudanças ficam na nova série

            const _dataInicioEfeitoFd = window.parseDataFlex(
              compromisso.recorrenciaDataInicio || compromisso.data || compromisso.dataCriacao,
            );
            const _dataFimRecorrenciaFd = window.parseDataFlex(compromisso.recorrenciaDataFim);
            const _serieOriginalVaziaFd = (() => {
              if (!_dataInicioEfeitoFd || !_dataFimRecorrenciaFd) {
                return false;
              }

              if (_dataFimRecorrenciaFd < _dataInicioEfeitoFd) {
                return true;
              }

              const _cursorInicioVaziaFd = new Date(_dataInicioEfeitoFd);
              const _cursorFimVaziaFd = new Date(_dataFimRecorrenciaFd);

              for (
                let _cursorVaziaFd = new Date(_cursorInicioVaziaFd);
                _cursorVaziaFd <= _cursorFimVaziaFd;
                _cursorVaziaFd.setDate(_cursorVaziaFd.getDate() + 1)
              ) {
                if (
                  window.checarCompromissoNaData(
                    compromisso,
                    new Date(
                      _cursorVaziaFd.getFullYear(),
                      _cursorVaziaFd.getMonth(),
                      _cursorVaziaFd.getDate(),
                    ),
                  )
                ) {
                  return false;
                }
              }

              return true;
            })();

            if (_serieOriginalVaziaFd) {
              const _indiceSerieOriginalFd = aulas.findIndex(
                (item) => item && item.id === compromisso.id,
              );
              if (_indiceSerieOriginalFd >= 0) {
                aulas.splice(_indiceSerieOriginalFd, 1);
              }
            }

            const _dataCorteExcecoesFd = window.parseDataFlex(dataAlvoStr);
            const _filtrarExcecoesAposData = (lista) => {
              if (!Array.isArray(lista) || lista.length === 0) return [];
              if (!_dataCorteExcecoesFd) return [...lista];

              return lista.filter((item) => {
                const valorData =
                  typeof item === "string"
                    ? item
                    : item &&
                      (item.data ||
                        item.dataISO ||
                        item.dataIso ||
                        item.dataOriginal ||
                        item.iso ||
                        item.dataExcecao);

                if (!valorData) return true;
                const dataValor = window.parseDataFlex(valorData);
                return !dataValor || dataValor >= _dataCorteExcecoesFd;
              });
            };

            const _fimEfetivoRecorrenciaOriginalFd = (() => {
              if (_recorrenciaFimCondicaoOriginalFd === "untilDate") {
                return _recorrenciaDataFimOriginalFd || null;
              }

              const _quantidadeOcorrenciasOriginalFd = Number(
                _recorrenciaQuantidadeOcorrenciasOriginalFd,
              );
              if (
                !Number.isFinite(_quantidadeOcorrenciasOriginalFd) ||
                _quantidadeOcorrenciasOriginalFd <= 0 ||
                !_recorrenciaDataInicioOriginalFd
              ) {
                return null;
              }

              const _dataInicioRecorrenciaOriginalFd = window.parseDataFlex(
                _recorrenciaDataInicioOriginalFd,
              );
              if (!_dataInicioRecorrenciaOriginalFd) {
                return null;
              }

              const _limiteDiasFimEfetivoFd = Math.min(
                370,
                Math.max(1, _quantidadeOcorrenciasOriginalFd * 2),
              );
              let _contadorOcorrenciasOriginalFd = 0;
              const _cursorInicioFimEfetivoFd = new Date(_dataInicioRecorrenciaOriginalFd);

              for (
                let _indiceDiaFimEfetivoFd = 0;
                _indiceDiaFimEfetivoFd < _limiteDiasFimEfetivoFd;
                _indiceDiaFimEfetivoFd += 1
              ) {
                const _dataAtualFimEfetivoFd = new Date(
                  _cursorInicioFimEfetivoFd.getFullYear(),
                  _cursorInicioFimEfetivoFd.getMonth(),
                  _cursorInicioFimEfetivoFd.getDate(),
                );

                if (
                  window.checarCompromissoNaData(
                    _compromissoOriginalParaCalculoFd,
                    _dataAtualFimEfetivoFd,
                  )
                ) {
                  _contadorOcorrenciasOriginalFd += 1;
                  if (_contadorOcorrenciasOriginalFd === _quantidadeOcorrenciasOriginalFd) {
                    return [
                      String(_dataAtualFimEfetivoFd.getDate()).padStart(2, "0"),
                      String(_dataAtualFimEfetivoFd.getMonth() + 1).padStart(2, "0"),
                      String(_dataAtualFimEfetivoFd.getFullYear()),
                    ].join("/");
                  }
                }

                _cursorInicioFimEfetivoFd.setDate(_cursorInicioFimEfetivoFd.getDate() + 1);
              }

              return null;
            })();

            // Cria nova série a partir da data clicada
            const _novoIdFd = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const _novaSerieFd = Object.assign({}, compromisso, {
              id: _novoIdFd,
              data: dataAlvoStr,
              recorrenciaDataInicio: dataAlvoStr,
              horarioInicio: hInicio,
              horarioFim: hFim,
              fullDay: diaInteiro,
              dia: _selDiaFd,
              diasSemana: _diasSemanaNova,
              googleCalendarEventId: null,
              excecoes: _filtrarExcecoesAposData(compromisso.excecoes),
              excecoesDetalhadas: _filtrarExcecoesAposData(compromisso.excecoesDetalhadas),
              serieOrigemId: compromisso.id,
              recorrenciaEscopo: "fromDate",
            });
            const _deveHerdarFimOriginalFd =
              Boolean(_fimEfetivoRecorrenciaOriginalFd) &&
              _dataCorteExcecoesFd &&
              window.parseDataFlex(_fimEfetivoRecorrenciaOriginalFd) >= _dataCorteExcecoesFd &&
              ["untilDate", "occurrences"].includes(_recorrenciaFimCondicaoOriginalFd);

            delete _novaSerieFd.recorrenciaQuantidadeOcorrencias;
            if (_deveHerdarFimOriginalFd) {
              _novaSerieFd.recorrenciaFimCondicao = "untilDate";
              _novaSerieFd.recorrenciaDataFim = _fimEfetivoRecorrenciaOriginalFd;
            } else {
              delete _novaSerieFd.recorrenciaFimCondicao;
              delete _novaSerieFd.recorrenciaDataFim;
            }
            aulas.push(_novaSerieFd);
            _novaSerieSplit = _novaSerieFd;
          } else {
            // monthOfDate e outros escopos futuros
            const datas = window.getDatasConflitoRecorrencia(candidato, 20);
            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
            const conflitos = window.getConflitosRecorrenciaEmDatas(
              candidato,
              datas,
              { ignorarIds: familiaIgnorarIds },
            );
            if (conflitos.length > 0) {
              const resumo = window.gerarResumoConflitosDatas(conflitos, 5);
              alert(`Não foi possível salvar. Existem conflitos em: ${resumo}.`);
              return;
            }
            compromisso.horarioInicio = hInicio;
            compromisso.horarioFim = hFim;
            compromisso.fullDay = diaInteiro;
            compromisso.recorrenciaEscopo = escopoRecorrencia;
            compromisso.recorrenciaDataInicio = dataAlvoStr;
            if (escopoRecorrencia === "monthOfDate") {
              compromisso.dataCriacao = new Date(
                `${window.converterPtBrParaISO(dataAlvoStr)}T12:00:00`,
              ).toISOString();
            }
          }
        } else {
          const iso = window.converterPtBrParaISO(dataAlvoStr);
          if (iso) {
            const data = new Date(`${iso}T12:00:00`);
            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
            const conflitos = window.getConflitosNoDia(candidato, data, {
              ignorarIds: familiaIgnorarIds,
            });
            if (conflitos.length > 0) {
              alert(
                `Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`,
              );
              return;
            }
          }
          compromisso.horarioInicio = hInicio;
          compromisso.horarioFim = hFim;
          compromisso.fullDay = diaInteiro;
        }

        if (
          freq === "semanal" &&
          escopoRecorrencia !== "occurrence" &&
          escopoRecorrencia !== "fromDate"
        ) {
          compromisso.dia = document.getElementById("editDiaSemana").value;
          delete compromisso.data;
        }

        if (tipo === "bloqueio") {
          compromisso.descricao = document
            .getElementById("editDescricao")
            .value.trim();
          if (!diaInteiro) delete compromisso.fullDay;
        }

        if (freq === "semanal") {
          const escopoLog =
            escopoRecorrencia === "occurrence"
              ? "instancia"
              : escopoRecorrencia === "entireSeries"
                ? "serie"
                : "split";
          window.log.info("[agenda]", "Edição de série aplicada", {
            id: compromisso.id,
            escopo: escopoLog,
            data: dataAlvoStr,
          });
        }

        window.fecharModalAcaoSlot();

        // [TAG-FRESH-DATA-BEFORE-SAVE] Enriquece agendamento com dados frescos do aluno antes de salvar
        if (typeof window.enriquecerAgendamentoComDadosFrescos === "function") {
          window.enriquecerAgendamentoComDadosFrescos(compromisso);
        }

        if (
          typeof window.salvarEventoComGCal === "function" &&
          window.gcal &&
          window.gcal.isSignedIn()
        ) {
          await window.salvarEventoComGCal(compromisso, {
            operacao: "atualizar",
            snapshotAnterior: _snapshotEdicao,
          });
          if (_novaOcorrenciaSerie) {
            // occurrence: depois de adicionar EXDATE na série, cria o evento avulso com novo horário
            await window.salvarEventoComGCal(_novaOcorrenciaSerie, {
              operacao: "criar",
            });
          } else if (_novaSerieSplit) {
            // fromDate: termina série original com UNTIL, depois cria nova série a partir da data clicada
            await window.salvarEventoComGCal(_novaSerieSplit, { operacao: "criar" });
          }
          // Optimistic UI in salvarEventoComGCal already rendered the result — no inicializarHome needed.
        } else {
          if (typeof salvarDados === "function") await salvarDados();
          if (typeof window.inicializarHome === "function") {
            await window.inicializarHome();
          }
          if (typeof mostrarToast === "function")
            mostrarToast("✅ Alterações salvas com sucesso!");
        }
      } finally {
        _submissaoEdicaoEmAndamento = false;
        atualizarEstadoSubmitEdicao(false);
      }
    });
  }

  const inputEditHora = document.getElementById("editHoraInicio");
  const inputEditDuracao = document.getElementById("editDuracao");
  if (inputEditHora)
    inputEditHora.addEventListener("change", () =>
      window.atualizarAvisoConflitoEdicao(),
    );
  if (inputEditDuracao)
    inputEditDuracao.addEventListener("change", () =>
      window.atualizarAvisoConflitoEdicao(),
    );
  const checkEditDiaInteiro = document.getElementById("editBloqueioDiaInteiro");
  if (checkEditDiaInteiro)
    checkEditDiaInteiro.addEventListener("change", () =>
      window.atualizarEstadoBloqueioDiaInteiroEdicao(),
    );

  const btnMandarReposicao = document.getElementById("btnMandarParaReposicao");
  if (btnMandarReposicao) {
    btnMandarReposicao.addEventListener("click", () => {
      const compromisso = obterCompromissoSelecionado();
      if (!compromisso) return;
      if (compromissoTemAlunoInativo(compromisso)) {
        alert(
          "Aluno inativo: não é possível enviar este compromisso para reposição.",
        );
        return;
      }

      const dataAlvo = compromisso.data || window.getDataSelecionadaPtBr();
      const dataAlvoISO = window.normalizarDataParaISO(dataAlvo);
      window.abrirModalEscolhaCobrancaReposicao(
        compromisso,
        async (cobravel) => {
          try {
            const reposicao = await enviarParaReposicao(
              compromisso,
              dataAlvoISO,
              cobravel,
            );
            const _idxReposicao = aulas.findIndex(
              (a) => a.id === window.idCompromissoSelecionado,
            );
            if (_idxReposicao !== -1) aulas.splice(_idxReposicao, 1);
            window.fecharModalAcaoSlot();

            if (
              typeof window.salvarEventoComGCal === "function" &&
              window.gcal &&
              window.gcal.isSignedIn()
            ) {
              await window.salvarEventoComGCal(compromisso, {
                operacao: "excluir",
                snapshotAnterior: compromisso,
              });
            } else {
              if (typeof salvarDados === "function") salvarDados();
            }

            if (typeof window.carregarDados === "function") {
              await window.carregarDados({
                forcarRemoto: true,
                silenciosoUI: true,
              });
            }
            window.inicializarHome();
            if (typeof mostrarToast === "function") {
              mostrarToast("✅ Aula enviada para reposição.", "success");
            }
            return reposicao;
          } catch (erro) {
            if (typeof mostrarToast === "function") {
              mostrarToast(
                erro && erro.message
                  ? erro.message
                  : "Falha ao enviar para reposição.",
                "error",
              );
            } else {
              alert(
                erro && erro.message
                  ? erro.message
                  : "Falha ao enviar para reposição.",
              );
            }
            return null;
          }
        },
      );
    });
  }

});
