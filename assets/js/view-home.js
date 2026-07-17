// [TAG-VIEW-HOME] view-home.js
// Responsabilidade: View da aba Home — agenda diária, dashboard de stats e navegação de datas
// Depende de: state.js (aulas, aulasParaRepor, agendaConfig, HORARIOS), storage.js (carregarDados, salvarDados, atualizarLimitesGrade),
//             utils-datetime.js (getDiaTextoSelecionado), calendario-engine.js (checarCompromissoNaData),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso),
//             modal-agendamento.js (abrirEscolhaTipoModal), modal-acao-slot.js (abrirModalAcaoSlot, renderizarListaReposicoes, inicializarMultiSelectPills)
// Expõe: window.dataSelecionada, window.dataAlvoAcaoStr, window.horarioSelecionadoSlot,
//         window.reagendamentoDirectCardId, window.__sincronizacaoInicialConcluida,
//         window.__homeCarregando, window.getAluno, window.renderizarLoadingHome,
//         window.inicializarHome, window.atualizarDataAtual, window.atualizarDashboardStats,
//         window.renderizarAgendaDia

// ── Estado global da view ─────────────────────────────────────────────────────────────────────

window.dataSelecionada = window.dataSelecionada || new Date();
window.dataAlvoAcaoStr = null;
window.horarioSelecionadoSlot = null;
window.reagendamentoDirectCardId = null;
window.__sincronizacaoInicialConcluida =
  window.__sincronizacaoInicialConcluida || false;
window.__homeCarregando = window.__homeCarregando || false;

const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

// ── Lookup de aluno (centralizado aqui, exposto para outros módulos) ───────────────────────────

window.getAluno = function (id) {
  if (typeof alunos !== "undefined") {
    return alunos.find((a) => a.id === id);
  }
  return null;
};

// ── Loading State ─────────────────────────────────────────────────────────────────────────────

window.renderizarLoadingHome = function () {
  const elementoData = document.getElementById("dataAtual");
  const elAulasHoje = document.getElementById("totalAulasHoje");
  const elAulasRepor = document.getElementById("totalAulasRepor");
  const grid = document.getElementById("agendaGridHome");

  if (elementoData) {
    elementoData.innerHTML = `<i class="fa-solid fa-calendar-minus" style="color: #FFD700; margin-right: 8px;"></i>Sincronizando agenda...`;
  }
  if (elAulasHoje) elAulasHoje.textContent = "...";
  if (elAulasRepor) elAulasRepor.textContent = "...";
  if (grid) {
    grid.innerHTML = `
            <div class="time-grid-wrapper" style="height: 336px; opacity: 0.5; pointer-events: none;">
                <div class="time-grid-hours-col">
                    <div class="time-grid-hour-label" style="position: absolute; top: 0px; width: 100%;">07:00</div>
                    <div class="time-grid-hour-label" style="position: absolute; top: 84px; width: 100%;">08:00</div>
                    <div class="time-grid-hour-label" style="position: absolute; top: 168px; width: 100%;">09:00</div>
                    <div class="time-grid-hour-label" style="position: absolute; top: 252px; width: 100%;">10:00</div>
                </div>
                <div class="time-grid-content-col" style="position: relative; height: 100%;">
                    <div class="time-grid-lines">
                        <div class="time-grid-line" style="position: absolute; top: 0px; left: 0; right: 0; height: 1px;"></div>
                        <div class="time-grid-line" style="position: absolute; top: 84px; left: 0; right: 0; height: 1px;"></div>
                        <div class="time-grid-line" style="position: absolute; top: 168px; left: 0; right: 0; height: 1px;"></div>
                        <div class="time-grid-line" style="position: absolute; top: 252px; left: 0; right: 0; height: 1px;"></div>
                    </div>
                    <div class="home-loading-block" style="position: absolute; top: 20px; left: 10px; right: 10px; height: 60px; border-radius: 6px;"></div>
                </div>
            </div>
        `;
  }
};

// ── Inicialização da Home ─────────────────────────────────────────────────────────────────────

