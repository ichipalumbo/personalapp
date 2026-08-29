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

  if (escopo === "occurrence") {
    const iso = window.converterPtBrParaISO(dataAlvoStr);
    if (!iso) return;
    const data = new Date(`${iso}T12:00:00`);
    const conflitos = window.getConflitosNoDia(candidato, data, {
      ignorarIds: [compromisso.id],
    });
    if (conflitos.length > 0) {
      impacto.textContent = `Conflito detectado em ${window.formatarDataPtBrLegivel(dataAlvoStr)}.`;
    }
    return;
  }

  const datas = window.getDatasConflitoRecorrencia(candidato, 16);
  const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, {
    ignorarIds: [compromisso.id],
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

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  window.configurarEscopoRecorrenciaEdicao();

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
            const conflitos = window.getConflitosNoDia(candidato, data, {
              ignorarIds: [compromisso.id],
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
              googleCalendarEventId: null, // novo evento — não herdar o ID da série
            };
            aulas.push(novoCompromisso);
            _novaOcorrenciaSerie = novoCompromisso;
          } else if (escopoRecorrencia === "entireSeries") {
            const datas = window.getDatasConflitoRecorrencia(candidato, 20);
            const conflitos = window.getConflitosRecorrenciaEmDatas(
              candidato,
              datas,
              { ignorarIds: [compromisso.id] },
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
            const _conflitosFd = window.getConflitosRecorrenciaEmDatas(
              _candidatoFd,
              _datasFd,
              { ignorarIds: [compromisso.id] },
            );
            if (_conflitosFd.length > 0) {
              const _resumoFd = window.gerarResumoConflitosDatas(_conflitosFd, 5);
              alert(
                `Não foi possível salvar. Existem conflitos em: ${_resumoFd}.`,
              );
              return;
            }

            // Encerra a série original um dia antes da data clicada
            compromisso.recorrenciaFimCondicao = "untilDate";
            compromisso.recorrenciaDataFim = _ptBrAnteriorFd;
            // Não altera horário nem diasSemana da série original — as mudanças ficam na nova série

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
              excecoes: [],
              excecoesDetalhadas: [],
              serieOrigemId: compromisso.id,
              recorrenciaEscopo: "fromDate",
            });
            // Nova série não tem prazo de término — remove campos de encerramento herdados
            delete _novaSerieFd.recorrenciaFimCondicao;
            delete _novaSerieFd.recorrenciaDataFim;
            aulas.push(_novaSerieFd);
            _novaSerieSplit = _novaSerieFd;
          } else {
            // monthOfDate e outros escopos futuros
            const datas = window.getDatasConflitoRecorrencia(candidato, 20);
            const conflitos = window.getConflitosRecorrenciaEmDatas(
              candidato,
              datas,
              { ignorarIds: [compromisso.id] },
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
            const conflitos = window.getConflitosNoDia(candidato, data, {
              ignorarIds: [compromisso.id],
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

  // ── Ações sobre Slots ─────────────────────────────────────────────────────────────────────
  const btnDeletar = document.getElementById("btnDeletarDefinitivo");
  if (btnDeletar) {
    btnDeletar.addEventListener("click", async () => {
      const _compDeletar = obterCompromissoSelecionado();
      if (compromissoTemAlunoInativo(_compDeletar)) {
        alert(
          "Aluno inativo: não é possível cancelar ou excluir este compromisso.",
        );
        return;
      }
      const dataParaTexto =
        window.dataAlvoAcaoStr ||
        (_compDeletar && _compDeletar.data) ||
        (window.getDataSelecionadaPtBr
          ? window.getDataSelecionadaPtBr()
          : "") ||
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
    });
  }

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

  const btnDeletarInstancia = document.getElementById("btnDeletarInstancia");
  if (btnDeletarInstancia) {
    btnDeletarInstancia.addEventListener("click", () => {
      const compromisso = obterCompromissoSelecionado();
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
    });
  }

  const btnReagendarInstancia = document.getElementById(
    "btnReagendarInstancia",
  );
  if (btnReagendarInstancia) {
    btnReagendarInstancia.addEventListener("click", () => {
      const compromisso = obterCompromissoSelecionado();
      if (!compromisso) return;
      if (compromissoTemAlunoInativo(compromisso)) {
        alert(
          "Aluno inativo: não é possível enviar este compromisso para reposição.",
        );
        return;
      }

      const dataAlvoStr =
        window.dataAlvoAcaoStr ||
        window.dataSelecionada.toLocaleDateString("pt-BR");
      const _snapshot = {
        ...compromisso,
        excecoes: [...(compromisso.excecoes || [])],
      };
      let _mutouExcecoes = false;

      window.abrirModalEscolhaCobrancaReposicao(
        compromisso,
        async (cobravel) => {
          try {
            const reposicao = await enviarParaReposicao(
              compromisso,
              dataAlvoStr,
              cobravel,
            );
            if (!reposicao || !reposicao.id) {
              throw new Error("Reposição não foi criada no servidor.");
            }

            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
              compromisso.excecoes.push(dataAlvoStr);
              _mutouExcecoes = true;
            }

            window.fecharModalAcaoSlot();
            const resultadoPersistencia =
              typeof salvarDados === "function"
                ? await salvarDados(true)
                : { ok: false, motivo: "falha_remota" };
            if (!deveEnviarPatchReposicao(resultadoPersistencia)) {
              throw new Error(
                obterMensagemFalhaPersistencia(resultadoPersistencia),
              );
            }
            if (typeof window.carregarDados === "function") {
              await window.carregarDados({
                forcarRemoto: true,
                silenciosoUI: true,
              });
            }
            window.inicializarHome();

            let mensagemPrazo = "";
            if (reposicao && reposicao.validoAte) {
              mensagemPrazo = ` Prazo: até ${window.formatarDataPtBr ? window.formatarDataPtBr(reposicao.validoAte) : reposicao.validoAte}.`;
            }
            if (typeof mostrarToast === "function") {
              mostrarToast(`✅ Aula enviada para reposição.${mensagemPrazo}`);
            }
            return reposicao;
          } catch (erro) {
            if (_mutouExcecoes) {
              compromisso.excecoes = [...(_snapshot.excecoes || [])];
            }
            window.log.warn("[reposicao]", "Rollback disparado", {
              id: compromisso.id,
              motivo:
                erro && erro.message
                  ? erro.message
                  : "falha_reagendamento_reposicao",
            });
            // Reposição remota permanece criada no servidor; o rollback reverte somente a aula na agenda local.
            if (typeof mostrarToast === "function") {
              mostrarToast(
                erro && erro.message
                  ? erro.message
                  : "Falha ao reagendar a reposição.",
                "error",
              );
            } else {
              alert(
                erro && erro.message
                  ? erro.message
                  : "Falha ao reagendar a reposição.",
              );
            }
            return null;
          }
        },
      );
    });
  }

  const btnDeletarSerie = document.getElementById("btnDeletarSerie");
  if (btnDeletarSerie) {
    btnDeletarSerie.addEventListener("click", async () => {
      const _serieDeletar = obterCompromissoSelecionado();
      if (compromissoTemAlunoInativo(_serieDeletar)) {
        alert("Aluno inativo: não é possível cancelar esta série.");
        return;
      }
      const mensagemConfirmacaoSerie =
        "Excluir todas as aulas desta série?\n\nIsso remove a recorrência inteira, incluindo as aulas futuras. Nada será enviado para reposição.";
      if (!confirm(mensagemConfirmacaoSerie)) return;
      const _idxSerie = aulas.findIndex(
        (a) => a.id === window.idCompromissoSelecionado,
      );

      if (_serieDeletar && _serieDeletar.serieOrigemId) {
        const _continuar = confirm(
          "Esta série é uma continuação de uma série histórica anterior.\n\n" +
            "Ao excluí-la, a série original (períodos anteriores) continuará existindo separadamente no app. " +
            'Caso queira removê-la também, exclua manualmente a série marcada como "Recorrente".\n\n' +
            "Deseja excluir esta série de continuação?",
        );
        if (!_continuar) return;
      }

      if (_idxSerie !== -1) aulas.splice(_idxSerie, 1);
      const ocorrenciasAfetadas = Array.isArray(
        _serieDeletar && _serieDeletar.excecoesDetalhadas,
      )
        ? _serieDeletar.excecoesDetalhadas.length
        : Array.isArray(_serieDeletar && _serieDeletar.excecoes)
          ? _serieDeletar.excecoes.length
          : undefined;
      window.log.info("[agenda]", "Série excluída", {
        id: _serieDeletar && _serieDeletar.id ? _serieDeletar.id : null,
        ocorrenciasAfetadas: ocorrenciasAfetadas,
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
    });
  }
});
