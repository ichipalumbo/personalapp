// [TAG-VIEW-FINANCAS] view-financas.js
// Responsabilidade: Tela de Finanças por ciclo, leitura com cache local e escritas confirmadas pelo backend

(function (global) {
    const STATE = {
        cards: [],
        filtro: 'todos',
        carregando: false,
        salvando: false,
        erro: null,
        cacheAtualizadoEm: null,
        cardAtivo: null,
        handlersBound: false,
        // Histórico de ciclos anteriores, carregado sob demanda e cacheado em memória por aluno (6.2.2).
        // Nunca gravado no localStorage; descartado ao recarregar a página.
        historicoPorAluno: {},
        // Alunos com "Ver ciclos anteriores" expandido — persistido por aluno para sobreviver a re-renders.
        historicoAberto: {}
    };

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
            pagamentoModal.innerHTML = `
              <div class="modal" style="max-width: 420px">
                <h3><i class="fa-solid fa-circle-check" style="color:#ffd700;margin-right:8px"></i>Marcar como pago</h3>
                <p id="financasPagamentoResumo" style="font-size:0.78rem;color:#a8a8a8;margin-bottom:14px;font-weight:500;"></p>
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
            ajusteModal.innerHTML = `
              <div class="modal" style="max-width: 420px">
                <h3><i class="fa-solid fa-sliders" style="color:#ffd700;margin-right:8px"></i>Ajuste manual</h3>
                <p id="financasAjusteResumo" style="font-size:0.78rem;color:#a8a8a8;margin-bottom:14px;font-weight:500;"></p>
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
        const cacheLabel = cache && cache.atualizadoEm ? `Cache atualizado em ${new Date(cache.atualizadoEm).toLocaleString('pt-BR')}` : 'Sem cache local';

        root.innerHTML = `
          <section class="agenda-panel" style="margin-top: 0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <h2 style="margin:0;color:#ffd700;font-size:1.25rem;font-weight:800;">💰 Finanças</h2>
                <p style="margin:4px 0 0;color:#9a9a9a;font-size:0.78rem;">Ciclo vigente por aluno, com leitura cacheada e escrita confirmada pelo backend.</p>
              </div>
              <div style="text-align:right;">
                <div id="financasCacheLabel" style="font-size:0.72rem;color:#8e8e8e;">${cacheLabel}</div>
                <div id="financasSyncState" style="font-size:0.72rem;color:#8e8e8e;margin-top:4px;"></div>
              </div>
            </div>
            <div class="tab-tipo-agendamento" style="display:flex;gap:6px;margin-top:14px;background:#0d0d0d;padding:4px;border-radius:8px;border:1px solid #2a2a2a;">
              ${['todos', 'atrasado', 'em_aberto', 'pago', 'pendente'].map((status) => {
                const labels = {
                    todos: 'Todos',
                    atrasado: 'Atrasado',
                    em_aberto: 'Em aberto',
                    pago: 'Pago',
                    pendente: 'Pendente'
                };
                const ativo = STATE.filtro === status ? 'active' : '';
                return `<button type="button" class="tab-btn ${ativo}" data-financas-filtro="${status}">${labels[status]}</button>`;
              }).join('')}
            </div>
          </section>
          <section id="financasConteudo"></section>
        `;
    }

    function renderizarSkeleton() {
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;

        conteudo.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${Array.from({ length: 3 }).map(() => `
              <div class="aluno-card" style="opacity:0.7;border-left-color:#3a3a3a;">
                <div style="height:16px;width:55%;background:#1d1d1d;border-radius:999px;margin-bottom:10px;"></div>
                <div style="height:10px;width:80%;background:#1d1d1d;border-radius:999px;margin-bottom:8px;"></div>
                <div style="height:10px;width:65%;background:#1d1d1d;border-radius:999px;margin-bottom:12px;"></div>
                <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
                  <div style="height:72px;background:#1d1d1d;border-radius:10px;"></div>
                  <div style="height:72px;background:#1d1d1d;border-radius:10px;"></div>
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
        return lista.filter((card) => {
            const status = obterStatusCard(card);
            if (STATE.filtro === 'todos') return true;
            if (STATE.filtro === 'pendente') return !!card.configuracaoPendente;
            return status === STATE.filtro;
        }).sort((a, b) => {
            const ordA = statusOrder(obterStatusCard(a), a && a.configuracaoPendente);
            const ordB = statusOrder(obterStatusCard(b), b && b.configuracaoPendente);
            return ordA - ordB;
        });
    }

    function renderizarVazio(mensagem) {
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;
        conteudo.innerHTML = `
          <div class="agenda-panel" style="text-align:center;color:#8e8e8e;">
            <i class="fa-solid fa-wallet" style="font-size:2rem;margin-bottom:10px;display:block;color:#ffd700;"></i>
            <p style="margin:0;font-size:0.92rem;">${mensagem}</p>
          </div>
        `;
    }

    function resumoCiclo(card) {
        if (!card || !card.cicloAtual) return 'Sem ciclo';
        const ciclo = card.cicloAtual;
        const status = ciclo.status === 'pago' ? '🟢 Pago' : (ciclo.status === 'atrasado' ? '🔴 Atrasado' : '🟡 Em aberto');
        return `${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)} • ${status}`;
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
        const valorExibicao = ciclo && ciclo.metodoCobranca === 'valor_fixo' ? formatarMoeda(0) : formatarMoeda(valorTotal);
        const quantidadeHtml = Number.isFinite(quantidade) && quantidade !== 0
            ? `<div style="margin-top:4px;color:#8e8e8e;font-size:0.68rem;">Qtd.: ${quantidade}</div>`
            : '';
        const notaHtml = nota
            ? `<div style="margin-top:4px;color:#8e8e8e;font-size:0.68rem;">Nota: ${nota}</div>`
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
                <div style="color:#f0f0f0;font-size:0.76rem;font-weight:700;">${rotuloTipo}</div>
                <div style="margin-top:4px;color:#e8e8e8;font-size:0.76rem;word-break:break-word;">${descricao}</div>
                ${quantidadeHtml}
                ${notaHtml}
              </div>
              <div style="color:#ffd700;font-weight:800;font-size:0.76rem;white-space:nowrap;">${valorExibicao}</div>
            </div>
          </div>
        `;
    }

    function renderizarConteudoExtrato(ciclo) {
        if (!ciclo) {
            return '<div style="color:#8e8e8e;font-size:0.78rem;">Extrato indisponível.</div>';
        }

        if (ciclo.extrato === null) {
            return '<div style="color:#8e8e8e;font-size:0.78rem;">Extrato não registrado para este ciclo.</div>';
        }

        const linhas = Array.isArray(ciclo.extrato) ? ciclo.extrato : [];
        if (linhas.length === 0) {
            return '<div style="color:#8e8e8e;font-size:0.78rem;">Não há lançamentos.</div>';
        }

        const totalLabel = ciclo.metodoCobranca === 'valor_fixo'
            ? `Total do ciclo ${formatarMoeda(ciclo.valorTotalCiclo)} • valor fixo`
            : `Total do ciclo ${formatarMoeda(ciclo.valorTotalCiclo)}`;

        return `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${linhas.map((linha) => renderizarLinhaExtrato(linha, ciclo)).join('')}
            <div style="padding-top:8px;border-top:1px solid #262626;color:#ffd700;font-size:0.78rem;font-weight:800;">${escaparHtml(totalLabel)}</div>
          </div>
        `;
    }

    function renderizarDetalhesExtrato(ciclo, opcoes = {}) {
        const identificador = opcoes.identificador || `extrato-${String(ciclo && ciclo._id ? ciclo._id : (ciclo && ciclo.cicloInicio) || 'ciclo')}`;
        const rotulo = opcoes.rotulo || 'Ver extrato do ciclo';
        const aberto = opcoes.aberto === true ? 'open' : '';

        return `
          <details data-financas-extrato-details="${escaparHtml(identificador)}" style="border-top:1px solid #262626;padding-top:10px;" ${aberto}>
            <summary style="cursor:pointer;color:#ffd700;font-weight:700;font-size:0.82rem;">${escaparHtml(rotulo)}</summary>
            <div style="margin-top:10px;">${renderizarConteudoExtrato(ciclo)}</div>
          </details>
        `;
    }

    function renderizarListaHistorico(historico) {
        const lista = Array.isArray(historico) ? historico : [];
        if (lista.length === 0) {
            return '<p style="margin:0;color:#8e8e8e;font-size:0.78rem;">Sem ciclos anteriores.</p>';
        }

        return `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${lista.map((ciclo) => {
                const status = ciclo.status === 'pago' ? 'Pago' : (ciclo.status === 'atrasado' ? 'Atrasado' : 'Em aberto');
                const valor = formatarMoeda(ciclo.valorTotalCiclo);
                const extratoKey = String(ciclo && ciclo._id ? ciclo._id : `${ciclo.cicloInicio || ''}-${ciclo.cicloFim || ''}`);
                return `
                  <div style="border:1px solid #262626;border-radius:10px;padding:10px 12px;background:#0f0f0f;">
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                      <strong style="color:#fff;font-size:0.84rem;">${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)}</strong>
                      <span style="color:${ciclo.status === 'pago' ? '#81c784' : (ciclo.status === 'atrasado' ? '#ff8a80' : '#ffd700')};font-size:0.72rem;font-weight:700;">${status}</span>
                    </div>
                    <div style="font-size:0.75rem;color:#9a9a9a;margin-top:6px;">
                      ${totalAulasCobradas(ciclo)} aulas cobradas (${ciclo.aulasContadas || 0} registradas, ${descreverAjuste(ciclo.aulasManuaisExtras)}) • ${valor}
                    </div>
                    ${renderizarDetalhesExtrato(ciclo, { identificador: `extrato-historico-${extratoKey}`, rotulo: 'Ver extrato do ciclo' })}
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
            return '<p style="margin:0;color:#8e8e8e;font-size:0.78rem;">Carregando ciclos anteriores...</p>';
        }
        if (estado.status === 'erro') {
            return `
              <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
                <p style="margin:0;color:#ff8a80;font-size:0.78rem;">${estado.erro || 'Não foi possível carregar o histórico.'}</p>
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
        const estado = obterEstadoHistorico(alunoId);
        const forcar = opcoes.forcar === true;
        if (!forcar && (estado.status === 'pronto' || estado.status === 'carregando')) {
            renderizarConteudoHistorico(alunoId);
            return;
        }

        const card = STATE.cards.find((item) => item && item.alunoId === alunoId);
        if (!forcar && card && card.historicoDisponivel === false) {
            estado.status = 'pronto';
            estado.dados = [];
            estado.erro = null;
            renderizarConteudoHistorico(alunoId);
            return;
        }

        const requestId = ++estado.requestId;
        estado.status = 'carregando';
        estado.erro = null;
        renderizarConteudoHistorico(alunoId);

        try {
            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(alunoId)}/historico`, {}, opcoes.timeoutMs || 40000);
            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) throw new Error(`Falha ao carregar histórico (${resposta.status})`);
            const dados = await resposta.json();

            // Ignora respostas tardias de uma chamada já substituída por outra mais recente para o mesmo aluno.
            if (requestId !== estado.requestId) return;

            estado.status = 'pronto';
            estado.dados = Array.isArray(dados) ? dados : [];
            estado.erro = null;
        } catch (error) {
            if (requestId !== estado.requestId) return;
            estado.status = 'erro';
            estado.erro = error && error.message === 'AUTH_REQUIRED'
                ? 'Faça login para carregar o histórico.'
                : 'Não foi possível carregar o histórico agora.';
        }

        renderizarConteudoHistorico(alunoId);
    }

    function renderizarCard(card) {
        const aluno = card.aluno || {};
        const ciclo = card.cicloAtual || {};
        const status = obterStatusCard(card);
        const statusLabel = card.configuracaoPendente ? '⚠️ Pendente' : (status === 'pago' ? '🟢 Pago' : (status === 'atrasado' ? '🔴 Atrasado' : '🟡 Em aberto'));
        const total = formatarMoeda(ciclo.valorTotalCiclo);
        const metodo = ciclo.metodoCobranca === 'valor_fixo' ? 'Valor fixo' : 'Por aula';
        const aulasExtras = ciclo.aulasManuaisExtras || 0;
        const aulasContadas = ciclo.aulasContadas || 0;
        const aulasCobradas = totalAulasCobradas(ciclo);

        return `
          <article class="aluno-card" data-financas-card-id="${aluno.id || card.alunoId}" style="display:flex;flex-direction:column;gap:10px;position:relative;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
              <div style="min-width:0;">
                <strong style="display:block;color:#fff;font-size:1.02rem;word-break:break-word;">${escaparHtml(aluno.nome || 'Aluno')}</strong>
                <div style="margin-top:4px;font-size:0.72rem;color:#b8b8b8;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  <span>${statusLabel}</span>
                  ${card.configuracaoPendente ? '' : `<span>• ${resumoCiclo(card)}</span>`}
                </div>
              </div>
              <span style="font-size:0.72rem;font-weight:800;color:${card.configuracaoPendente ? '#ff8a80' : (status === 'pago' ? '#81c784' : (status === 'atrasado' ? '#ff8a80' : '#ffd700'))};text-transform:uppercase;letter-spacing:0.4px;">${statusLabel.replace(/[🟢🟡🔴⚠️]\s*/, '')}</span>
            </div>

            ${card.configuracaoPendente ? `
              <div style="padding:12px;border:1px dashed rgba(255,215,0,0.28);border-radius:10px;background:rgba(255,215,0,0.04);color:#ddd;">
                <p style="margin:0 0 8px;font-size:0.88rem;">Configure o dia de vencimento para calcular a cobrança.</p>
                <button type="button" class="btn btn-primary" data-financas-configurar="${aluno.id}" style="width:100%;">Configurar agora</button>
              </div>
            ` : `
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.64rem;color:#8e8e8e;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Ciclo atual</div>
                  <div style="margin-top:6px;font-size:0.82rem;color:#fff;font-weight:700;">${formatarDataBR(ciclo.cicloInicio)} → ${formatarDataBR(ciclo.cicloFim)}</div>
                  <div style="margin-top:4px;font-size:0.72rem;color:#a8a8a8;">${status === 'atrasado' ? 'Venceu' : 'Vigente'}</div>
                </div>
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.64rem;color:#8e8e8e;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Cobrança</div>
                  <div style="margin-top:6px;font-size:0.82rem;color:#fff;font-weight:700;">${metodo}</div>
                  <div style="margin-top:4px;font-size:0.72rem;color:#a8a8a8;">${status === 'pago' ? 'Pagamento confirmado' : 'Pagamento manual'}</div>
                </div>
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.64rem;color:#8e8e8e;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Aulas</div>
                  <div style="margin-top:6px;font-size:0.82rem;color:#fff;font-weight:700;">${aulasCobradas} aula(s) cobrada(s)</div>
                  <div style="margin-top:4px;font-size:0.72rem;color:#a8a8a8;">${aulasContadas} registradas • ${descreverAjuste(aulasExtras)}</div>
                </div>
                <div style="background:#101010;border:1px solid #232323;border-radius:10px;padding:10px;">
                  <div style="font-size:0.64rem;color:#8e8e8e;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Valor</div>
                  <div style="margin-top:6px;font-size:0.92rem;color:#ffd700;font-weight:800;">${total}</div>
                  <div style="margin-top:4px;font-size:0.72rem;color:#a8a8a8;">${status === 'pago' ? 'Pago' : 'A receber'}</div>
                </div>
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary" data-financas-pagar="${aluno.id}" data-ciclo-id="${ciclo._id || ''}" ${status === 'pago' ? 'disabled' : ''}>Marcar como pago</button>
                <button type="button" class="btn btn-secondary" data-financas-ajuste="${aluno.id}" data-ciclo-id="${ciclo._id || ''}" ${status === 'pago' ? 'disabled' : ''}>Editar ajuste</button>
              </div>

              ${renderizarDetalhesExtrato(ciclo, { identificador: `extrato-atual-${aluno.id || card.alunoId}`, rotulo: 'Ver extrato do ciclo' })}

              <details data-financas-historico-details="${aluno.id}" style="border-top:1px solid #262626;padding-top:10px;" ${STATE.historicoAberto[aluno.id] ? 'open' : ''}>
                <summary style="cursor:pointer;color:#ffd700;font-weight:700;font-size:0.82rem;">Ver ciclos anteriores</summary>
                <div id="financas-historico-conteudo-${aluno.id}" style="margin-top:10px;">${montarHtmlHistorico(aluno.id)}</div>
              </details>
            `}
          </article>
        `;
    }

    function renderizarCards() {
        const conteudo = document.getElementById('financasConteudo');
        if (!conteudo) return;

        const cards = filtrarCards(STATE.cards);
        if (cards.length === 0) {
            renderizarVazio('Nenhum aluno corresponde ao filtro atual.');
            return;
        }

        conteudo.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">${cards.map(renderizarCard).join('')}</div>`;
    }

    function atualizarCabecalhoCache() {
        const label = document.getElementById('financasCacheLabel');
        const syncState = document.getElementById('financasSyncState');
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;

        if (label) {
            label.textContent = cache && cache.atualizadoEm
                ? `Cache atualizado em ${new Date(cache.atualizadoEm).toLocaleString('pt-BR')}`
                : 'Sem cache local';
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

    async function carregarFinancas(opcoes = {}) {
        const deveForcarRemoto = opcoes.forcarRemoto === true;
        const silencioso = opcoes.silencioso === true;
        const cache = typeof global.obterCacheFinancas === 'function' ? global.obterCacheFinancas() : null;

        STATE.carregando = true;
        STATE.erro = null;
        atualizarCabecalhoCache();

        if (cache && cache.dados && !deveForcarRemoto) {
            STATE.cards = Array.isArray(cache.dados) ? cache.dados : [];
            renderizarCards();
        } else {
            renderizarSkeleton();
        }

        try {
            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas`, {}, opcoes.timeoutMs || 40000);
            if (resposta.status === 401) {
                throw new Error('AUTH_REQUIRED');
            }
            if (!resposta.ok) {
                throw new Error(`Falha ao carregar finanças (${resposta.status})`);
            }

            const dados = await resposta.json();
            STATE.cards = Array.isArray(dados) ? dados : [];
            if (typeof global.salvarCacheFinancas === 'function') {
                global.salvarCacheFinancas(STATE.cards);
            }
            STATE.cacheAtualizadoEm = new Date().toISOString();
            STATE.erro = null;
            renderizarCards();
        } catch (error) {
            if (!cache || deveForcarRemoto) {
                STATE.erro = error && error.message === 'AUTH_REQUIRED'
                    ? 'Faça login para carregar o financeiro.'
                    : 'Não foi possível atualizar agora.';
                if (!silencioso && typeof global.mostrarToast === 'function') {
                    global.mostrarToast(STATE.erro, 'warning');
                }
                if (!cache) {
                    renderizarVazio(STATE.erro);
                }
            }
        } finally {
            STATE.carregando = false;
            atualizarCabecalhoCache();
        }
    }

    function abrirModalPagamento(cardId, cicloId) {
        const card = STATE.cards.find((item) => item && item.alunoId === cardId);
        if (!card || !card.cicloAtual) return;

        ensureModais();
        STATE.cardAtivo = { tipo: 'pagamento', cardId: cardId, cicloId: cicloId || card.cicloAtual._id };

        const modal = document.getElementById('modalFinancasPagamento');
        const resumo = document.getElementById('financasPagamentoResumo');
        const dataInput = document.getElementById('financasDataPagamento');
        const formaInput = document.getElementById('financasFormaPagamento');
        if (resumo) resumo.textContent = `${card.aluno.nome} • ${formatarDataBR(card.cicloAtual.cicloInicio)} → ${formatarDataBR(card.cicloAtual.cicloFim)}`;
        if (dataInput) dataInput.value = new Date().toISOString().slice(0, 10);
        if (formaInput) formaInput.value = '';
        if (modal) modal.style.display = 'flex';
    }

    function abrirModalAjuste(cardId, cicloId) {
        const card = STATE.cards.find((item) => item && item.alunoId === cardId);
        if (!card || !card.cicloAtual) return;

        ensureModais();
        STATE.cardAtivo = { tipo: 'ajuste', cardId: cardId, cicloId: cicloId || card.cicloAtual._id };

        const modal = document.getElementById('modalFinancasAjuste');
        const resumo = document.getElementById('financasAjusteResumo');
        const extrasInput = document.getElementById('financasAulasExtras');
        const observacaoInput = document.getElementById('financasObservacaoAjuste');
        if (resumo) resumo.textContent = `${card.aluno.nome} • ${formatarDataBR(card.cicloAtual.cicloInicio)} → ${formatarDataBR(card.cicloAtual.cicloFim)}`;
        if (extrasInput) extrasInput.value = String(card.cicloAtual.aulasManuaisExtras || 0);
        if (observacaoInput) observacaoInput.value = card.cicloAtual.observacaoAjuste || '';
        if (modal) modal.style.display = 'flex';
    }

    function fecharModal(tipo) {
        const modal = document.getElementById(tipo === 'pagamento' ? 'modalFinancasPagamento' : 'modalFinancasAjuste');
        if (modal) modal.style.display = 'none';
        STATE.cardAtivo = null;
    }

    async function salvarPagamento(event) {
        event.preventDefault();
        if (!STATE.cardAtivo || !STATE.cardAtivo.cicloId) return;

        const dataPagamento = document.getElementById('financasDataPagamento');
        const formaPagamento = document.getElementById('financasFormaPagamento');
        const btn = document.getElementById('btnSalvarPagamento');
        if (btn) btn.disabled = true;
        STATE.salvando = true;
        atualizarCabecalhoCache();

        try {
            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/pagamento`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataPagamento: dataPagamento ? dataPagamento.value : null,
                    formaPagamento: formaPagamento ? formaPagamento.value.trim() : ''
                })
            });

            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) throw new Error(`Falha ao salvar pagamento (${resposta.status})`);

            fecharModal('pagamento');
            await carregarFinancas({ forcarRemoto: true, silencioso: true });
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('Pagamento confirmado com sucesso!', 'success');
            }
        } catch (error) {
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast(error && error.message === 'AUTH_REQUIRED' ? 'Faça login para salvar na nuvem.' : 'Não foi possível salvar o pagamento.', 'error');
            }
        } finally {
            STATE.salvando = false;
            if (btn) btn.disabled = false;
            atualizarCabecalhoCache();
        }
    }

    async function salvarAjuste(event) {
        event.preventDefault();
        if (!STATE.cardAtivo || !STATE.cardAtivo.cicloId) return;

        const extrasInput = document.getElementById('financasAulasExtras');
        const observacaoInput = document.getElementById('financasObservacaoAjuste');
        const btn = document.getElementById('btnSalvarAjuste');
        if (btn) btn.disabled = true;
        STATE.salvando = true;
        atualizarCabecalhoCache();

        try {
            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/ajuste`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aulasManuaisExtras: extrasInput ? extrasInput.value : '0',
                    observacaoAjuste: observacaoInput ? observacaoInput.value : ''
                })
            });

            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) throw new Error(`Falha ao salvar ajuste (${resposta.status})`);

            fecharModal('ajuste');
            await carregarFinancas({ forcarRemoto: true, silencioso: true });
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('Ajuste salvo com sucesso!', 'success');
            }
        } catch (error) {
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast(error && error.message === 'AUTH_REQUIRED' ? 'Faça login para salvar na nuvem.' : 'Não foi possível salvar o ajuste.', 'error');
            }
        } finally {
            STATE.salvando = false;
            if (btn) btn.disabled = false;
            atualizarCabecalhoCache();
        }
    }

    function bindHandlers() {
        if (STATE.handlersBound) return;
        const root = obterRoot();
        root.addEventListener('click', function (event) {
            const filtroBtn = event.target.closest('[data-financas-filtro]');
            if (filtroBtn) {
                STATE.filtro = filtroBtn.getAttribute('data-financas-filtro') || 'todos';
                root.querySelectorAll('[data-financas-filtro]').forEach((btn) => btn.classList.remove('active'));
                filtroBtn.classList.add('active');
                renderizarCards();
                return;
            }

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
                const alunoId = configurarBtn.getAttribute('data-financas-configurar');
                if (typeof global.__appShell !== 'undefined' && global.__appShell.router && typeof global.__appShell.router.navigateTo === 'function') {
                    global.__appShell.router.navigateTo('tela-alunos').then(function () {
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
            if (!details || typeof details.matches !== 'function' || !details.matches('[data-financas-historico-details]')) return;
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
        if (formPagamento) {
            formPagamento.addEventListener('submit', salvarPagamento);
        }
        if (formAjuste) {
            formAjuste.addEventListener('submit', salvarAjuste);
        }

        STATE.handlersBound = true;
    }

    window.inicializarFinancas = async function (opcoes = {}) {
        obterRoot();
        ensureModais();
        renderizarCabecalho();
        bindHandlers();
        await carregarFinancas(opcoes);
    };

    window.renderizarFinancas = function () {
        renderizarCabecalho();
        bindHandlers();
        renderizarCards();
        atualizarCabecalhoCache();
    };

    // Consumido pelo card do aluno (view-alunos.js) para não duplicar o cálculo de ciclo no frontend.
    window.obterResumoFinanceiroPorAluno = function () {
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
        if (STATE.cards.length === 0 || opcoes.forcarRemoto) {
            await carregarFinancas({ silencioso: true, forcarRemoto: !!opcoes.forcarRemoto });
        }
        return window.obterResumoFinanceiroPorAluno();
    };

    window.__financasState = STATE;
})(window);
