// [TAG-VIEW-HOME] view-home.js
// Responsabilidade: View da aba Home — agenda diária, dashboard de stats e navegação de datas
// Depende de: state.js (aulas, aulasParaRepor, agendaConfig, HORARIOS), storage.js (carregarDados, salvarDados, atualizarLimitesGrade),
//             utils-datetime.js (getDiaTextoSelecionado), alunos-helpers.js (window.getAluno), calendario-engine.js (checarCompromissoNaData),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso),
//             modal-agendamento.js (abrirEscolhaTipoModal), modal-acao-slot.js (abrirModalAcaoSlot, renderizarListaReposicoes, inicializarMultiSelectPills)
// Expõe: window.dataSelecionada, window.dataAlvoAcaoStr, window.horarioSelecionadoSlot,
//         window.reagendamentoDirectCardId, window.__sincronizacaoInicialConcluida,
//         window.__homeCarregando, window.renderizarLoadingHome,
//         window.inicializarHome, window.atualizarDataAtual, window.atualizarDashboardStats,
//         window.renderizarAgendaDia

// ── Estado global da view ─────────────────────────────────────────────────────────────────────

window.dataSelecionada = window.dataSelecionada || new Date();
window.dataAlvoAcaoStr = null;
window.horarioSelecionadoSlot = null;
window.reagendamentoDirectCardId = null;
window.modoHomeAtivo = window.modoHomeAtivo || 'semana';
window.__sincronizacaoInicialConcluida =
  window.__sincronizacaoInicialConcluida || false;
window.__homeCarregando = window.__homeCarregando || false;

// Dirty-check key for renderizarAgendaDia.
// Set to null by window.invalidarChaveRenderAgenda() to force a re-render on next call.
let _ultimaChaveRenderAgenda = Object.create(null);

const DIAS_DA_SEMANA = typeof window.getNomesDiasSemana === 'function'
  ? window.getNomesDiasSemana()
  : ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function formatarNomeDiaHome(nomeDiaBase) {
  if (!nomeDiaBase) return "";
  const nome = String(nomeDiaBase).trim();
  const nomeLower = nome.toLowerCase();
  if (nomeLower === "domingo" || nomeLower === "domingo-feira") return "Domingo";
  if (nomeLower === "sábado" || nomeLower === "sabado" || nomeLower === "sábado-feira" || nomeLower === "sabado-feira") return "Sábado";
  return nome.includes("-feira") ? nome : `${nome}-feira`;
}

// ── Loading State ─────────────────────────────────────────────────────────────────────────────

