// [TAG-VIEW-HOME] view-home.js
// Responsabilidade: View da aba Home — agenda diária, dashboard de stats e navegação de datas
// Depende de: state.js (aulas, aulasParaRepor, agendaConfig, HORARIOS), storage.js (carregarDados, salvarDados, atualizarLimitesGrade),
//             utils-datetime.js (getDiaTextoSelecionado), alunos-helpers.js (window.getAluno), calendario-engine.js (checarCompromissoNaData),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso),
//             modal-agendamento.js (abrirEscolhaTipoModal), modal-acao-slot.js (abrirModalAcaoSlot, inicializarMultiSelectPills)
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
  const elementoSemana = document.getElementById("periodoSemanaHomeLabel");
  const grid = document.getElementById("calendarioSemanalHomeGrid");

  if (elementoSemana) {
    elementoSemana.textContent = "Sincronizando agenda...";
  }
  if (elAulasHoje) elAulasHoje.textContent = "...";
  // Only replace with skeleton if the weekly grid is genuinely empty (no rendered content yet).
  // Skipping when content already exists prevents wiping a valid render, which would cause a
  // visible flicker before the real data renders.
  // 5.8 (Parte A): skeleton padronizado (.skeleton) + aria-busy no container da Home.
  if (grid && grid.children.length === 0) {
    const telaHome = document.getElementById("tela-home");
    if (telaHome) telaHome.setAttribute("aria-busy", "true");
    grid.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px; pointer-events: none;">
                <div class="skeleton" style="height: 112px;"></div>
                <div class="skeleton" style="height: 112px;"></div>
                <div class="skeleton" style="height: 112px;"></div>
            </div>
        `;
  }
};

function garantirHomeTabs() {
  const homeMain = document.getElementById('tela-home');
  if (!homeMain || document.getElementById('homeDayPanel')) return;

  const stickyHeader = homeMain.querySelector('.home-sticky-header');
  const weeklyGridPanel = homeMain.querySelector('.agenda-panel-semana');
  const existingTabs = homeMain.querySelector('.home-sticky-header .tab-tipo-agendamento');

  if (!existingTabs) {
    const tabsWrapper = document.createElement('div');
    tabsWrapper.id = 'homeTabsWrapper';
    tabsWrapper.style.marginBottom = '14px';
    tabsWrapper.innerHTML = `
      <div class="tab-tipo-agendamento" role="tablist" aria-label="Visualização da agenda" style="display:flex;gap:6px;background:#0d0d0d;padding:4px;border-radius:8px;border:1px solid #2a2a2a;">
        <button type="button" class="tab-btn active" id="tabHomeSemana" role="tab" aria-selected="true" aria-controls="agendaPanelSemana" onclick="window.alternarModoHome('semana')"><i class="fa-solid fa-calendar-week"></i> Semana</button>
        <button type="button" class="tab-btn" id="tabHomeDia" role="tab" aria-selected="false" aria-controls="homeDayPanel" onclick="window.alternarModoHome('dia')"><i class="fa-solid fa-calendar-day"></i> Dia</button>
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
  // Etapa 3 (Rodada 2, 2026-09-27): a 2ª linha de ações (Novo Agendamento /
  // Configurar Grade Horária) saiu daqui — o novo agendamento virou o FAB
  // dinâmico (#fabNovoHome) e o botão de grade migrou para a seção "Dados" do
  // modal Área do usuário (decisão do dono). O modo Dia fica em uma linha só,
  // como a Semana.
  dayNavRow.innerHTML = `
    <div class="home-weekly-nav-row">
      <div class="nav-calendario nav-calendario--home nav-calendario--week-home">
        <div class="nav-calendario-main">
          <button id="btnHomeDiaAnterior" class="btn btn-secondary btn-sm" title="Dia Anterior" aria-label="Dia Anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <span id="dataAtualHome" class="home-weekly-periodo">Carregando...</span>
          <button id="btnHomeDiaProximo" class="btn btn-secondary btn-sm" title="Próximo Dia" aria-label="Próximo Dia"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <button id="btnHomeDiaHoje" class="btn btn-secondary btn-sm btn-calendario-hoje">Hoje</button>
      </div>
    </div>
  `;
  if (stickyHeader) stickyHeader.appendChild(dayNavRow);
  else homeMain.appendChild(dayNavRow);

  const dayPanel = document.createElement('div');
  dayPanel.id = 'homeDayPanel';
  dayPanel.className = 'agenda-panel';
  // Etapa 7 (Cartão B, achado 4.16): painel do modo Dia — par do tabHomeDia.
  dayPanel.setAttribute('role', 'tabpanel');
  dayPanel.setAttribute('aria-labelledby', 'tabHomeDia');
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

  if (semBtn) semBtn.classList.toggle('active', window.modoHomeAtivo === 'semana');
  if (diaBtn) diaBtn.classList.toggle('active', window.modoHomeAtivo === 'dia');
  // Etapa 7 (Cartão B, achado 4.16): o estado visual (.active) não é acessível —
  // aria-selected é o que o leitor de tela anuncia.
  if (semBtn) semBtn.setAttribute('aria-selected', String(window.modoHomeAtivo === 'semana'));
  if (diaBtn) diaBtn.setAttribute('aria-selected', String(window.modoHomeAtivo === 'dia'));
  if (weekToolbar) weekToolbar.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  const dayNavRow = document.getElementById('homeDayNavRow');
  if (dayNavRow) dayNavRow.style.display = window.modoHomeAtivo === 'dia' ? '' : 'none';
  if (weekGridPanel) weekGridPanel.style.display = window.modoHomeAtivo === 'semana' ? '' : 'none';
  if (dayPanel) dayPanel.style.display = window.modoHomeAtivo === 'dia' ? '' : 'none';
  // Etapa 3 (Rodada 2): o FAB fica visível nos DOIS modos — a ação muda por
  // modo (semana abre o escopo da semana; dia abre o dia selecionado).
  window.trocarFABNovoHome();

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
      const telaHome = document.getElementById("tela-home");
      if (telaHome) telaHome.setAttribute("aria-busy", "false");
    }
  }
}

