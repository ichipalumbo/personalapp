// [TAG-VIEW-FINANCAS] view-financas.js
// Responsabilidade: Tela de Finanças por ciclo, leitura com cache local e escritas confirmadas pelo backend

(function (global) {
    const contextoDados = global.contextoDados;
    if (!contextoDados) throw new Error('contexto-dados.js precisa carregar antes de view-financas.js.');
    const STATE = {
        cards: [],
        carregando: false,
        salvando: false,
        operacao: null,
        requestId: 0,
        ciclosAguardandoLeitura: {},
        erro: null,
        cacheAtualizadoEm: null,
        cardAtivo: null,
        handlersBound: false,
        // Histórico de ciclos anteriores, carregado sob demanda e cacheado em memória por aluno (6.2.2).
        // Nunca gravado no localStorage; descartado ao recarregar a página.
        historicoPorAluno: {},
        // Alunos com "Ver ciclos anteriores" expandido — persistido por aluno para sobreviver a re-renders.
        historicoAberto: {},
        // Detalhes do extrato do ciclo atual, persistidos em memória para sobreviver a re-renders.
        extratoAberto: {}
    };
    let leituraFinancasEmVoo = null;

    function telaFinancasAtiva() {
        const router = global.__appShell && global.__appShell.router;
        return !router || router.getCurrentViewId() === 'tela-financas';
    }

    contextoDados.aoInvalidar(() => {
        leituraFinancasEmVoo = null;
        STATE.cards = [];
        STATE.historicoPorAluno = {};
        STATE.historicoAberto = {};
        STATE.extratoAberto = {};
        STATE.cardAtivo = null;
        STATE.cacheAtualizadoEm = null;
        STATE.carregando = false;
        STATE.salvando = false;
        STATE.operacao = null;
        STATE.requestId += 1;
        STATE.ciclosAguardandoLeitura = {};
        STATE.erro = null;
        ['btnSalvarPagamento', 'btnSalvarAjuste'].forEach((id) => {
            const botao = document.getElementById(id);
            if (botao) botao.disabled = false;
        });
        const conteudo = document.getElementById('financasConteudo');
        if (conteudo) conteudo.setAttribute('aria-busy', 'false');
        fecharModal('pagamento');
        fecharModal('ajuste');
        ['financasConteudo', 'financasCacheLabel', 'financasSyncState', 'financasPagamentoResumo', 'financasAjusteResumo'].forEach((id) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.replaceChildren();
        });
    });

    function formatarMoeda(valor) {
        const numero = Number(valor) || 0;
        if (typeof global.formatarMoeda === 'function') {
            return global.formatarMoeda(numero);
        }
        return `R$ ${numero.toFixed(2).replace('.', ',')}`;
    }

    function formatarDataBR(dataISO) {
        if (!dataISO) return '--/--/----';
        const partes = String(dataISO).split('-');
        if (partes.length !== 3) return String(dataISO);
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function escaparHtml(valor) {
        return String(valor == null ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function statusOrder(status, configuracaoPendente) {
        if (configuracaoPendente) return 3;
        if (status === 'atrasado') return 0;
        if (status === 'em_aberto') return 1;
        if (status === 'pago') return 2;
        return 4;
    }

    function obterRoot() {
        let root = document.getElementById('tela-financas');
        if (root) return root;

        root = document.createElement('main');
        root.id = 'tela-financas';
        root.className = 'view-section';
        root.style.display = 'none';
        root.setAttribute('data-financas-root', 'true');

        const container = document.querySelector('.container') || document.body;
        const anchor = document.getElementById('tela-alunos');
        if (anchor && anchor.parentNode === container) {
            container.insertBefore(root, anchor);
        } else {
            container.appendChild(root);
        }

        return root;
    }

    function ensureModais() {
        if (!document.getElementById('modalFinancasPagamento')) {
            const pagamentoModal = document.createElement('div');
            pagamentoModal.className = 'modal-overlay';
            pagamentoModal.id = 'modalFinancasPagamento';
            pagamentoModal.style.display = 'none';
            pagamentoModal.setAttribute('role', 'dialog');
            pagamentoModal.setAttribute('aria-labelledby', 'financasPagamentoTitulo');
            pagamentoModal.setAttribute('aria-describedby', 'financasPagamentoResumo');
            pagamentoModal.innerHTML = `
              <div class="modal" style="max-width: 420px">
                <h3 id="financasPagamentoTitulo"><i class="fa-solid fa-circle-check" style="color:#ffd700;margin-right:8px"></i>Marcar como pago</h3>
                <p id="financasPagamentoResumo" style="font-size:0.875rem;color:#a8a8a8;margin-bottom:14px;font-weight:500;"></p>
                <form id="formFinancasPagamento">
                  <div class="form-grupo-spa">
                    <label for="financasDataPagamento">Data do pagamento *</label>
                    <input type="date" id="financasDataPagamento" required />
                  </div>
                  <div class="form-grupo-spa">
                    <label for="financasFormaPagamento">Forma de pagamento</label>
                    <input type="text" id="financasFormaPagamento" placeholder="Pix, permuta, dinheiro..." />
                  </div>
                  <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;border-top:1px solid #222;padding-top:15px;">
                    <button type="button" class="btn btn-secondary" data-financas-close="pagamento">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnSalvarPagamento">Salvar</button>
                  </div>
                </form>
              </div>`;
            document.body.appendChild(pagamentoModal);
        }

        if (!document.getElementById('modalFinancasAjuste')) {
            const ajusteModal = document.createElement('div');
            ajusteModal.className = 'modal-overlay';
            ajusteModal.id = 'modalFinancasAjuste';
            ajusteModal.style.display = 'none';
            ajusteModal.setAttribute('role', 'dialog');
            ajusteModal.setAttribute('aria-labelledby', 'financasAjusteTitulo');
            ajusteModal.setAttribute('aria-describedby', 'financasAjusteResumo');
            ajusteModal.innerHTML = `
              <div class="modal" style="max-width: 420px">
                <h3 id="financasAjusteTitulo"><i class="fa-solid fa-sliders" style="color:#ffd700;margin-right:8px"></i>Ajuste manual</h3>
                <p id="financasAjusteResumo" style="font-size:0.875rem;color:#a8a8a8;margin-bottom:14px;font-weight:500;"></p>
                <form id="formFinancasAjuste">
                  <div class="form-grupo-spa">
                    <label for="financasAulasExtras">Ajuste de aulas (pode ser negativo)</label>
                    <input type="number" id="financasAulasExtras" step="1" required />
                  </div>
                  <div class="form-grupo-spa">
                    <label for="financasObservacaoAjuste">Observação</label>
                    <textarea id="financasObservacaoAjuste" rows="4" style="resize:vertical;"></textarea>
                  </div>
                  <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;border-top:1px solid #222;padding-top:15px;">
                    <button type="button" class="btn btn-secondary" data-financas-close="ajuste">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnSalvarAjuste">Salvar</button>
                  </div>
                </form>
              </div>`;
            document.body.appendChild(ajusteModal);
        }
    }

    function renderizarCabecalho() {
        const root = obterRoot();
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;
        // Info de sistema no header: só aparece quando relevante (cache real ou sync
        // em andamento). "Sem cache local" em repouso virou ruído visual (decisão do
        // dono, Etapa 4, 2026-09-27) — o estado sem cache é o normal fora do app.
        const cacheLabel = cache && cache.atualizadoEm ? `Cache atualizado em ${new Date(cache.atualizadoEm).toLocaleString('pt-BR')}` : '';

        root.innerHTML = `
          <section class="agenda-panel topbar-sem-cantos" style="margin-top: 0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <h2 style="margin:0;color:#ffd700;font-size:1.125rem;font-weight:800;">💰 Finanças</h2>
                <p style="margin:4px 0 0;color:#9a9a9a;font-size:0.875rem;">Ciclo, valor e status de cobrança por aluno.</p>
              </div>
              <div style="text-align:right;">
                <div id="financasCacheLabel" style="font-size:0.75rem;color:#909090;">${cacheLabel}</div>
                <div id="financasSyncState" style="font-size:0.75rem;color:#909090;margin-top:4px;"></div>
              </div>
            </div>
          </section>
          <section id="financasConteudo"></section>
        `;
    }

    function renderizarSkeleton() {
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;

        // 5.8 (Parte A): skeleton padronizado (.skeleton) — a silhueta do card
        // (chrome de aluno-card + medidas) é mantida; só a cor/ritmo unificaram.
        conteudo.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${Array.from({ length: 3 }).map(() => `
              <div class="aluno-card" style="opacity:0.7;border-left-color:#3a3a3a;">
                <div class="skeleton" style="height:16px;width:55%;margin-bottom:10px;"></div>
                <div class="skeleton" style="height:10px;width:80%;margin-bottom:8px;"></div>
                <div class="skeleton" style="height:10px;width:65%;margin-bottom:12px;"></div>
                <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
                  <div class="skeleton" style="height:72px;"></div>
                  <div class="skeleton" style="height:72px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
    }

    function obterStatusCard(card) {
        if (!card) return 'em_aberto';
        if (card.configuracaoPendente) return 'pendente';
        return (card.cicloAtual && card.cicloAtual.status) || 'em_aberto';
    }

    function filtrarCards(cards) {
        const lista = Array.isArray(cards) ? cards.slice() : [];
        return lista.sort((a, b) => {
            const ordA = statusOrder(obterStatusCard(a), a && a.configuracaoPendente);
            const ordB = statusOrder(obterStatusCard(b), b && b.configuracaoPendente);
            return ordA - ordB;
        });
    }

    function renderizarVazio(mensagem) {
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;
        conteudo.innerHTML = `
          <div class="agenda-panel" style="text-align:center;color:#909090;">
            <i class="fa-solid fa-wallet" style="font-size:2rem;margin-bottom:10px;display:block;color:#ffd700;"></i>
            <p style="margin:0;font-size:1rem;">${mensagem}</p>
          </div>
        `;
    }

    // Só o período: o status já é exibido pelo badge do canto do card (Etapa 4, Cartão B — evita repetir 3x).
    function resumoCiclo(card) {
        if (!card || !card.cicloAtual) return 'Sem ciclo';
        const ciclo = card.cicloAtual;
        return `${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)}`;
    }

    function totalAulasCobradas(ciclo) {
        const contadas = Number(ciclo && ciclo.aulasContadas) || 0;
        const extras = Number(ciclo && ciclo.aulasManuaisExtras) || 0;
        return Math.max(0, contadas + extras);
    }

    function descreverAjuste(extras) {
        const valor = Number(extras) || 0;
        if (valor === 0) return 'sem ajuste';
        return `${valor > 0 ? '+' : '−'}${Math.abs(valor)} de ajuste`;
    }

    function renderizarLinhaExtrato(linha, ciclo) {
        const tipo = String(linha && linha.tipo ? linha.tipo : 'desconhecido');
        const descricao = escaparHtml(linha && linha.descricao ? linha.descricao : 'Lançamento');
        const nota = linha && linha.nota ? escaparHtml(String(linha.nota)) : '';
        const quantidade = Number(linha && linha.quantidade);
        const valorTotal = Number(linha && linha.valorTotal) || 0;
        const valorExibicao = formatarMoeda(valorTotal);
        const quantidadeHtml = Number.isFinite(quantidade) && quantidade !== 0
            ? `<div style="margin-top:4px;color:#909090;font-size:0.75rem;">Qtd.: ${quantidade}</div>`
            : '';
        const notaHtml = nota
            ? `<div style="margin-top:4px;color:#909090;font-size:0.75rem;">Nota: ${nota}</div>`
            : '';

        let rotuloTipo = 'Lançamento';
        switch (tipo) {
            case 'recorrente':
                rotuloTipo = 'Aula recorrente';
                break;
            case 'avulsa':
                rotuloTipo = 'Aula avulsa';
                break;
            case 'reposicao_cobravel_origem':
                rotuloTipo = 'Reposição cobrável';
                break;
            case 'reposicao_nao_cobravel':
                rotuloTipo = 'Reposição não cobrável';
                break;
            case 'reposicao_cobranca_adiada':
                rotuloTipo = 'Cobrança adiada';
                break;
            case 'reposicao_ja_cobrada':
                rotuloTipo = 'Já cobrada';
                break;
            case 'reposicao_expirada':
                rotuloTipo = 'Reposição expirada';
                break;
            case 'reposicao_pendente':
                rotuloTipo = 'Reposição pendente';
                break;
            case 'ajuste_manual':
                rotuloTipo = 'Ajuste manual';
                break;
            case 'piso_zero':
                rotuloTipo = 'Piso zero';
                break;
            case 'valor_fixo':
                rotuloTipo = 'Valor fixo';
                break;
            default:
                rotuloTipo = 'Lançamento';
                break;
        }

        return `
          <div style="padding:8px 10px;border:1px solid #242424;border-radius:8px;background:#0d0d0d;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
              <div style="min-width:0;flex:1;">
                <div style="color:#f0f0f0;font-size:0.875rem;font-weight:700;">${rotuloTipo}</div>
                    <div style="margin-top:4px;color:#e8e8e8;font-size:0.875rem;word-break:break-word;">${descricao}</div>
                ${quantidadeHtml}
                ${notaHtml}
              </div>
              <div style="color:#ffd700;font-weight:800;font-size:1rem;white-space:nowrap;">${valorExibicao}</div>
            </div>
          </div>
        `;
    }

    // Ciclo + Cobranca: mini-grid movido do card principal para o cabecalho do extrato (Etapa 4, Cartao B).
    function renderizarCicloECobrancaExtrato(ciclo) {
        const status = (ciclo && ciclo.status) || 'em_aberto';
        const metodo = ciclo && ciclo.metodoCobranca === 'valor_fixo' ? 'Valor fixo' : 'Por aula';
        const cicloSubtitulo = status === 'pago' ? 'Pago' : (status === 'atrasado' ? 'Venceu' : 'Vigente');
        const cobrancaSubtitulo = status === 'pago' ? 'Pagamento confirmado' : 'Pagamento manual';

        return `
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px;">
            <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
              <div style="font-size:0.75rem;color:#909090;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Ciclo</div>
              <div style="margin-top:6px;font-size:0.875rem;color:#fff;font-weight:700;">${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)}</div>
              <div style="margin-top:4px;font-size:0.75rem;color:#a8a8a8;">${cicloSubtitulo}</div>
            </div>
            <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
              <div style="font-size:0.75rem;color:#909090;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Cobrança</div>
              <div style="margin-top:6px;font-size:0.875rem;color:#fff;font-weight:700;">${metodo}</div>
              <div style="margin-top:4px;font-size:0.75rem;color:#a8a8a8;">${cobrancaSubtitulo}</div>
            </div>
          </div>
        `;
    }

    function renderizarConteudoExtrato(ciclo) {
        if (!ciclo) {
            return '<div style="color:#909090;font-size:0.875rem;">Extrato indisponível.</div>';
        }

        const cicloECobranca = renderizarCicloECobrancaExtrato(ciclo);

        if (ciclo.extrato == null) {
            return `${cicloECobranca}<div style="color:#909090;font-size:0.875rem;">Extrato não registrado para este ciclo.</div>`;
        }

        const linhas = Array.isArray(ciclo.extrato) ? ciclo.extrato : [];
        if (linhas.length === 0) {
            return `${cicloECobranca}<div style="color:#909090;font-size:0.875rem;">Não há lançamentos.</div>`;
        }

        const totalLabel = ciclo.metodoCobranca === 'valor_fixo'
            ? `Total do ciclo ${formatarMoeda(ciclo.valorTotalCiclo)} • valor fixo`
            : `Total do ciclo ${formatarMoeda(ciclo.valorTotalCiclo)}`;

        return `
          ${cicloECobranca}
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${linhas.map((linha) => renderizarLinhaExtrato(linha, ciclo)).join('')}
            <div style="padding-top:8px;border-top:1px solid #262626;color:#ffd700;font-size:0.875rem;font-weight:800;">${escaparHtml(totalLabel)}</div>
          </div>
        `;
    }

    function renderizarDetalhesExtrato(ciclo, opcoes = {}) {
        const identificador = opcoes.identificador || `extrato-${String(ciclo && ciclo._id ? ciclo._id : (ciclo && ciclo.cicloInicio) || 'ciclo')}`;
        const rotulo = opcoes.rotulo || 'Ver detalhes do ciclo';
        const estadoPersistido = STATE.extratoAberto[identificador] === true;
        const aberto = opcoes.aberto === true ? 'open' : (opcoes.aberto === false ? '' : (estadoPersistido ? 'open' : ''));

        return `
          <details data-financas-extrato-details="${escaparHtml(identificador)}" style="border-top:1px solid #262626;padding-top:10px;" ${aberto}>
            <summary style="cursor:pointer;color:#ffd700;font-weight:700;font-size:0.875rem;">${escaparHtml(rotulo)}</summary>
            <div style="margin-top:10px;">${renderizarConteudoExtrato(ciclo)}</div>
          </details>
        `;
    }

    function renderizarListaHistorico(historico) {
        const lista = Array.isArray(historico) ? historico : [];
        if (lista.length === 0) {
            return '<p style="margin:0;color:#909090;font-size:0.875rem;">Sem ciclos anteriores.</p>';
        }

        return `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${lista.map((ciclo) => {
                const status = ciclo.status === 'pago' ? 'Pago' : (ciclo.status === 'atrasado' ? 'Atrasado' : 'Em aberto');
                const valor = formatarMoeda(ciclo.valorTotalCiclo);
                const extratoKey = String(ciclo && ciclo._id ? ciclo._id : `${ciclo.cicloInicio || ''}-${ciclo.cicloFim || ''}`);
                                const acoesHistorico = ciclo.dataPagamento ? '' : `
                                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                                            <button type="button" class="btn btn-primary" data-financas-pagar="${ciclo.alunoId}" data-ciclo-id="${ciclo._id || ''}">Marcar como pago</button>
                                            <button type="button" class="btn btn-secondary" data-financas-ajuste="${ciclo.alunoId}" data-ciclo-id="${ciclo._id || ''}">Editar ajuste</button>
                                        </div>
                                `;
                return `
                  <div style="border:1px solid #262626;border-radius:10px;padding:10px 12px;background:#0f0f0f;">
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                      <strong style="color:#fff;font-size:0.875rem;">${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)}</strong>
                      <span style="color:${ciclo.status === 'pago' ? 'var(--cor-estado-ok)' : (ciclo.status === 'atrasado' ? 'var(--cor-estado-erro)' : 'var(--cor-estado-neutro)')};font-size:0.75rem;font-weight:700;">${status}</span>
                    </div>
                    <div style="font-size:0.75rem;color:#9a9a9a;margin-top:6px;">
                      ${totalAulasCobradas(ciclo)} aulas cobradas (${ciclo.aulasContadas || 0} registradas, ${descreverAjuste(ciclo.aulasManuaisExtras)}) • ${valor}
                    </div>
                                        ${acoesHistorico}
                    ${renderizarDetalhesExtrato(ciclo, { identificador: `extrato-historico-${extratoKey}` })}
                  </div>
                `;
            }).join('')}
          </div>
        `;
    }

    function obterEstadoHistorico(alunoId) {
        if (!STATE.historicoPorAluno[alunoId]) {
            STATE.historicoPorAluno[alunoId] = { status: 'idle', dados: [], erro: null, requestId: 0 };
        }
        return STATE.historicoPorAluno[alunoId];
    }

    function montarHtmlHistorico(alunoId) {
        const estado = obterEstadoHistorico(alunoId);

        if (estado.status === 'carregando') {
            // Etapa 2 (Cartão D): #8e8e8e → #909090 (4.5:1 no card #2a2a2a)
        return '<p style="margin:0;color:#909090;font-size:0.875rem;">Carregando ciclos anteriores...</p>';
        }
        if (estado.status === 'erro') {
            return `
              <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
                <p style="margin:0;color:#ff8a80;font-size:0.875rem;">${estado.erro || 'Não foi possível carregar o histórico.'}</p>
                <button type="button" class="btn btn-secondary" data-financas-historico-retry="${alunoId}">Tentar novamente</button>
              </div>
            `;
        }
        if (estado.status === 'pronto') {
            return renderizarListaHistorico(estado.dados);
        }

        // idle: histórico ainda não solicitado — populado quando o <details> for aberto.
        return '';
    }

    function renderizarConteudoHistorico(alunoId) {
        // O card pode ter sido desmontado (troca de aba/filtro) antes da resposta chegar.
        const container = document.getElementById(`financas-historico-conteudo-${alunoId}`);
        if (!container) return;
        container.innerHTML = montarHtmlHistorico(alunoId);
    }

    async function carregarHistoricoAluno(alunoId, opcoes = {}) {
        const operacao = opcoes.operacao;
        const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || contextoDados.capturar();
        const interacao = contextoDados.capturarInteracao();
        const podeAplicar = () => contextoDados.atual(contexto) && contextoDados.podeAplicarInteracao(interacao, operacao);
        if (!podeAplicar()) return false;
        const estado = obterEstadoHistorico(alunoId);
        // Uma nova leitura pode substituir a espera invalidada; o callback antigo não toca o estado.
        if (estado.status === 'carregando' && estado.interacao !== interacao) estado.status = 'idle';
        const forcar = opcoes.forcar === true;
        if (!forcar && (estado.status === 'pronto' || estado.status === 'carregando')) {
            renderizarConteudoHistorico(alunoId);
            return estado.status === 'pronto';
        }

        const card = STATE.cards.find((item) => item && item.alunoId === alunoId);
        if (!forcar && card && card.historicoDisponivel === false) {
            estado.status = 'pronto';
            estado.dados = [];
            estado.erro = null;
            renderizarConteudoHistorico(alunoId);
            return true;
        }

        const requestId = ++estado.requestId;
        estado.interacao = interacao;
        estado.status = 'carregando';
        estado.erro = null;
        renderizarConteudoHistorico(alunoId);

        try {
            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas/${encodeURIComponent(alunoId)}/historico`, { operacao, contextoDados: contexto }, opcoes.timeoutMs || 40000);
            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) throw new Error(`Falha ao carregar histórico (${resposta.status})`);
            const dados = await resposta.json();

            if (!podeAplicar()) return false;

            // Ignora respostas tardias de uma chamada já substituída por outra mais recente para o mesmo aluno.
            if (requestId !== estado.requestId) return false;
            if (!Array.isArray(dados)) throw new Error('Histórico financeiro inválido.');

            estado.status = 'pronto';
            estado.dados = Array.isArray(dados) ? dados : [];
            estado.erro = null;
            // O endpoint exclui o vigente: só destravar ciclos efetivamente relidos.
            estado.dados.forEach((ciclo) => {
                const trava = ciclo && STATE.ciclosAguardandoLeitura[ciclo._id];
                if (trava && trava.alunoId === alunoId) delete STATE.ciclosAguardandoLeitura[ciclo._id];
            });
        } catch (error) {
            if (!podeAplicar()) return false;
            if (requestId !== estado.requestId) return false;
            estado.status = 'erro';
            estado.erro = error && error.message === 'AUTH_REQUIRED'
                ? 'Faça login para carregar o histórico.'
                : 'Não foi possível carregar o histórico agora.';
        }

        renderizarConteudoHistorico(alunoId);
        return estado.status === 'pronto';
    }

    function obterCicloParaAcao(alunoId, cicloId) {
        const card = STATE.cards.find((item) => item && item.alunoId === alunoId);
        if (!card) return null;

        if (card.cicloAtual && card.cicloAtual._id === cicloId) {
            return { card, ciclo: card.cicloAtual, historico: false };
        }

        const estadoHistorico = obterEstadoHistorico(alunoId);
        const cicloHistorico = estadoHistorico.dados.find((item) => item && item._id === cicloId);
        return cicloHistorico ? { card, ciclo: cicloHistorico, historico: true } : null;
    }

    function renderizarCard(card) {
        const aluno = card.aluno || {};
        const ciclo = card.cicloAtual || {};
        const status = obterStatusCard(card);
        const statusLabel = card.configuracaoPendente ? '⚠️ Pendente' : (status === 'pago' ? '🟢 Pago' : (status === 'atrasado' ? '🔴 Atrasado' : '🟡 Em aberto'));
        const total = formatarMoeda(ciclo.valorTotalCiclo);
        const aulasExtras = ciclo.aulasManuaisExtras || 0;
        const aulasContadas = ciclo.aulasContadas || 0;
        const aulasCobradas = totalAulasCobradas(ciclo);

        return `
          <article class="aluno-card" data-financas-card-id="${aluno.id || card.alunoId}" style="display:flex;flex-direction:column;gap:10px;position:relative;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
              <div style="min-width:0;">
                <strong style="display:block;color:#fff;font-size:1.02rem;word-break:break-word;">${escaparHtml(aluno.nome || 'Aluno')}</strong>
                ${card.configuracaoPendente ? '' : `<div style="margin-top:4px;font-size:0.75rem;color:#b8b8b8;">${resumoCiclo(card)}</div>`}
              </div>
              <span style="font-size:0.75rem;font-weight:800;color:${card.configuracaoPendente ? 'var(--cor-estado-erro)' : (status === 'pago' ? 'var(--cor-estado-ok)' : (status === 'atrasado' ? 'var(--cor-estado-erro)' : 'var(--cor-estado-neutro)'))};text-transform:uppercase;letter-spacing:0.4px;white-space:nowrap;flex-shrink:0;">${statusLabel.replace(/[🟢🟡🔴⚠️]\s*/, '')}</span>
            </div>

            ${card.configuracaoPendente ? `
              <div style="padding:12px;border:1px dashed rgba(255,215,0,0.28);border-radius:10px;background:rgba(255,215,0,0.04);color:#ddd;">
                <p style="margin:0 0 8px;font-size:1rem;">Configure o dia de vencimento para calcular a cobrança.</p>
                <button type="button" class="btn btn-primary" data-financas-configurar="${aluno.id}" style="width:100%;">Configurar agora</button>
              </div>
            ` : `
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.75rem;color:#909090;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Aulas</div>
                  <div style="margin-top:6px;font-size:0.875rem;color:#fff;font-weight:700;">${aulasCobradas} aula(s) cobrada(s)</div>
                  <div style="margin-top:4px;font-size:0.75rem;color:#a8a8a8;">${aulasContadas} registradas • ${descreverAjuste(aulasExtras)}</div>
                </div>
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.75rem;color:#909090;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Valor</div>
                  <div style="margin-top:6px;font-size:1rem;color:#ffd700;font-weight:800;">${total}</div>
                  <div style="margin-top:4px;font-size:0.75rem;color:#a8a8a8;">${status === 'pago' ? 'Pago' : 'A receber'}</div>
                </div>
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary" data-financas-pagar="${aluno.id}" data-ciclo-id="${ciclo._id || ''}" ${status === 'pago' ? 'disabled' : ''}>Marcar como pago</button>
                <button type="button" class="btn btn-secondary" data-financas-ajuste="${aluno.id}" data-ciclo-id="${ciclo._id || ''}" ${status === 'pago' ? 'disabled' : ''}>Editar ajuste</button>
              </div>

              ${renderizarDetalhesExtrato(ciclo, { identificador: `extrato-atual-${aluno.id || card.alunoId}` })}

              <details data-financas-historico-details="${aluno.id}" style="border-top:1px solid #262626;padding-top:10px;" ${STATE.historicoAberto[aluno.id] ? 'open' : ''}>
                <summary style="cursor:pointer;color:#ffd700;font-weight:700;font-size:0.875rem;">Ver ciclos anteriores</summary>
                <div id="financas-historico-conteudo-${aluno.id}" style="margin-top:10px;">${montarHtmlHistorico(aluno.id)}</div>
              </details>
            `}
          </article>
        `;
    }

    function renderizarCards() {
        if (!telaFinancasAtiva()) return;
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;

        const foco = document.activeElement;
        const atributo = foco && foco.getAttributeNames().find((nome) => nome.startsWith('data-financas-'));
        const detalheFocado = foco && foco.tagName === 'SUMMARY' ? foco.parentElement : null;
        const idDetalhe = detalheFocado && (detalheFocado.getAttribute('data-financas-historico-details') || detalheFocado.getAttribute('data-financas-extrato-details'));
        const cards = filtrarCards(STATE.cards);
        if (cards.length === 0) {
            renderizarVazio('Nenhum aluno para exibir.');
            return;
        }

        conteudo.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">${cards.map(renderizarCard).join('')}</div>`;
        let novoFoco;
        if (atributo) novoFoco = Array.from(conteudo.querySelectorAll(`[${atributo}]`)).find((el) => el.getAttribute(atributo) === foco.getAttribute(atributo) && el.getAttribute('data-ciclo-id') === foco.getAttribute('data-ciclo-id'));
        else if (idDetalhe) novoFoco = Array.from(conteudo.querySelectorAll('details')).find((el) => (el.getAttribute('data-financas-historico-details') || el.getAttribute('data-financas-extrato-details')) === idDetalhe)?.querySelector('summary');
        if (novoFoco) novoFoco.focus({ preventScroll: true });
    }

    function atualizarCabecalhoCache() {
        if (!telaFinancasAtiva()) return;
        const label = document.getElementById('financasCacheLabel');
        const syncState = document.getElementById('financasSyncState');
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;

        if (label) {
            label.textContent = cache && cache.atualizadoEm
                ? `Cache atualizado em ${new Date(cache.atualizadoEm).toLocaleString('pt-BR')}`
                : '';
        }
        if (syncState) {
            if (STATE.carregando) {
                syncState.textContent = 'Carregando...';
            } else if (STATE.salvando) {
                syncState.textContent = 'Salvando...';
            } else if (STATE.erro) {
                syncState.textContent = STATE.erro;
            } else {
                syncState.textContent = '';
            }
        }
    }

    function carregarFinancas(opcoes = {}) {
        const operacao = opcoes.operacao;
        const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || contextoDados.capturar();
        const interacao = contextoDados.capturarInteracao();
        const voo = leituraFinancasEmVoo;
        if (opcoes.reutilizarEmVoo === true && voo && contextoDados.atual(voo.contexto)
            && voo.contexto.ownerEmail === contexto.ownerEmail && voo.contexto.geracao === contexto.geracao
            && voo.interacao === interacao && voo.operacao === operacao
            && voo.timeoutMs === (opcoes.timeoutMs || 40000)) return voo.promise;
        const novo = { contexto, interacao, operacao, timeoutMs: opcoes.timeoutMs || 40000 };
        leituraFinancasEmVoo = novo;
        novo.promise = executarLeituraFinancas({ ...opcoes, contextoDados: contexto }).finally(() => {
            if (leituraFinancasEmVoo === novo) leituraFinancasEmVoo = null;
        });
        return novo.promise;
    }

    async function executarLeituraFinancas(opcoes = {}) {
        const operacao = opcoes.operacao;
        const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || contextoDados.capturar();
        const interacao = contextoDados.capturarInteracao();
        if (!contextoDados.atual(contexto)) {
            if (!operacao && telaFinancasAtiva()) renderizarVazio('Faça login para carregar o financeiro.');
            return false;
        }
        if (!contextoDados.podeAplicarInteracao(interacao, operacao)) return false;
        const requestId = ++STATE.requestId;
        const podeAplicar = () => requestId === STATE.requestId && contextoDados.atual(contexto) && contextoDados.podeAplicarInteracao(interacao, operacao);
        const deveForcarRemoto = opcoes.forcarRemoto === true;
        const silencioso = opcoes.silencioso === true;
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;

        STATE.carregando = true;
        STATE.erro = null;
        atualizarCabecalhoCache();
        // 5.8 (Parte A): o container do conteúdo sinaliza o estado de carga
        // enquanto a chamada estiver em voo (incluindo cache exibida + refresh
        // remoto em andamento).
        const conteudoAgora = telaFinancasAtiva() && document.getElementById('financasConteudo');
        if (conteudoAgora) conteudoAgora.setAttribute('aria-busy', 'true');

        if (silencioso && STATE.cards.length > 0) {
            renderizarCards();
        } else if (cache && cache.dados && !deveForcarRemoto) {
            STATE.cards = Array.isArray(cache.dados) ? cache.dados : [];
            renderizarCards();
        } else {
            if (telaFinancasAtiva()) renderizarSkeleton();
        }

        try {
            // Etapa 6 (2026-09-30): o fetch roda no mesmo mecanismo de feedback das demais
            // telas — toast de progresso só se a operação passar de 3s (limiar do wrapper).
            // A falha segue tratada pela própria tela (abaixo), por isso exibirFalha: false;
            // o refresh em background (silencioso, ex.: após pagamento/ajuste) não exibe toast.
            const executor = () => global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas`, { operacao, contextoDados: contexto }, opcoes.timeoutMs || 40000);
            const resposta = typeof global.executarOperacaoRemotaComFeedback === 'function'
                ? await global.executarOperacaoRemotaComFeedback(executor, {
                    contexto: 'carregandoFinancas',
                    exibirFalha: false,
                    silenciosoUI: silencioso
                })
                : await executor();
            if (resposta.status === 401) {
                throw new Error('AUTH_REQUIRED');
            }
            if (!resposta.ok) {
                throw new Error(`Falha ao carregar finanças (${resposta.status})`);
            }

            const dados = await resposta.json();
            if (!podeAplicar()) return false;
            if (!Array.isArray(dados)) throw new Error('Listagem financeira inválida.');
            STATE.cards = Array.isArray(dados) ? dados : [];
            Object.keys(STATE.ciclosAguardandoLeitura).forEach((id) => {
                if (!STATE.ciclosAguardandoLeitura[id].historico) delete STATE.ciclosAguardandoLeitura[id];
            });
            if (typeof global.salvarCacheFinancas === 'function') {
                global.salvarCacheFinancas(STATE.cards, contexto);
            }
            STATE.cacheAtualizadoEm = new Date().toISOString();
            STATE.erro = null;
            renderizarCards();
            return true;
        } catch (error) {
            if (!podeAplicar()) return false;
            if (!cache || deveForcarRemoto) {
                STATE.erro = error && error.message === 'AUTH_REQUIRED'
                    ? 'Faça login para carregar o financeiro.'
                    : 'Não foi possível atualizar agora.';
                if (!silencioso && typeof global.mostrarToast === 'function') {
                    global.mostrarToast(STATE.erro, 'warning');
                }
                if (!cache && telaFinancasAtiva()) {
                    renderizarVazio(STATE.erro);
                }
            }
            return false;
        } finally {
            // Uma leitura antiga não apaga o indicador nem o erro da operação seguinte.
            if (podeAplicar()) {
                STATE.carregando = false;
                atualizarCabecalhoCache();
                const conteudoAgora = telaFinancasAtiva() && document.getElementById('financasConteudo');
                if (conteudoAgora) conteudoAgora.setAttribute('aria-busy', 'false');
            }
        }
    }

    function abrirModalPagamento(cardId, cicloId) {
        if (STATE.salvando) return;
        if (STATE.ciclosAguardandoLeitura[cicloId]) {
            if (typeof global.mostrarToast === 'function') global.mostrarToast('Alteração já salva. Atualize os dados antes de editar este ciclo novamente.', 'warning');
            return;
        }
        const alvo = obterCicloParaAcao(cardId, cicloId);
        if (!alvo || alvo.ciclo.dataPagamento) return;

        ensureModais();
        STATE.cardAtivo = { tipo: 'pagamento', cardId, cicloId: alvo.ciclo._id, historico: alvo.historico };

        const modal = document.getElementById('modalFinancasPagamento');
        const resumo = document.getElementById('financasPagamentoResumo');
        const dataInput = document.getElementById('financasDataPagamento');
        const formaInput = document.getElementById('financasFormaPagamento');
        if (resumo) resumo.textContent = `${alvo.card.aluno.nome} • ${formatarDataBR(alvo.ciclo.cicloInicio)} → ${formatarDataBR(alvo.ciclo.cicloFim)}`;
        if (dataInput) dataInput.value = new Date().toISOString().slice(0, 10);
        if (formaInput) formaInput.value = '';
        abrirDialogFinancas(modal, 'pagamento');
    }

    function abrirModalAjuste(cardId, cicloId) {
        if (STATE.salvando) return;
        if (STATE.ciclosAguardandoLeitura[cicloId]) {
            if (typeof global.mostrarToast === 'function') global.mostrarToast('Alteração já salva. Atualize os dados antes de editar este ciclo novamente.', 'warning');
            return;
        }
        const alvo = obterCicloParaAcao(cardId, cicloId);
        if (!alvo || alvo.ciclo.dataPagamento) return;

        ensureModais();
        STATE.cardAtivo = { tipo: 'ajuste', cardId, cicloId: alvo.ciclo._id, historico: alvo.historico };

        const modal = document.getElementById('modalFinancasAjuste');
        const resumo = document.getElementById('financasAjusteResumo');
        const extrasInput = document.getElementById('financasAulasExtras');
        const observacaoInput = document.getElementById('financasObservacaoAjuste');
        if (resumo) resumo.textContent = `${alvo.card.aluno.nome} • ${formatarDataBR(alvo.ciclo.cicloInicio)} → ${formatarDataBR(alvo.ciclo.cicloFim)}`;
        if (extrasInput) extrasInput.value = String(alvo.ciclo.aulasManuaisExtras || 0);
        if (observacaoInput) observacaoInput.value = alvo.ciclo.observacaoAjuste || '';
        abrirDialogFinancas(modal, 'ajuste');
    }

    function abrirDialogFinancas(modal, tipo) {
        if (!modal) return;
        if (global.DialogController && typeof global.DialogController.open === 'function') {
            global.DialogController.open(modal, {
                trigger: document.activeElement || null,
                // Fechar durante o PATCH zeraria STATE.cardAtivo e quebraria a confirmação do salvamento.
                onRequestClose: function () {
                    if (!STATE.salvando) fecharModal(tipo);
                }
            });
            return;
        }
        // Fallback legado: abre diretamente quando o DialogController não foi carregado.
        // Mantido porque a suíte valida o fluxo sem controlador (view-financas-historico.test.js).
        contextoDados.definirFormulario(modal, true);
        modal.style.display = 'flex';
    }

    function fecharModal(tipo) {
        if (STATE.salvando) return;
        const modal = document.getElementById(tipo === 'pagamento' ? 'modalFinancasPagamento' : 'modalFinancasAjuste');
        const naPilha = modal && global.DialogController && typeof global.DialogController.getStack === 'function'
            && global.DialogController.getStack().includes(modal);
        if (naPilha) {
            global.DialogController.close(modal);
        } else if (modal) {
            modal.style.display = 'none';
            contextoDados.definirFormulario(modal, false);
        }
        STATE.cardAtivo = null;
    }

    async function salvarPagamento(event) {
        event.preventDefault();
        const dataPagamento = document.getElementById('financasDataPagamento');
        const formaPagamento = document.getElementById('financasFormaPagamento');
        await salvarAlteracaoFinancas('pagamento', {
            dataPagamento: dataPagamento ? dataPagamento.value : null,
            formaPagamento: formaPagamento ? formaPagamento.value.trim() : ''
        }, 'btnSalvarPagamento');
    }

    async function salvarAjuste(event) {
        event.preventDefault();
        const extrasInput = document.getElementById('financasAulasExtras');
        const observacaoInput = document.getElementById('financasObservacaoAjuste');
        await salvarAlteracaoFinancas('ajuste', {
            aulasManuaisExtras: extrasInput ? extrasInput.value : '0',
            observacaoAjuste: observacaoInput ? observacaoInput.value : ''
        }, 'btnSalvarAjuste');
    }

    async function salvarAlteracaoFinancas(tipo, dados, botaoId) {
        const contexto = contextoDados.capturar();
        if (!contextoDados.atual(contexto) || STATE.salvando || !STATE.cardAtivo || !STATE.cardAtivo.cicloId || STATE.cardAtivo.tipo !== tipo) return;
        const cardAtivo = { ...STATE.cardAtivo };
        const alvos = { cicloIds: [cardAtivo.cicloId], alunoIds: [cardAtivo.cardId], agendamentoIds: [], reposicaoIds: [] };
        const intencao = { cicloId: cardAtivo.cicloId, alunoId: cardAtivo.cardId, ...dados };
        const op = contextoDados.iniciarOperacao({ tipo: tipo === 'pagamento' ? 'pagamento-financeiro' : 'ajuste-financeiro', contexto, alvos, intencao });
        if (!op) {
            if (typeof global.abrirRecuperacaoDados === 'function') await global.abrirRecuperacaoDados();
            return;
        }
        STATE.operacao = op;
        const btn = document.getElementById(botaoId);
        if (btn) btn.disabled = true;
        STATE.salvando = true;
        atualizarCabecalhoCache();
        let escritaConfirmada = false;
        try {
            if (!contextoDados.operacaoAtual(op)) throw new Error('CONTEXTO_OBSOLETO');
            if (!contextoDados.atualizarOperacao(op, { alvos, intencao })) throw new Error('Não foi possível preservar a alteração.');
            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas/${encodeURIComponent(cardAtivo.cicloId)}/${tipo}`, {
                method: 'PATCH',
                operacao: op,
                contextoDados: op.contexto,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) throw new Error(`Falha ao salvar ${tipo} (${resposta.status})`);
            escritaConfirmada = true;
            if (!contextoDados.operacaoAtual(op)) return;
            STATE.ciclosAguardandoLeitura[cardAtivo.cicloId] = { alunoId: cardAtivo.cardId, historico: cardAtivo.historico };

            const opcoesLeitura = { operacao: op, contextoDados: op.contexto };
            const atualizado = cardAtivo.historico
                ? await carregarHistoricoAluno(cardAtivo.cardId, { ...opcoesLeitura, forcar: true })
                : await carregarFinancas({ ...opcoesLeitura, forcarRemoto: true, silencioso: true });
            if (!contextoDados.operacaoAtual(op)) return;
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast(atualizado
                    ? (tipo === 'pagamento' ? 'Pagamento confirmado com sucesso!' : 'Ajuste salvo com sucesso!')
                    : 'Alteração salva, mas a tela não foi atualizada. Tente novamente apenas a leitura.', atualizado ? 'success' : 'warning');
            }
        } catch (error) {
            // apiFetchBackend pode confirmar o HTTP e só então detectar a troca de sessão.
            escritaConfirmada = escritaConfirmada || op.etapas.some((etapa) => etapa.method === 'PATCH' && etapa.confirmada);
            if (!escritaConfirmada) contextoDados.marcarFalhaOperacao(op, error);
            if (escritaConfirmada && contextoDados.operacaoAtual(op)) STATE.ciclosAguardandoLeitura[cardAtivo.cicloId] = { alunoId: cardAtivo.cardId, historico: cardAtivo.historico };
            if (contextoDados.operacaoAtual(op) && typeof global.mostrarToast === 'function') {
                global.mostrarToast(escritaConfirmada
                    ? 'Alteração salva. Atualize apenas os dados; não repita a gravação.'
                    : (error && error.message === 'AUTH_REQUIRED' ? 'Faça login para salvar na nuvem.' : `Gravação de ${tipo} não confirmada. Verifique os dados no servidor.`), escritaConfirmada ? 'warning' : 'error');
            }
        } finally {
            try { await contextoDados.finalizarOperacao(op); }
            finally {
                if (contextoDados.atual(op.contexto) && STATE.operacao === op) {
                    STATE.operacao = null;
                    STATE.salvando = false;
                    if (btn) btn.disabled = false;
                    if (escritaConfirmada) fecharModal(tipo);
                    atualizarCabecalhoCache();
                }
            }
        }
    }

    function bindHandlers() {
        if (STATE.handlersBound) return;
        const root = obterRoot();
        root.addEventListener('click', function (event) {
            const pagarBtn = event.target.closest('[data-financas-pagar]');
            if (pagarBtn) {
                abrirModalPagamento(pagarBtn.getAttribute('data-financas-pagar'), pagarBtn.getAttribute('data-ciclo-id'));
                return;
            }

            const ajusteBtn = event.target.closest('[data-financas-ajuste]');
            if (ajusteBtn) {
                abrirModalAjuste(ajusteBtn.getAttribute('data-financas-ajuste'), ajusteBtn.getAttribute('data-ciclo-id'));
                return;
            }

            const configurarBtn = event.target.closest('[data-financas-configurar]');
            if (configurarBtn && typeof global.prepararEdicaoAluno === 'function') {
                const contexto = contextoDados.capturar();
                if (!contextoDados.atual(contexto)) return;
                const alunoId = configurarBtn.getAttribute('data-financas-configurar');
                if (typeof global.__appShell !== 'undefined' && global.__appShell.router && typeof global.__appShell.router.navigateTo === 'function') {
                    global.__appShell.router.navigateTo('tela-alunos').then(function () {
                        if (!contextoDados.atual(contexto)) return;
                        global.prepararEdicaoAluno(alunoId);
                    });
                } else {
                    global.prepararEdicaoAluno(alunoId);
                }
                return;
            }

            const retryHistoricoBtn = event.target.closest('[data-financas-historico-retry]');
            if (retryHistoricoBtn) {
                carregarHistoricoAluno(retryHistoricoBtn.getAttribute('data-financas-historico-retry'), { forcar: true });
            }
        });

        // 'toggle' não borbulha, mas a fase de captura no root alcança qualquer <details> descendente.
        root.addEventListener('toggle', function (event) {
            const details = event.target;
            if (!details || typeof details.matches !== 'function') return;

            if (details.matches('[data-financas-extrato-details]')) {
                const identificador = details.getAttribute('data-financas-extrato-details');

                if (!details.open) {
                    delete STATE.extratoAberto[identificador];
                    return;
                }

                STATE.extratoAberto[identificador] = true;
                return;
            }

            if (!details.matches('[data-financas-historico-details]')) return;
            const alunoId = details.getAttribute('data-financas-historico-details');

            if (!details.open) {
                delete STATE.historicoAberto[alunoId];
                return; // fechar não dispara carregamento
            }

            STATE.historicoAberto[alunoId] = true;
            // carregarHistoricoAluno já retorna cedo se o histórico estiver 'pronto'/'carregando',
            // então um toggle redundante (ex.: disparado ao montar um <details> já `open`) é inofensivo.
            carregarHistoricoAluno(alunoId);
        }, true);

        const pagamentoModal = document.getElementById('modalFinancasPagamento');
        const ajusteModal = document.getElementById('modalFinancasAjuste');
        if (pagamentoModal) {
            pagamentoModal.addEventListener('click', function (event) {
                if (event.target && event.target.getAttribute && event.target.getAttribute('data-financas-close') === 'pagamento') {
                    fecharModal('pagamento');
                }
            });
        }
        if (ajusteModal) {
            ajusteModal.addEventListener('click', function (event) {
                if (event.target && event.target.getAttribute && event.target.getAttribute('data-financas-close') === 'ajuste') {
                    fecharModal('ajuste');
                }
            });
        }

        const formPagamento = document.getElementById('formFinancasPagamento');
        const formAjuste = document.getElementById('formFinancasAjuste');
        const dataPagamento = document.getElementById('financasDataPagamento');
        if (dataPagamento && !dataPagamento.dataset.calendarioAtivo) {
            dataPagamento.dataset.calendarioAtivo = 'true';
            dataPagamento.addEventListener('click', function () {
                if (typeof dataPagamento.showPicker !== 'function') return;
                try {
                    dataPagamento.showPicker();
                } catch (_) {
                    // O seletor nativo padrão permanece disponível quando showPicker não puder abrir.
                }
            });
        }
        if (formPagamento) {
            formPagamento.addEventListener('submit', salvarPagamento);
        }
        if (formAjuste) {
            formAjuste.addEventListener('submit', salvarAjuste);
        }

        STATE.handlersBound = true;
    }

    window.inicializarFinancas = async function (opcoes = {}) {
        if (!contextoDados.podeLer(opcoes.operacao)) return false;
        obterRoot();
        ensureModais();
        renderizarCabecalho();
        bindHandlers();
        return await carregarFinancas(opcoes);
    };

    window.renderizarFinancas = function () {
        if (!telaFinancasAtiva()) return;
        if (!document.getElementById('financasConteudo')) renderizarCabecalho();
        bindHandlers();
        renderizarCards();
        atualizarCabecalhoCache();
    };

    // D1: leitura própria existente, compartilhada quando compatível; nunca reinicializa.
    window.atualizarFinancasAposSync = function (opcoes = {}) {
        if (!contextoDados.podeLer(opcoes.operacao)) return false;
        if (telaFinancasAtiva() && !document.getElementById('financasConteudo')) {
            renderizarCabecalho();
            ensureModais();
            bindHandlers();
        }
        return carregarFinancas({ ...opcoes, forcarRemoto: true, silencioso: true, reutilizarEmVoo: true });
    };

    // Consumido pelo card do aluno (view-alunos.js) para não duplicar o cálculo de ciclo no frontend.
    window.obterResumoFinanceiroPorAluno = function () {
        if (!contextoDados.atual(contextoDados.capturar())) return {};
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;
        const fonte = STATE.cards.length > 0
            ? STATE.cards
            : (cache && Array.isArray(cache.dados) ? cache.dados : []);

        const mapa = {};
        fonte.forEach((card) => {
            if (card && card.alunoId) mapa[card.alunoId] = card;
        });
        return mapa;
    };

    window.garantirDadosFinancas = async function (opcoes = {}) {
        const contexto = opcoes.contextoDados || (opcoes.operacao && opcoes.operacao.contexto) || contextoDados.capturar();
        const interacao = contextoDados.capturarInteracao();
        const podeAplicar = () => contextoDados.atual(contexto) && contextoDados.podeAplicarInteracao(interacao, opcoes.operacao);
        if (!podeAplicar()) throw new Error('CONTEXTO_OBSOLETO');
        if (STATE.cards.length === 0 || opcoes.forcarRemoto) {
            const atualizado = await carregarFinancas({ ...opcoes, contextoDados: contexto, silencioso: true, forcarRemoto: !!opcoes.forcarRemoto });
            if (opcoes.forcarRemoto && !atualizado) throw new Error('Não foi possível atualizar o financeiro.');
        }
        if (!podeAplicar()) throw new Error('CONTEXTO_OBSOLETO');
        return window.obterResumoFinanceiroPorAluno();
    };

    // Recuperação explícita: consulta dados atuais; nunca reenvia pagamento/ajuste.
    window.atualizarFinancasAposRecuperacao = async function (alvos = {}, opcoes = {}) {
        const contexto = opcoes.contextoDados || contextoDados.capturar();
        const interacao = contextoDados.capturarInteracao();
        const podeAplicar = () => contextoDados.atual(contexto) && contextoDados.podeAplicarInteracao(interacao);
        if (!podeAplicar()) return false;
        const alunoIds = Array.isArray(alvos.alunoIds) ? alvos.alunoIds : [];
        const abertos = Object.keys(STATE.historicoAberto).filter((id) => STATE.historicoAberto[id] && (!alunoIds.length || alunoIds.includes(id)));
        // Abandonar a intenção invalida também históricos fechados e callbacks em voo.
        // A próxima expansão consulta o servidor, sem prefetch de todos os históricos.
        Object.keys(STATE.historicoPorAluno).forEach((alunoId) => {
            if (alunoIds.length && !alunoIds.includes(alunoId)) return;
            const estado = STATE.historicoPorAluno[alunoId];
            estado.requestId += 1;
            estado.status = 'idle';
            estado.dados = [];
            estado.erro = null;
        });
        if (!await carregarFinancas({ forcarRemoto: true, silencioso: true, contextoDados: contexto, reutilizarEmVoo: false })) return false;
        if (!podeAplicar()) return false;
        let sucesso = true;
        for (const alunoId of abertos) {
            if (!podeAplicar()) return false;
            if (!STATE.historicoAberto[alunoId]) continue;
            const atualizado = await carregarHistoricoAluno(alunoId, { forcar: true, contextoDados: contexto });
            sucesso = atualizado && sucesso;
        }
        return podeAplicar() && sucesso;
    };

    window.__financasState = STATE;
})(window);