window.renderizarLoadingHome = function () {
  const elAulasHoje = document.getElementById("totalAulasHoje");
  const elAulasRepor = document.getElementById("totalAulasRepor");
  const elementoSemana = document.getElementById("periodoSemanaHomeLabel");
  const grid = document.getElementById("calendarioSemanalHomeGrid");

  if (elementoSemana) {
    elementoSemana.textContent = "Sincronizando agenda...";
  }
  if (elAulasHoje) elAulasHoje.textContent = "...";
  if (elAulasRepor) elAulasRepor.textContent = "...";
  // Only replace with skeleton if the weekly grid is genuinely empty (no rendered content yet).
  // Skipping when content already exists prevents wiping a valid render, which would cause a
  // visible flicker before the real data renders.
  if (grid && grid.children.length === 0) {
    grid.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; opacity: 0.55; pointer-events: none;">
                <div style="height: 112px; border-radius: 12px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 255, 255, 0.02)); border: 1px solid #2a2a2a;"></div>
                <div style="height: 112px; border-radius: 12px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 255, 255, 0.02)); border: 1px solid #2a2a2a;"></div>
                <div style="height: 112px; border-radius: 12px; background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 255, 255, 0.02)); border: 1px solid #2a2a2a;"></div>
            </div>
        `;
  }
};

function garantirHomeTabs() {
  const homeMain = document.getElementById('tela-home');
  if (!homeMain || document.getElementById('homeDayPanel')) return;

  const stickyHeader = homeMain.querySelector('.home-sticky-header');
  const weeklyGridPanel = homeMain.querySelector('.agenda-panel-semana');
  const footer = homeMain.querySelector('.home-app-resumo');
  const existingTabs = homeMain.querySelector('.home-sticky-header .tab-tipo-agendamento');

  if (!existingTabs) {
    const tabsWrapper = document.createElement('div');
    tabsWrapper.id = 'homeTabsWrapper';
    tabsWrapper.style.marginBottom = '14px';
    tabsWrapper.innerHTML = `
      <div class="tab-tipo-agendamento" style="display:flex;gap:6px;background:#0d0d0d;padding:4px;border-radius:8px;border:1px solid #2a2a2a;">
        <button type="button" class="tab-btn active" id="tabHomeSemana" onclick="window.alternarModoHome('semana')"><i class="fa-solid fa-calendar-week"></i> Semana</button>
        <button type="button" class="tab-btn" id="tabHomeDia" onclick="window.alternarModoHome('dia')"><i class="fa-solid fa-calendar-day"></i> Dia</button>
      </div>
    `;

    if (stickyHeader) {
      stickyHeader.insertBefore(tabsWrapper, stickyHeader.firstChild);
    } else {
      homeMain.insertBefore(tabsWrapper, homeMain.firstChild);
    }
  }

  // Cria a barra de navegação do Dia dentro da topbar sticky (mesma posição da toolbar da Semana).
  const dayNavRow = document.createElement('div');
  dayNavRow.id = 'homeDayNavRow';
  dayNavRow.className = 'home-weekly-toolbar';
  dayNavRow.style.display = 'none';
  dayNavRow.innerHTML = `
    <div class="home-weekly-nav-row">
      <div class="nav-calendario nav-calendario--home nav-calendario--week-home">
        <div class="nav-calendario-main">
          <button id="btnHomeDiaAnterior" class="btn btn-secondary btn-sm" title="Dia Anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <span id="dataAtualHome" class="home-weekly-periodo">Carregando...</span>
          <button id="btnHomeDiaProximo" class="btn btn-secondary btn-sm" title="Próximo Dia"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <button id="btnHomeDiaHoje" class="btn btn-secondary btn-sm btn-calendario-hoje">Hoje</button>
      </div>
    </div>
    <div class="home-weekly-nav-row" style="justify-content:flex-end;margin-top:6px">
      <div style="display:flex;gap:8px">
        <button id="btnHomeDiaNovaAgenda" class="btn-config-icon" title="Novo Agendamento">
          <i class="fa-solid fa-calendar-plus" style="color:#ffd700"></i>
        </button>
        <button id="btnHomeDiaConfigAgenda" class="btn-config-icon" title="Configurar Grade Horária">
          <i class="fa-solid fa-gear fa-spin-hover" style="color:#ffd700"></i>
        </button>
      </div>
    </div>
  `;
  if (stickyHeader) stickyHeader.appendChild(dayNavRow);
  else homeMain.appendChild(dayNavRow);

  const dayPanel = document.createElement('div');
  dayPanel.id = 'homeDayPanel';
  dayPanel.className = 'agenda-panel';
  dayPanel.style.display = 'none';
  dayPanel.innerHTML = `<div class="agenda-dia-container" id="agendaGridHomeHome"></div>`;

  if (weeklyGridPanel) {
    weeklyGridPanel.parentNode.insertBefore(dayPanel, weeklyGridPanel.nextSibling);
  } else {
    homeMain.appendChild(dayPanel);
  }

  const bindOnce = (selector, handler) => {
    const el = document.querySelector(selector);
    if (el && !el.__homeBound) {
      el.addEventListener('click', handler);
      el.__homeBound = true;
    }
  };

  bindOnce('#btnHomeDiaAnterior', () => {
    window.dataSelecionada.setDate(window.dataSelecionada.getDate() - 1);
    window.renderizarHomeDia();
    if (typeof window.animarTrocaPeriodo === 'function') window.animarTrocaPeriodo(document.getElementById('agendaGridHomeHome'), 'volta');
  });
  bindOnce('#btnHomeDiaProximo', () => {
    window.dataSelecionada.setDate(window.dataSelecionada.getDate() + 1);
    window.renderizarHomeDia();
    if (typeof window.animarTrocaPeriodo === 'function') window.animarTrocaPeriodo(document.getElementById('agendaGridHomeHome'), 'avanca');
  });
  bindOnce('#btnHomeDiaHoje', () => {
    window.dataSelecionada = new Date();
    window.renderizarHomeDia();
    if (typeof window.animarTrocaPeriodo === 'function') window.animarTrocaPeriodo(document.getElementById('agendaGridHomeHome'), 'avanca');
  });
  bindOnce('#btnHomeDiaConfigAgenda', () => {
    window.abrirModalConfigAgenda();
  });
  bindOnce('#btnHomeDiaNovaAgenda', () => {
    if (typeof window.abrirNovoAgendamento === 'function') {
      const horaInicioHome = agendaConfig && typeof agendaConfig.horaInicio === "number"
        ? agendaConfig.horaInicio
        : 8;
      window.abrirNovoAgendamento({
        dataSelecionada: new Date(window.dataSelecionada),
        hora: `${String(horaInicioHome).padStart(2, '0')}:00`
      });
    }
  });

  const painelDia = document.getElementById('homeDayPanel');
  if (painelDia && typeof window.ativarSwipePeriodo === 'function' && painelDia.dataset.swipeAtivo !== 'true') {
    painelDia.dataset.swipeAtivo = 'true';
    window.ativarSwipePeriodo(painelDia, {
      aoAvancar: function () {
        window.dataSelecionada.setDate(window.dataSelecionada.getDate() + 1);
        window.renderizarHomeDia();
        if (typeof window.animarTrocaPeriodo === 'function') window.animarTrocaPeriodo(document.getElementById('agendaGridHomeHome'), 'avanca');
      },
      aoVoltar: function () {
        window.dataSelecionada.setDate(window.dataSelecionada.getDate() - 1);
        window.renderizarHomeDia();
        if (typeof window.animarTrocaPeriodo === 'function') window.animarTrocaPeriodo(document.getElementById('agendaGridHomeHome'), 'volta');
      }
    });
  }
}

window.renderizarHomeDia = function () {
  window.atualizarDataAtual('dataAtualHome', 'diaSemanaAtualHome');
  window.renderizarAgendaDia('agendaGridHomeHome');
};

window.alternarModoHome = function (modo) {
  window.modoHomeAtivo = modo === 'dia' ? 'dia' : 'semana';
  garantirHomeTabs();

  const semBtn = document.getElementById('tabHomeSemana');
  const diaBtn = document.getElementById('tabHomeDia');
  const weekToolbar = document.querySelector('.home-weekly-toolbar');
  const weekGridPanel = document.querySelector('.agenda-panel-semana');
  const dayPanel = document.getElementById('homeDayPanel');
  const btnNova = document.getElementById('btnNovaAgendaSemanal');
  const footer = document.querySelector('.home-app-resumo');

  if (semBtn) semBtn.classList.toggle('active', window.modoHomeAtivo === 'semana');
  if (diaBtn) diaBtn.classList.toggle('active', window.modoHomeAtivo === 'dia');
  if (weekToolbar) weekToolbar.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  const dayNavRow = document.getElementById('homeDayNavRow');
  if (dayNavRow) dayNavRow.style.display = window.modoHomeAtivo === 'dia' ? '' : 'none';
  if (weekGridPanel) weekGridPanel.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  if (btnNova) btnNova.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  if (footer) footer.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  if (dayPanel) dayPanel.style.display = window.modoHomeAtivo === 'dia' ? '' : 'none';

  if (window.modoHomeAtivo === 'semana') {
    window.renderizarHomeSemana();
  } else {
    window.renderizarHomeDia();
  }
};

// ── Inicialização da Home ─────────────────────────────────────────────────────────────────────

// ── Internal helpers for inicializarHome ─────────────────────────────────────────────────────

async function _sincronizarDadosHome(opcoes) {
  const deveMostrarLoading =
    opcoes.sincronizar === true ||
    typeof window.temDadosLocaisNoCache !== "function" ||
    !window.temDadosLocaisNoCache();

  if (deveMostrarLoading) {
    window.__homeCarregando = true;
    window.renderizarLoadingHome();
  }

  try {
    if (typeof carregarDados === "function") {
      await carregarDados({
        forcarRender: false,
        forcarRemoto: opcoes.sincronizar === true,
      });
    }
    window.__sincronizacaoInicialConcluida = true;
  } finally {
    if (deveMostrarLoading) {
      window.__homeCarregando = false;
    }
  }
}

function _renderizarHome(opcoes) {
  window.atualizarDashboardStats();
  if (typeof window.renderizarHomeSemana === "function") {
    window.renderizarHomeSemana();
  }
  window.renderizarListaReposicoes();
  window.inicializarMultiSelectPills();
}

window.inicializarHome = async function (opcoes = {}) {
  if (!agendaConfig) agendaConfig = { horaInicio: 7, horaFim: 21 };
  if (!aulasParaRepor) aulasParaRepor = [];

  // Sync only when explicitly requested (sincronizar: true) or on first load.
  // Navigation buttons call inicializarHome() with no args — once __sincronizacaoInicialConcluida
  // is true they skip this block entirely and go straight to the render path.
  const deveSincronizar =
    opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;

  if (deveSincronizar) {
    await _sincronizarDadosHome(opcoes);
  }

  garantirHomeTabs();
  _renderizarHome(opcoes);
  window.alternarModoHome(window.modoHomeAtivo || 'semana');
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────────────────────

window.atualizarDataAtual = function (dataId, diaId) {
  const elementoData = document.getElementById(dataId || "dataAtual");
  const elementoDiaSemana = document.getElementById(diaId || "diaSemanaAtual");
  if (!elementoData) return;
  const dia = String(window.dataSelecionada.getDate()).padStart(2, "0");
  const mes = String(window.dataSelecionada.getMonth() + 1).padStart(2, "0");
  const nomeDiaBase = DIAS_DA_SEMANA[window.dataSelecionada.getDay()];
  const nomeDia = formatarNomeDiaHome(nomeDiaBase);

  elementoData.innerHTML = `
    <span class="agenda-data-linha-topo">
      <i class="fa-solid fa-calendar-minus" aria-hidden="true"></i>
      <span class="agenda-data-dia-topo">${nomeDia}</span>
      <span class="agenda-data-data-topo">(${dia}/${mes})</span>
    </span>
    <span class="agenda-data-dia-mobile">(${dia}/${mes})</span>
  `;
  if (elementoDiaSemana) elementoDiaSemana.textContent = nomeDia;
};

window.atualizarDashboardStats = function () {
  const elAulasHoje = document.getElementById("totalAulasHoje");
  const elAulasRepor = document.getElementById("totalAulasRepor");

  if (elAulasHoje && typeof aulas !== "undefined") {
    const aulasHoje = aulas.filter((a) => {
      if (a.tipo && a.tipo !== "aula") return false;
      return window.checarCompromissoNaData(a, window.dataSelecionada);
    });
    elAulasHoje.textContent = aulasHoje.length;
  }
  if (elAulasRepor) elAulasRepor.textContent = aulasParaRepor.length;
};

// ── Renderização da Grade Diária ──────────────────────────────────────────────────────────────

window.abrirEscolhaTipoModalPorSlotHome = function (diaTexto, horaStr, elSlot) {
  if (elSlot && elSlot.classList) {
    elSlot.classList.remove("time-grid-bg-slot-clicked");
    void elSlot.offsetWidth;
    elSlot.classList.add("time-grid-bg-slot-clicked");
    setTimeout(() => {
      elSlot.classList.remove("time-grid-bg-slot-clicked");
    }, 450);
  }

  setTimeout(() => {
    window.abrirEscolhaTipoModal(diaTexto, horaStr);
  }, 70);
};

window.renderizarAgendaDia = function (gridId) {
  const grid = document.getElementById(gridId || "agendaGridHome");
  if (!grid) return;

  const diaTexto = window.getDiaTextoSelecionado();

  const inicio = agendaConfig.horaInicio;
  const fim = agendaConfig.horaFim;
  const hourHeight = 84; // 84px por hora (confortável e espaçoso, 42px por meia hora)

  // Filtrar compromissos do dia selecionado
  const compromissosDoDia = aulas.filter((a) =>
    window.checarCompromissoNaData(a, window.dataSelecionada),
  );

  const parseHorario = (horario) => {
    if (!horario) return 0;
    const [h, m] = horario.split(":").map(Number);
    return h * 60 + m;
  };

  const obterTextoPrioritarioCompromisso = (compromisso) => {
    const tipoComp = compromisso && compromisso.tipo ? compromisso.tipo : "aula";

    if (tipoComp === "aula") {
      const alunoCompromisso =
        typeof window.getAluno === "function"
          ? window.getAluno(compromisso.alunoId)
          : null;
      return {
        principal: alunoCompromisso && alunoCompromisso.nome ? String(alunoCompromisso.nome) : "",
        secundario:
          alunoCompromisso && (alunoCompromisso.objective || alunoCompromisso.objetivo)
            ? String(alunoCompromisso.objective || alunoCompromisso.objetivo)
            : "",
        terciario:
          alunoCompromisso && alunoCompromisso.local
            ? String(alunoCompromisso.local)
            : "",
      };
    }

    if (tipoComp === "deslocamento") {
      return {
        principal: "Deslocamento",
        secundario: compromisso && compromisso.descricao ? String(compromisso.descricao) : "",
        terciario: "",
      };
    }

    if (tipoComp === "bloqueio") {
      const descricaoBloqueio = compromisso && compromisso.descricao ? String(compromisso.descricao) : "Compromisso";
      return {
        principal: descricaoBloqueio,
        secundario:
          compromisso && compromisso.source === "google_external"
            ? "Google Agenda"
            : "Bloqueio",
        terciario: "",
      };
    }

    return {
      principal: compromisso && compromisso.descricao ? String(compromisso.descricao) : "Compromisso",
      secundario: "",
      terciario: "",
    };
  };

  const REGRAS_VISUAIS_CARD_DIA = {
    larguraMinimaCardPx: 120,
    larguraMinimaUtilGradePx: 180,
    margemConteudoTituloPx: 34,
    larguraMediaGlyphPx: 7.4,
    minCaracteresTitulo: 10,
    limiteTituloLongo: 24,
    limiteCampoSecundario: 22,
    limiteTextoComposto: 58,
    limiteTituloLongoMobile: 16,
    limiteTextoPrincipalSecundarioMobile: 34,
    limiteTituloInlineStatus: 18,
    limiteCardMuitoBaixoPx: 46,
    limiteCardBaixoPx: 64,
    limiteDuracaoCurtaMin: 30,
    limiteDuracaoMediaCurtaMin: 45,
    limiteColunaMuitoEstreitaPct: 45,
    limiteColunaEstreitaPct: 60,
  };

  const larguraUtilGradePx = Math.max(
    (grid.clientWidth || window.innerWidth || 0) - 55,
    REGRAS_VISUAIS_CARD_DIA.larguraMinimaUtilGradePx,
  );

  const analisarDensidadeVisualCardDia = ({ compromisso, heightPx, duracaoMinutos, larguraPercentual, larguraEstimadaPx }) => {
    const tipoComp = compromisso && compromisso.tipo ? compromisso.tipo : "aula";
    const textos = obterTextoPrioritarioCompromisso(compromisso);
    const principal = textos.principal || "";
    const secundario = textos.secundario || "";
    const terciario = textos.terciario || "";
    const ehMobile = window.innerWidth <= 767;
    const capacidadeTitulo = Math.max(
      REGRAS_VISUAIS_CARD_DIA.minCaracteresTitulo,
      Math.floor(
        (Math.max(larguraEstimadaPx, REGRAS_VISUAIS_CARD_DIA.larguraMinimaCardPx) - REGRAS_VISUAIS_CARD_DIA.margemConteudoTituloPx) /
          REGRAS_VISUAIS_CARD_DIA.larguraMediaGlyphPx,
      ),
    );
    const tituloProvavelmenteEstourando = principal.length > capacidadeTitulo;

    const textoLongo =
      principal.length >= REGRAS_VISUAIS_CARD_DIA.limiteTituloLongo ||
      secundario.length >= REGRAS_VISUAIS_CARD_DIA.limiteCampoSecundario ||
      terciario.length >= REGRAS_VISUAIS_CARD_DIA.limiteCampoSecundario ||
      `${principal} ${secundario} ${terciario}`.length >= REGRAS_VISUAIS_CARD_DIA.limiteTextoComposto;
    const usaHeuristicaInlinePorTitulo =
      tipoComp === "deslocamento" || tipoComp === "bloqueio";

    const textoLongoMobile =
      ehMobile &&
      (principal.length >= REGRAS_VISUAIS_CARD_DIA.limiteTituloLongoMobile ||
        tituloProvavelmenteEstourando ||
        (!usaHeuristicaInlinePorTitulo && `${principal} ${secundario}`.length >= REGRAS_VISUAIS_CARD_DIA.limiteTextoPrincipalSecundarioMobile));

    const cardMuitoBaixo = heightPx <= REGRAS_VISUAIS_CARD_DIA.limiteCardMuitoBaixoPx;
    const cardBaixo = heightPx <= REGRAS_VISUAIS_CARD_DIA.limiteCardBaixoPx;
    const duracaoCurta = duracaoMinutos <= REGRAS_VISUAIS_CARD_DIA.limiteDuracaoCurtaMin;
    const duracaoMediaCurta = duracaoMinutos <= REGRAS_VISUAIS_CARD_DIA.limiteDuracaoMediaCurtaMin;
    const colunaMuitoEstreita = larguraPercentual <= REGRAS_VISUAIS_CARD_DIA.limiteColunaMuitoEstreitaPct;
    const colunaEstreita = larguraPercentual <= REGRAS_VISUAIS_CARD_DIA.limiteColunaEstreitaPct;

    const reduzirConteudoOpcionalMobile =
      ehMobile && (tituloProvavelmenteEstourando || textoLongoMobile);
    const usarBadgeInlineNoTitulo =
      ehMobile &&
      duracaoCurta &&
      !tituloProvavelmenteEstourando &&
      (usaHeuristicaInlinePorTitulo ? principal.length <= REGRAS_VISUAIS_CARD_DIA.limiteTituloInlineStatus : !textoLongoMobile);

    if (
      duracaoCurta ||
      cardMuitoBaixo ||
      colunaMuitoEstreita ||
      (ehMobile && tituloProvavelmenteEstourando && cardBaixo)
    ) {
      return {
        densidade: "tight",
        reduzirConteudoOpcionalMobile,
        usarBadgeInlineNoTitulo,
      };
    }

    if (
      duracaoMediaCurta ||
      cardBaixo ||
      colunaEstreita ||
      textoLongo ||
      textoLongoMobile ||
      tituloProvavelmenteEstourando
    ) {
      return {
        densidade: "compact",
        reduzirConteudoOpcionalMobile,
        usarBadgeInlineNoTitulo: false,
      };
    }

    return {
      densidade: "normal",
      reduzirConteudoOpcionalMobile,
      usarBadgeInlineNoTitulo: false,
    };
  };

  const inicioMinutosGrade = inicio * 60;
  const fimMinutosGrade = fim * 60;
  const totalMinutosGrade = fimMinutosGrade - inicioMinutosGrade;
  const totalHeightPixels = (totalMinutosGrade / 60) * hourHeight;

  // Filtrar compromissos que caem na nossa janela de exibição
  const eventosFiltrados = compromissosDoDia.filter((c) => {
    const cIni = parseHorario(c.horarioInicio);
    const cFim = parseHorario(c.horarioFim);
    return cIni < fimMinutosGrade && cFim > inicioMinutosGrade;
  });

  // Função de alocação de colunas para colisões
  const calcularColisoes = (eventos) => {
    const evs = eventos.map((e) => {
      const start = Math.max(parseHorario(e.horarioInicio), inicioMinutosGrade);
      const end = Math.min(parseHorario(e.horarioFim), fimMinutosGrade);
      return {
        id: e.id,
        start,
        end,
        original: e,
        col: 0,
        maxCols: 1,
      };
    });

    // Ordenar por horário de início, e os mais longos primeiro
    evs.sort(
      (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
    );

    const colunas = [];
    evs.forEach((ev) => {
      let colAlocada = 0;
      while (true) {
        const conflito = colunas[colAlocada]?.some((outro) => {
          return ev.start < outro.end && ev.end > outro.start;
        });
        if (!conflito) {
          if (!colunas[colAlocada]) colunas[colAlocada] = [];
          colunas[colAlocada].push(ev);
          ev.col = colAlocada;
          break;
        }
        colAlocada++;
      }
    });

    // Calcular maxCols para cada evento
    evs.forEach((ev) => {
      const colidindo = evs.filter((outro) => {
        return ev.start < outro.end && ev.end > outro.start;
      });
      const maxColIndex = Math.max(...colidindo.map((o) => o.col), 0);
      ev.maxCols = maxColIndex + 1;
    });

    // Propagação do maxCols para o grupo conectado
    let mudou = true;
    while (mudou) {
      mudou = false;
      evs.forEach((ev) => {
        evs.forEach((outro) => {
          if (ev.start < outro.end && ev.end > outro.start) {
            const maxComum = Math.max(ev.maxCols, outro.maxCols);
            if (ev.maxCols !== maxComum) {
              ev.maxCols = maxComum;
              mudou = true;
            }
            if (outro.maxCols !== maxComum) {
              outro.maxCols = maxComum;
              mudou = true;
            }
          }
        });
      });
    }

    return evs;
  };

  const eventosPosicionados = calcularColisoes(eventosFiltrados);

  // Gerar o HTML
  let htmlHours = "";
  let htmlGridLines = "";
  let htmlBgSlots = "";

  // 1. Gerar as linhas horizontais de hora cheia e as labels de horário
  for (let h = inicio; h <= fim; h++) {
    const horaStr = `${String(h).padStart(2, "0")}:00`;
    const topPos = (h - inicio) * hourHeight;

    // Label do horário
    htmlHours += `
            <div class="time-grid-hour-label" style="position: absolute; top: ${topPos}px; width: 100%;">
                ${horaStr}
            </div>
        `;

    if (h < fim) {
      // Linha cheia
      htmlGridLines += `
                <div class="time-grid-line" style="position: absolute; top: ${topPos}px; left: 0; right: 0; height: 1px;"></div>
            `;

      // Meia hora pontilhada
      const topHalfPos = topPos + hourHeight / 2;
      htmlGridLines += `
                <div class="time-grid-line-half" style="position: absolute; top: ${topHalfPos}px; left: 0; right: 0; height: 1px;"></div>
            `;
    } else {
      // Linha de fim da grade
      htmlGridLines += `
                <div class="time-grid-line-end" style="position: absolute; top: ${topPos}px; left: 0; right: 0; height: 1px;"></div>
            `;
    }
  }

  // 2. Gerar os slots clicáveis para novos agendamentos (a cada 30 minutos)
  const totalSlotsMeiaHora = (fim - inicio) * 2;
  for (let s = 0; s < totalSlotsMeiaHora; s++) {
    const totalMinutosAcumulados = s * 30;
    const minutosAtuais = inicioMinutosGrade + totalMinutosAcumulados;
    const h = Math.floor(minutosAtuais / 60);
    const m = minutosAtuais % 60;
    const horaStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const topPos = s * (hourHeight / 2);
    const heightSlot = hourHeight / 2;

    htmlBgSlots += `
            <div class="time-grid-bg-slot"
                 style="position: absolute; top: ${topPos}px; left: 0; right: 0; height: ${heightSlot}px;"
                 onclick="window.abrirEscolhaTipoModalPorSlotHome('${diaTexto}', '${horaStr}', this)"
                 title="Toque para agendar em ${horaStr}">
                 <span class="time-grid-bg-slot-text">
                    <i class="fa-regular fa-calendar-plus" style="color: #FFD700;"></i> Agendar ${horaStr}
                 </span>
            </div>
        `;
  }

  // 3. Gerar os cards dos eventos posicionados
  let htmlEvents = "";
  eventosPosicionados.forEach((ev) => {
    const compromisso = ev.original;
    const bloqueioDiaInteiro =
      window.ehBloqueioDiaInteiroCompromisso(compromisso);

    const topPos = ((ev.start - inicioMinutosGrade) / 60) * hourHeight;
    const heightPos = ((ev.end - ev.start) / 60) * hourHeight;

    // Posicionamento horizontal dinâmico por colisões
    const widthPercent = 100 / ev.maxCols;
    const leftPercent = ev.col * widthPercent;
    const duracaoMinutos = ev.end - ev.start;

    // Margem de segurança de layout
    const gapRight = 4;
    const larguraCardEstimadaPx =
      Math.max(
        REGRAS_VISUAIS_CARD_DIA.larguraMinimaCardPx,
        (larguraUtilGradePx * widthPercent) / 100 - gapRight,
      );

    const analiseDensidadeVisual = analisarDensidadeVisualCardDia({
      compromisso,
      heightPx: heightPos,
      duracaoMinutos,
      larguraPercentual: widthPercent,
      larguraEstimadaPx: larguraCardEstimadaPx,
    });

    const widthStyle = `calc(${widthPercent}% - ${gapRight}px)`;
    const leftStyle = `${leftPercent}%`;

    htmlEvents += window.criarCardAgendamento(compromisso, {
      dataReferencia: new Date(window.dataSelecionada),
      bloqueioDiaInteiro: bloqueioDiaInteiro,
      visualContext: "calendar-day",
      visualDensity: analiseDensidadeVisual.densidade,
      visualHideOptionalMobile: analiseDensidadeVisual.reduzirConteudoOpcionalMobile,
      visualInlineStatusBadge: analiseDensidadeVisual.usarBadgeInlineNoTitulo,
      style: `position: absolute; top: ${topPos}px; height: ${heightPos}px; left: ${leftStyle}; width: ${widthStyle};`,
      onclick: `abrirModalAcaoSlot('${compromisso.id}')`,
    });
  });

  // 4. Indicador de Horário Atual
  let htmlNowIndicator = "";
  const agora = new Date();
  const ehHoje = window.dataSelecionada.toDateString() === agora.toDateString();
  if (ehHoje) {
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    if (agoraMinutos >= inicioMinutosGrade && agoraMinutos < fimMinutosGrade) {
      const topIndicatorPos =
        ((agoraMinutos - inicioMinutosGrade) / 60) * hourHeight;
      htmlNowIndicator = `
                <div class="time-grid-now-indicator" style="position: absolute; top: ${topIndicatorPos}px; left: 0; right: 0; height: 2px;">
                    <div class="time-grid-now-dot"></div>
                    <div class="time-grid-now-line"></div>
                </div>
            `;
    }
  }

  // Unificar tudo no wrapper da grade de tempo
  const wrapperHtml = `
        <div class="time-grid-wrapper" style="height: ${totalHeightPixels}px;">
            <div class="time-grid-hours-col">
                ${htmlHours}
            </div>
            <div class="time-grid-content-col" style="position: relative; height: 100%;">
                <div class="time-grid-lines" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
                    ${htmlGridLines}
                </div>
                <div class="time-grid-bg-slots" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
                    ${htmlBgSlots}
                </div>
                <div class="time-grid-events" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;">
                    ${htmlEvents}
                </div>
                ${htmlNowIndicator}
            </div>
        </div>
    `;

  // Dirty-check: skip DOM update if date, grid config, and event data are all unchanged.
  // Uses JSON.stringify for a full deep comparison — any field change (time, title, status, etc.)
  // will produce a different key and trigger a re-render.
  // Defensive fallback: if JSON.stringify throws for any reason, novaChave is null
  // and the render always runs unconditionally.
  const chaveGridAgenda = grid.id || "agendaGridHome";
  const _novaChaveAgenda = (function () {
    try {
      return (
        chaveGridAgenda +
        "|" +
        window.dataSelecionada.toDateString() +
        "|" +
        (agendaConfig ? agendaConfig.horaInicio + "-" + agendaConfig.horaFim : "") +
        "|" +
        JSON.stringify(compromissosDoDia)
      );
    } catch (_) {
      return null;
    }
  })();
  if (
    _novaChaveAgenda !== null &&
    _ultimaChaveRenderAgenda[chaveGridAgenda] === _novaChaveAgenda
  ) return;
  _ultimaChaveRenderAgenda[chaveGridAgenda] = _novaChaveAgenda;

  grid.innerHTML = wrapperHtml;

  // Scroll inteligente para o horário atual
  if (ehHoje) {
    const wrapperElement = document.querySelector(".time-grid-wrapper");
    const nowIndicator = document.querySelector(".time-grid-now-indicator");
    if (wrapperElement && nowIndicator) {
      const containerElement = grid;
      if (containerElement) {
        const topIndicator = nowIndicator.offsetTop;
        containerElement.scrollTop = topIndicator - 150;
      }
    }
  }
};

// Exposed so other modules can force a re-render on the next renderizarAgendaDia call,
// for example after Optimistic UI mutations or calendar config changes.
window.invalidarChaveRenderAgenda = function () {
  _ultimaChaveRenderAgenda = Object.create(null);
};

window.abrirModalConfigAgenda = function () {
  const selectInicio = document.getElementById("configHoraInicio");
  const selectFim = document.getElementById("configHoraFim");
  const modal = document.getElementById("modalConfigAgenda");
  if (!selectInicio || !selectFim || !modal) return;

  selectInicio.value = agendaConfig.horaInicio;
  selectFim.value = agendaConfig.horaFim;
  modal.style.display = "flex";
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("btnFecharConfig")) {
    document.getElementById("btnFecharConfig").addEventListener("click", () => {
      document.getElementById("modalConfigAgenda").style.display = "none";
    });
  }

  if (document.getElementById("formConfigAgenda")) {
    document
      .getElementById("formConfigAgenda")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        const inicio = parseInt(
          document.getElementById("configHoraInicio").value,
        );
        const fim = parseInt(document.getElementById("configHoraFim").value);
        if (inicio >= fim) {
          alert("Início deve ser menor que o fim!");
          return;
        }
        agendaConfig.horaInicio = inicio;
        agendaConfig.horaFim = fim;
        if (typeof atualizarLimitesGrade === "function") {
          atualizarLimitesGrade({
            inicio: `${inicio.toString().padStart(2, "0")}:00`,
            fim: `${fim.toString().padStart(2, "0")}:00`,
          });
        }
        if (typeof salvarDados === "function") salvarDados();
        document.getElementById("modalConfigAgenda").style.display = "none";
        window.inicializarHome();
      });
  }
});