function _renderizarHome(opcoes) {
  window.atualizarDashboardStats();
  if (typeof window.renderizarHomeSemana === "function") {
    window.renderizarHomeSemana();
  }
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

  if (elAulasHoje && typeof aulas !== "undefined") {
    const aulasHoje = aulas.filter((a) => {
      if (a.tipo && a.tipo !== "aula") return false;
      return window.checarCompromissoNaData(a, window.dataSelecionada);
    });
    elAulasHoje.textContent = aulasHoje.length;
  }
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
  // Etapa 2 (Cartão B, 2026-09-26): slot de 30min alvo frequente → 48px → 96px/hora.
  // Mantém a proporção da grade (linhas, labels e cards de evento escalam juntos).
  const hourHeight = 96; // 96px por hora (confortável e espaçoso, 48px por meia hora)

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

  // Etapa 5: bloqueios de dia inteiro não entram no grafo de sobreposição:
  // ocupam o dia inteiro, então sairiam em colunas laterais e ainda
  // inflariam o maxCols da banda dos eventos reais. Saem da engine e são
  // renderizados a largura total (mesmo topPos/heightPos de sempre).
  const eventosGrade = eventosFiltrados.filter(
    (e) => !window.ehBloqueioDiaInteiroCompromisso(e)
  );
  const eventosDiaInteiro = eventosFiltrados.filter((e) =>
    window.ehBloqueioDiaInteiroCompromisso(e)
  );
  const eventosGradePosicionados = calcularColisoes(eventosGrade);
  // Bloqueios de dia inteiro entram com largura total (maxCols=1) e FORA do
  // grafo de bandas: seu start clamped ao início da grade coincidiria com o
  // de qualquer aula de manha e dispararia o fallback de colunas do dia todo.
  const eventosPosicionados = eventosGradePosicionados.concat(
    eventosDiaInteiro.map((e) => ({
      id: e.id,
      original: e,
      // Mesma lógica de clamp do motor (00:00-23:59 -> todo o horário útil).
      start: Math.max(parseHorario(e.horarioInicio), inicioMinutosGrade),
      end: Math.min(parseHorario(e.horarioFim), fimMinutosGrade),
      maxCols: 1,
      col: 0,
    }))
  );

  // Etapa 5 (2026-09-27, achado 4.12 — formato FINAL, decisão do dono com
  // o protótipo + print do Outlook): o motor de colunas (calcularColisoes)
  // segue intacto; muda a DESENHAÇÃO da banda:
  // - banda com 2 eventos: colunas proporcionais (engine) com card em
  //   formato Outlook — só o título, sem hora/chip/ícone/rodapé (tudo
  //   volta no card ao tocar); a hora se lê pela posição na timeline.
  // - banda com 3+ eventos: linhas empilhadas a largura total
  //   [hora de início + título + status] em contêiner que cobre o span da
  //   banda (list mode) — o caso extremo legível até 320px.
  // Geometria em %/px da content-col => imune a resize (não depende de
  // largura medida em tempo de render).

  // Largura REAL da coluna de conteúdo da grade: o grid tem padding 12px
  // dos dois lados, wrapper em grade de 55px, gap de 12px e border de 1px
  // — "grid.clientWidth - 55" (larguraUtilGradePx) superestima em 37px
  // (medido: 433px -> grid 359, content-col 267; 320px -> grid 326,
  // content-col 234).
  const contentColAnterior = grid.querySelector('.time-grid-content-col');
  const larguraContentColPx =
    (contentColAnterior && contentColAnterior.clientWidth > 0)
      ? contentColAnterior.clientWidth
      : (grid.clientWidth > 100
          // Grade visível mas primeira pintura: derivada exata.
          ? grid.clientWidth - 24 - 55 - 12 - 1
          // Grade ainda oculta (abertura da home em modo semana): referência
          // conservadora — só alimenta a heurística de densidade.
          : 180);

  // Etapa 5: bandas = componentes conectados do grafo de sobreposição
  // (apenas os eventos de grade — bloqueios de dia inteiro ficam fora, no
  // grafo acima). O grafo explícito é só para a regra de inícios iguais.
  const eventosGradePorId = new Map(
    eventosGradePosicionados.map((ev) => [ev.id, ev])
  );
  const mesmaBanda = (a, b) => a.start < b.end && b.start < a.end;
  const componentes = new Map(); // id -> conjunto de ids
  eventosGradePosicionados.forEach((ev) => {
    if (componentes.has(ev.id)) return;
    const grupo = new Set([ev.id]);
    const fila = [ev];
    while (fila.length > 0) {
      const atual = fila.shift();
      eventosGradePosicionados.forEach((outro) => {
        if (!grupo.has(outro.id) && mesmaBanda(atual, outro)) {
          grupo.add(outro.id);
          fila.push(outro);
        }
      });
    }
    grupo.forEach((id) => componentes.set(id, grupo));
  });

  // Etapa 5: geometria real de cada card. larguraCardPx alimenta a
  // heurística de densidade com a largura que o card VAI renderizar —
  // antes a heurística recebia Math.max(120, ...), ou seja, pensava 120px
  // enquanto o card renderizava 37px (densidade dessincronizada do render).
  //
  // Etapa 5: bandas com 3+ membros viram linhas dentro de um contêiner
  // (`.agenda-banda-grupo`) que cobre o span da banda — o contêiner é
  // montado na geração do HTML abaixo (precisa do HTML de cada evento).
  // A ordem das linhas é pelo início; em empate de início, quem termina
  // primeiro vem antes (tie-break determinístico).
  // CUIDADO: `componentes` mapeia CADA id para a mesma Set de grupo, então
  // iterá-la retorna o MESMO grupo uma vez por membro. Usamos um Set de
  // "já vistos" (por referência da Set) para processar cada banda UMA vez.
  const membrosPorBanda = new Map(); // id -> nº de membros da banda
  const gruposBandaLinhas = []; // [ids ordenados] — só bandas com 3+
  const gruposVistos = new Set();
  componentes.forEach((grp) => {
    if (gruposVistos.has(grp)) return;
    gruposVistos.add(grp);
    const ids = [...grp];
    ids.forEach((id) => membrosPorBanda.set(id, ids.length));
    if (ids.length >= 3) {
      const ordenados = ids
        .map((id) => eventosGradePorId.get(id))
        .sort((a, b) => a.start - b.start || a.end - b.end)
        .map((ev) => ev.id);
      gruposBandaLinhas.push(ordenados);
    }
  });

  eventosPosicionados.forEach((ev) => {
    const tamanhoBanda = membrosPorBanda.get(ev.id) || 1;
    if (tamanhoBanda >= 3) {
      // Linha de banda: posicionamento resolvido pelo contêiner
      // (position static via .agenda-banda-linha no CSS); a referência de
      // largura para a heurística de densidade é a content-col inteira.
      ev.posicionamento = { linha: true };
      ev.larguraCardPx = larguraContentColPx;
    } else if (ev.maxCols > 1) {
      // Banda de 2: colunas proporcionais do engine, inset original de
      // 4px (mesma geometria do layout pré-Etapa 5). O card vira formato
      // Outlook (só título) via classe .formato-outlook no template.
      const widthPercent = 100 / ev.maxCols;
      ev.posicionamento = {
        formatoOutlook: true,
        leftStyle: `${ev.col * widthPercent}%`,
        widthStyle: `calc(${widthPercent}% - 4px)`,
        zIndex: 1,
      };
      ev.larguraCardPx = (larguraContentColPx * widthPercent) / 100 - 4;
    } else {
      // Sem banda (ou bloqueio de dia inteiro, que chega com maxCols=1
      // e fica fora do grafo): largura total, inset original de sempre.
      ev.posicionamento = {
        leftStyle: "0",
        widthStyle: "calc(100% - 4px)",
        zIndex: 1,
      };
      ev.larguraCardPx = larguraContentColPx - 4;
    }
  });

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

  // 3. Gerar os cards dos eventos posicionados. Etapa 5: cards de bandas
  // com 3+ entram em um contêiner de banda (.agenda-banda-grupo); os
  // demais mantêm o posicionamento absoluto direto na layer, como sempre.
  let htmlEvents = "";
  const htmlLinhaPorId = new Map();
  eventosPosicionados.forEach((ev) => {
    const compromisso = ev.original;
    const bloqueioDiaInteiro =
      window.ehBloqueioDiaInteiroCompromisso(compromisso);

    const duracaoMinutos = ev.end - ev.start;
    const larguraCardEstimadaPx = ev.larguraCardPx;
    const pos = ev.posicionamento;

    const analiseDensidadeVisual = analisarDensidadeVisualCardDia({
      compromisso,
      heightPx: (duracaoMinutos / 60) * hourHeight,
      duracaoMinutos,
      larguraPercentual: (larguraCardEstimadaPx / larguraContentColPx) * 100,
      larguraEstimadaPx: larguraCardEstimadaPx,
    });

    if (pos.linha) {
      // Linha de banda: sem absolutos no card (o contêiner cuida do
      // posicionamento); o tempo da linha vem do evento, não do contêiner.
      htmlLinhaPorId.set(
        ev.id,
        window.criarCardAgendamento(compromisso, {
          dataReferencia: new Date(window.dataSelecionada),
          bloqueioDiaInteiro: bloqueioDiaInteiro,
          visualContext: "calendar-day",
          visualDensity: analiseDensidadeVisual.densidade,
          visualHideOptionalMobile: analiseDensidadeVisual.reduzirConteudoOpcionalMobile,
          layoutBanda: "linha",
          horaBandaMinutos: ev.start,
          style: "",
          onclick: `abrirModalAcaoSlot('${compromisso.id}')`,
        })
      );
      return;
    }

    const topPos = ((ev.start - inicioMinutosGrade) / 60) * hourHeight;
    const heightPos = (duracaoMinutos / 60) * hourHeight;
    htmlEvents += window.criarCardAgendamento(compromisso, {
      dataReferencia: new Date(window.dataSelecionada),
      bloqueioDiaInteiro: bloqueioDiaInteiro,
      visualContext: "calendar-day",
      visualDensity: analiseDensidadeVisual.densidade,
      visualHideOptionalMobile: analiseDensidadeVisual.reduzirConteudoOpcionalMobile,
      // Banda de 2 -> card em formato Outlook (só título); sem banda ->
      // formato padrão do dia.
      layoutBanda: pos.formatoOutlook ? "outlook" : undefined,
      style: `position: absolute; top: ${topPos}px; height: ${heightPos}px; left: ${pos.leftStyle}; width: ${pos.widthStyle}; z-index: ${pos.zIndex};`,
      onclick: `abrirModalAcaoSlot('${compromisso.id}')`,
    });
  });

  // Etapa 5: contêiner das bandas com 3+ — um bloco absoluto que cobre o
  // span horário da banda (do menor início ao maior fim); dentro, as
  // linhas empilhadas na ordem de início (calculada no pré-processamento).
  const eventosPosPorId = new Map(
    eventosPosicionados.map((ev) => [ev.id, ev])
  );
  gruposBandaLinhas.forEach((ordenados) => {
    const evsBanda = ordenados.map((id) => eventosPosPorId.get(id));
    const inicioBanda = Math.min(...evsBanda.map((ev) => ev.start));
    const fimBanda = Math.max(...evsBanda.map((ev) => ev.end));
    const topPx = ((inicioBanda - inicioMinutosGrade) / 60) * hourHeight;
    const heightPx = ((fimBanda - inicioBanda) / 60) * hourHeight;
    htmlEvents += `<div class="agenda-banda-grupo" style="top: ${topPx}px; height: ${heightPx}px;">${ordenados
      .map((id) => htmlLinhaPorId.get(id))
      .join("")}</div>`;
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

window.fecharModalConfigAgenda = function () {
  const modal = document.getElementById("modalConfigAgenda");
  if (modal && window.DialogController && typeof window.DialogController.close === "function") {
    window.DialogController.close(modal);
    return;
  }
  if (modal) modal.style.display = "none";
};

window.abrirModalConfigAgenda = function () {
  const selectInicio = document.getElementById("configHoraInicio");
  const selectFim = document.getElementById("configHoraFim");
  const modal = document.getElementById("modalConfigAgenda");
  if (!selectInicio || !selectFim || !modal) return;

  selectInicio.value = agendaConfig.horaInicio;
  selectFim.value = agendaConfig.horaFim;

  if (window.DialogController && typeof window.DialogController.open === "function") {
    window.DialogController.open(modal, {
      trigger: document.activeElement || null,
      onRequestClose: window.fecharModalConfigAgenda,
    });
    return;
  }

  modal.style.display = "flex";
};

// ── FAB dinâmico da Home (Etapa 3, Rodada 2, 2026-09-27) ──────────────────────────────────────
// O botão "Novo agendamento" da Semana (#btnNovaAgendaSemanal) e a 2ª linha de
// ações do Dia (#btnHomeDiaNovaAgenda/#btnHomeDiaConfigAgenda) saíram do topo.
// Este FAB assume "Novo agendamento" nos dois modos: na Semana abre a semana
// inteira (mesma mecânica do antigo botão, via abrirNovoAgendamentoSemana, que
// deixa o escopo para o próprio dialog); no Dia abre o dia selecionado na hora
// inicial da grade. A Configuração de Grade migrou para a seção "Dados" do
// modal Área do usuário.
window.trocarFABNovoHome = function () {
  const homeMain = document.getElementById('tela-home');
  // O FAB só vive enquanto a Home estiver em tela; as demais telas têm seu
  // próprio FAB (#btnFlutuanteAdicionar, tela de Alunos).
  const deveTerEmHome = homeMain && homeMain.style.display !== 'none';
  let fab = document.getElementById('fabNovoHome');
  if (!deveTerEmHome) {
    if (fab) fab.remove();
    return;
  }
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'fabNovoHome';
    fab.type = 'button';
    document.body.appendChild(fab);
  }
  fab.className = 'btn-weekly-add fab-novo-home';
  const diaModo = window.modoHomeAtivo === 'dia';
  const rotulo = diaModo
    ? 'Novo agendamento para o dia selecionado'
    : 'Novo agendamento para a semana selecionada';
  fab.title = rotulo;
  fab.setAttribute('aria-label', rotulo);
  fab.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
  fab.onclick = () => {
    if (diaModo) {
      const horaInicioHome = (typeof agendaConfig !== 'undefined' && agendaConfig && typeof agendaConfig.horaInicio === 'number')
        ? agendaConfig.horaInicio
        : 8;
      if (typeof window.abrirNovoAgendamento === 'function') {
        window.abrirNovoAgendamento({
          dataSelecionada: new Date(window.dataSelecionada),
          hora: `${String(horaInicioHome).padStart(2, '0')}:00`
        });
      }
      return;
    }
    // Semana: mesma mecânica do antigo #btnNovaAgendaSemanal (data base =
    // a data selecionada se estiver dentro da semana, senão a referência da
    // semana) e horário pela proxima hora cheia.
    const referenciaSemana = window.semanaReferencia instanceof Date && !Number.isNaN(window.semanaReferencia.getTime())
      ? new Date(window.semanaReferencia)
      : new Date();
    const diaSemanaReferencia = referenciaSemana.getDay();
    const deslocamentoParaSegunda = diaSemanaReferencia === 0 ? -6 : 1 - diaSemanaReferencia;
    const inicioSemana = new Date(
      referenciaSemana.getFullYear(), referenciaSemana.getMonth(),
      referenciaSemana.getDate() + deslocamentoParaSegunda, 0, 0, 0, 0
    );
    const fimSemana = new Date(
      inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6,
      23, 59, 59, 999
    );
    const dataSelecionadaGlobal = window.dataSelecionada instanceof Date && !Number.isNaN(window.dataSelecionada.getTime())
      ? window.dataSelecionada
      : null;
    const dataEstaNaSemanaAtiva = dataSelecionadaGlobal
      ? dataSelecionadaGlobal >= inicioSemana && dataSelecionadaGlobal <= fimSemana
      : false;
    const dataBase = dataEstaNaSemanaAtiva ? dataSelecionadaGlobal : referenciaSemana;
    if (typeof window.abrirNovoAgendamento === 'function') {
      window.abrirNovoAgendamento({
        dataSelecionada: new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), 0, 0, 0, 0),
        hora: typeof window.obterProximaHoraCheiaSemana === 'function' ? window.obterProximaHoraCheiaSemana() : undefined
      });
    }
  };
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("btnFecharConfig")) {
    document.getElementById("btnFecharConfig").addEventListener("click", () => {
      window.fecharModalConfigAgenda();
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
        window.fecharModalConfigAgenda();
        window.inicializarHome();
      });
  }
});