window.inicializarHome = async function (opcoes = {}) {
  const deveSincronizar =
    opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;

  if (!agendaConfig) agendaConfig = { horaInicio: 7, horaFim: 21 };
  if (!aulasParaRepor) aulasParaRepor = [];

  if (deveSincronizar) {
    window.__homeCarregando = true;
    window.renderizarLoadingHome();

    try {
      if (typeof carregarDados === "function") {
        await carregarDados({ forcarRender: false });
      }
      window.__sincronizacaoInicialConcluida = true;
    } finally {
      window.__homeCarregando = false;
    }
  }

  window.atualizarDataAtual();
  window.atualizarDashboardStats();
  window.renderizarAgendaDia();
  window.renderizarListaReposicoes();
  window.inicializarMultiSelectPills();
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────────────────────

window.atualizarDataAtual = function () {
  const elementoData = document.getElementById("dataAtual");
  if (!elementoData) return;
  const dia = String(window.dataSelecionada.getDate()).padStart(2, "0");
  const mes = String(window.dataSelecionada.getMonth() + 1).padStart(2, "0");
  const nomeDia = DIAS_DA_SEMANA[window.dataSelecionada.getDay()];

  elementoData.innerHTML = `<i class="fa-solid fa-calendar-minus" style="color: #FFD700; margin-right: 8px;"></i>${nomeDia} <span style="color: #FFD700; font-weight: 800;">(${dia}/${mes})</span>`;
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

window.renderizarAgendaDia = function () {
  const grid = document.getElementById("agendaGridHome");
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
    const tipo = compromisso.tipo || "aula";
    const bloqueioDiaInteiro =
      window.ehBloqueioDiaInteiroCompromisso(compromisso);

    const topPos = ((ev.start - inicioMinutosGrade) / 60) * hourHeight;
    const heightPos = ((ev.end - ev.start) / 60) * hourHeight;

    // Posicionamento horizontal dinâmico por colisões
    const widthPercent = 100 / ev.maxCols;
    const leftPercent = ev.col * widthPercent;

    // Margem de segurança de layout
    const gapRight = 4;
    const widthStyle = `calc(${widthPercent}% - ${gapRight}px)`;
    const leftStyle = `${leftPercent}%`;

    const periodoExibicao = bloqueioDiaInteiro
      ? "Dia inteiro"
      : `${compromisso.horarioInicio} - ${compromisso.horarioFim}`;

    let tagVisualHtml = "";
    let cardHtml = "";

    if (tipo === "aula") {
      const aluno = window.getAluno(compromisso.alunoId);
      const nome = aluno ? aluno.nome : "❓ Aluno Removido";
      const objetivo = aluno ? aluno.objetivo : "Outro";
      const local = aluno ? aluno.local || "Não definido" : "Não definido";

      if (compromisso.reagendada || compromisso.isReposicao) {
        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(100, 181, 246, 0.15); color: #64B5F6;"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
      } else if (compromisso.frequencia === "semanal") {
        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 215, 0, 0.15); color: #FFD700;"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
      } else {
        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(129, 199, 132, 0.15); color: #81C784;"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
      }

      cardHtml = `
                <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g, "")}" 
                     style="position: absolute; top: ${topPos}px; height: ${heightPos}px; left: ${leftStyle}; width: ${widthStyle};"
                     onclick="abrirModalAcaoSlot('${compromisso.id}')">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px; width: 100%;">
                        <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                        ${tagVisualHtml}
                    </div>
                    <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                    <span class="agenda-dia-aula-detalhes">${objetivo} (${periodoExibicao})</span>
                </div>
            `;
    } else if (tipo === "deslocamento") {
      tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 152, 0, 0.15); color: #FF9800;"><i class="fa-solid fa-car-side"></i> Trânsito</span>`;

      cardHtml = `
                <div class="agenda-dia-aula slot-deslocamento" 
                     style="position: absolute; top: ${topPos}px; height: ${heightPos}px; left: ${leftStyle}; width: ${widthStyle};"
                     onclick="abrirModalAcaoSlot('${compromisso.id}')">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px; width: 100%;">
                        <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                        ${tagVisualHtml}
                    </div>
                    <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || "Trânsito"} (${periodoExibicao})</span>
                </div>
            `;
    } else if (tipo === "bloqueio") {
      tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(239, 83, 80, 0.15); color: #EF5350;"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? "Dia inteiro" : "Bloqueio"}</span>`;

      cardHtml = `
                <div class="agenda-dia-aula slot-bloqueado" 
                     style="position: absolute; top: ${topPos}px; height: ${heightPos}px; left: ${leftStyle}; width: ${widthStyle};"
                     onclick="abrirModalAcaoSlot('${compromisso.id}')">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px; width: 100%;">
                        <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? "Dia bloqueado" : "Bloqueado"}</span>
                        ${tagVisualHtml}
                    </div>
                    <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || "Compromisso"} (${periodoExibicao})</span>
                </div>
            `;
    }

    htmlEvents += cardHtml;
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

  grid.innerHTML = wrapperHtml;

  // Scroll inteligente para o horário atual
  if (ehHoje) {
    const wrapperElement = document.querySelector(".time-grid-wrapper");
    const nowIndicator = document.querySelector(".time-grid-now-indicator");
    if (wrapperElement && nowIndicator) {
      const containerElement = document.getElementById("agendaGridHome");
      if (containerElement) {
        const topIndicator = nowIndicator.offsetTop;
        containerElement.scrollTop = topIndicator - 150;
      }
    }
  }
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const btnConfig = document.getElementById("btnConfigAgenda");
  if (btnConfig) {
    btnConfig.addEventListener("click", () => {
      const selectInicio = document.getElementById("configHoraInicio");
      const selectFim = document.getElementById("configHoraFim");
      selectInicio.value = agendaConfig.horaInicio;
      selectFim.value = agendaConfig.horaFim;
      document.getElementById("modalConfigAgenda").style.display = "flex";
    });
  }

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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("btnAnterior")) {
    document.getElementById("btnAnterior").addEventListener("click", () => {
      window.dataSelecionada.setDate(window.dataSelecionada.getDate() - 1);
      window.inicializarHome();
    });
  }
  if (document.getElementById("btnProximo")) {
    document.getElementById("btnProximo").addEventListener("click", () => {
      window.dataSelecionada.setDate(window.dataSelecionada.getDate() + 1);
      window.inicializarHome();
    });
  }
  if (document.getElementById("btnHoje")) {
    document.getElementById("btnHoje").addEventListener("click", () => {
      window.dataSelecionada = new Date();
      window.inicializarHome();
    });
  }
});
