// D2: coordenação B2 inerte até iniciar() explícito. A ligação ao boot pertence ao D3.
(function (global) {
    const contextoDados = global.contextoDados;
    const leituras = global.leiturasDados;
    if (!contextoDados || !leituras) throw new Error('contexto-dados.js e storage.js precisam carregar antes do coordenador B2.');

    let ativo = false;
    let rodada = null;
    let agendado = false;
    const voos = new Set();
    let removerObservadores = [];

    function mesmaConta(a, b) {
        return a && b && a.ownerEmail === b.ownerEmail && a.geracao === b.geracao;
    }
    function cancelar(voo) {
        voo.controller.abort();
        leituras.finalizarFeedback(voo.feedback);
    }
    function sincronizarRodada() {
        const contexto = contextoDados.capturar();
        if (!rodada || !mesmaConta(rodada.contexto, contexto)) {
            if (rodada && rodada.voo) cancelar(rodada.voo);
            rodada = { contexto, estado: 'pendente', motivo: null, aguardarEvento: false, versaoRetomada: 0, voo: null, resultado: null };
        }
        return rodada;
    }
    function agendar() {
        if (!ativo || agendado) return;
        agendado = true;
        Promise.resolve().then(() => {
            agendado = false;
            if (ativo) processar();
        });
    }
    function interacaoMudou() {
        if (!ativo) return;
        const atual = sincronizarRodada();
        if (atual.voo && !contextoDados.podeAplicarInteracao(atual.voo.interacao)) cancelar(atual.voo);
        agendar();
    }
    function retomar() {
        if (!ativo) return;
        const atual = sincronizarRodada();
        atual.versaoRetomada += 1;
        atual.aguardarEvento = false;
        agendar();
    }
    function reciboCompativel(atual) {
        const recibo = leituras.ultimaAplicacao();
        return recibo && mesmaConta(recibo.contexto, atual.contexto) && !recibo.operacao && !recibo.recuperacao
            && recibo.interacao === contextoDados.capturarInteracao()
            && contextoDados.podeLer() && !contextoDados.obterPendencia(atual.contexto) ? recibo : null;
    }
    function processar() {
        const atual = sincronizarRodada();
        if (atual.estado === 'aplicado' || atual.voo) return;
        if (!contextoDados.atual(atual.contexto)) { atual.motivo = 'sem-sessao'; return; }
        const recibo = reciboCompativel(atual);
        if (recibo) {
            atual.estado = 'aplicado';
            atual.motivo = null;
            atual.aguardarEvento = false;
            atual.resultado = { ...recibo.resultado, origem: 'leitura-compativel' };
            return;
        }
        if (atual.aguardarEvento) return;
        if (global.navigator.onLine === false) { atual.motivo = 'sem-conexao'; return; }
        if (contextoDados.obterPendencia(atual.contexto)) { atual.motivo = 'pendencia-local'; return; }
        if (!contextoDados.podeLer()) { atual.motivo = 'interacao-em-andamento'; return; }
        if (leituras.emAndamento(atual.contexto) || leituras.temPedidoManual(atual.contexto)) { atual.motivo = 'leitura-em-andamento'; return; }
        void executar(atual);
    }
    async function executar(atual) {
        global.hidratarCacheDados();
        const voo = { controller: new global.AbortController(), interacao: contextoDados.capturarInteracao(), versaoRetomada: atual.versaoRetomada };
        atual.voo = voo;
        atual.estado = 'em-voo';
        atual.motivo = null;
        voos.add(voo);
        voo.reserva = leituras.reservar(atual.contexto);
        voo.feedback = leituras.iniciarFeedback(atual.contexto);
        const autorizado = () => ativo && rodada === atual && contextoDados.atual(atual.contexto) && !voo.controller.signal.aborted;
        const resultadoAtual = () => ativo && rodada === atual && contextoDados.atual(atual.contexto);
        try {
            const leitura = await global.obterLeituraDados({ contextoDados: atual.contexto, signal: voo.controller.signal });
            if (!autorizado()) return;
            const resultado = leitura.ok ? global.aplicarLeituraDados(leitura) : leitura;
            atual.resultado = { ...resultado };
            if (resultado.estado === 'aplicado') {
                // A aplicação principal conta antes dos complementos; falha de render
                // não pode repetir esse batch nem reabrir a cota da mesma conta.
                atual.estado = 'aplicado';
                atual.aguardarEvento = false;
                if (contextoDados.podeAplicarInteracao(voo.interacao)) {
                    try {
                        const render = await global.atualizarViewAtualAposSync(atual.contexto, { boot: true });
                        if (resultadoAtual() && (render === false || (render && render.ok === false))) atual.resultado.complementoPendente = true;
                    } catch (_) {
                        if (resultadoAtual()) atual.resultado.complementoPendente = true;
                    }
                }
            } else {
                atual.estado = 'pendente';
                atual.motivo = resultado.motivo;
                atual.aguardarEvento = resultado.estado === 'falha' && atual.versaoRetomada === voo.versaoRetomada;
            }
        } catch (_) {
            if (autorizado() && atual.estado !== 'aplicado') {
                atual.estado = 'pendente';
                atual.motivo = 'falha-leitura';
                atual.aguardarEvento = atual.versaoRetomada === voo.versaoRetomada;
            }
        } finally {
            leituras.finalizarFeedback(voo.feedback);
            leituras.liberar(voo.reserva);
            voos.delete(voo);
            if (atual.voo === voo) atual.voo = null;
            if (rodada === atual && atual.estado === 'em-voo') atual.estado = 'pendente';
            agendar();
        }
    }
    function iniciar(opcoes = {}) {
        if (!ativo) {
            ativo = true;
            contextoDados.iniciar();
            if (opcoes.aguardarEvento === true) {
                const atual = sincronizarRodada();
                atual.aguardarEvento = true;
                atual.motivo = opcoes.motivo || 'falha-leitura';
            }
            removerObservadores = [contextoDados.aoInvalidar(interacaoMudou), contextoDados.aoMudarInteracao(interacaoMudou), leituras.aoMudar(agendar)];
            const identidade = global.googleIdentity;
            if (identidade && typeof identidade.addAuthChangeListener === 'function') {
                const remover = identidade.addAuthChangeListener(retomar);
                if (typeof remover === 'function') removerObservadores.push(remover);
            }
            global.addEventListener('online', retomar);
        }
        processar();
        return obterEstado();
    }
    function parar() {
        ativo = false;
        removerObservadores.forEach((remover) => remover());
        removerObservadores = [];
        global.removeEventListener('online', retomar);
        voos.forEach(cancelar);
    }
    function obterEstado() {
        return {
            ativo, estado: rodada ? rodada.estado : 'inativo', motivo: rodada && rodada.motivo,
            contexto: rodada ? { ...rodada.contexto } : null,
            aguardandoEvento: Boolean(rodada && rodada.aguardarEvento),
            emVoo: Boolean(rodada && rodada.voo), resultado: rodada && rodada.resultado ? { ...rodada.resultado } : null
        };
    }
    global.syncBootDados = Object.freeze({ iniciar, parar, retomar, obterEstado });
})(window);