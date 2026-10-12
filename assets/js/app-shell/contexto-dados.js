// Isolamento do estado/cache por sessão consumidora. Não emite nem renova credenciais.
(function (global) {
    const CHAVES = ['personal_alunos', 'personal_aulas', 'personal_reposicoes', 'personal_limitesGrade', 'faturamentoMeta'];
    const DONO = 'personal_cache_dono';
    const FINANCAS = 'personal_financas_cache';
    const PENDENCIAS = 'personal_cache_pendencias';
    let dono = null;
    let geracao = 0;
    let verificando = false;
    let identidadeObservada = null;
    let removerListener = null;
    let tentativa = 0;
    const invalidadores = new Set();
    const observadores = new Set();
    const operacoes = new Set();
    const formularios = new Set();
    let geracaoInteracao = 0;
    const avisar = () => observadores.forEach((fn) => fn());

    function ler(chave) {
        try { return global.localStorage.getItem(chave); } catch (_) { return null; }
    }
    function remover(chave) {
        try { global.localStorage.removeItem(chave); return global.localStorage.getItem(chave) === null; } catch (_) { return false; }
    }
    function gravar(chave, valor) {
        try { global.localStorage.setItem(chave, valor); return true; } catch (_) { return false; }
    }
    function json(texto) {
        try { return texto ? JSON.parse(texto) : null; } catch (_) { return null; }
    }
    function copiar(valor) { return JSON.parse(JSON.stringify(valor)); }
    function donoSessao() {
        const identidade = global.googleIdentity;
        if (!identidade || typeof identidade.getIdToken !== 'function' || typeof identidade.getOwnerEmail !== 'function') return null;
        if (!identidade.getIdToken()) return null;
        const email = identidade.getOwnerEmail();
        return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    }
    function descartarLegado() {
        remover('personalTrainerData');
        if (!ler(DONO)) CHAVES.forEach(remover);
        const financeiro = json(ler(FINANCAS));
        if (financeiro && !financeiro.ownerEmail) remover(FINANCAS);
    }
    function sincronizarSessao() {
        if (verificando) return;
        verificando = true;
        try {
            descartarLegado();
            const atual = donoSessao();
            if (atual === dono) return;
            const anterior = dono;
            dono = atual;
            geracao += 1;
            geracaoInteracao += 1;
            formularios.clear();
            const modais = Array.from(global.document.querySelectorAll('.modal-overlay')).filter((el) => el.style.display && el.style.display !== 'none');
            const haviaEdicao = modais.some((el) => el.querySelector('form'));
            invalidadores.forEach((invalidar) => invalidar({ anterior, ownerEmail: dono, geracao }));
            if (anterior) {
                // Fechar sem onRequestClose: troca de conta não pode reabrir fluxos anteriores.
                const pilha = global.DialogController ? global.DialogController.getStack().slice().reverse() : [];
                pilha.forEach((modal) => global.DialogController.close(modal));
                modais.forEach((modal) => {
                    modal.style.display = 'none';
                    modal.querySelectorAll('form').forEach((form) => form.reset());
                    modal.querySelectorAll('#agendaAluno, #editAluno, #reagendarAluno').forEach((select) => select.replaceChildren());
                });
                const fundo = global.document.getElementById('appSettingsBackdrop');
                if (fundo) fundo.style.display = 'none';
                if (haviaEdicao && typeof global.mostrarToast === 'function') global.mostrarToast('A edição foi encerrada porque a conta ou a sessão mudou.', 'warning');
            }
        } finally { verificando = false; }
    }
    function capturar() {
        sincronizarSessao();
        return Object.freeze({ ownerEmail: dono, geracao });
    }
    function atual(contexto) {
        sincronizarSessao();
        return Boolean(contexto && contexto.ownerEmail && contexto.ownerEmail === dono && contexto.geracao === geracao);
    }
    function lerPendencias() {
        const dados = json(ler(PENDENCIAS));
        return dados && dados.versao === 1 && Array.isArray(dados.itens) ? dados.itens : [];
    }
    function obterPendencia(contexto = capturar()) {
        if (!atual(contexto)) return null;
        const item = lerPendencias().find((p) => p && p.ownerEmail === contexto.ownerEmail);
        return item && item.snapshot ? copiar(item) : null;
    }
    function lerPrincipal(contexto = capturar()) {
        if (!atual(contexto)) return null;
        const pendencia = obterPendencia(contexto);
        if (pendencia) return pendencia.snapshot;
        if (ler(DONO) !== contexto.ownerEmail) return null;
        const alunos = json(ler(CHAVES[0]));
        const aulas = json(ler(CHAVES[1]));
        const reposicoes = json(ler(CHAVES[2]));
        const grade = json(ler(CHAVES[3]));
        if (!Array.isArray(alunos) || !Array.isArray(aulas) || !Array.isArray(reposicoes) || !grade || typeof grade !== 'object') return null;
        return { alunos, aulas, reposicoes, grade, meta: Number(ler(CHAVES[4])) || 0 };
    }
    function salvarPrincipal(snapshot, contexto = capturar()) {
        if (!atual(contexto)) return false;
        // Remover identificação antes de gravar várias chaves: falha parcial não fica autorizada.
        if (!remover(DONO)) return false;
        const valores = [JSON.stringify(snapshot.alunos), JSON.stringify(snapshot.aulas), JSON.stringify(snapshot.reposicoes), JSON.stringify(snapshot.grade), String(snapshot.meta || 0)];
        if (!CHAVES.every((chave, indice) => gravar(chave, valores[indice]))) return false;
        return gravar(DONO, contexto.ownerEmail);
    }
    function iniciarPendencia(snapshot, contexto = capturar()) {
        if (!atual(contexto)) return null;
        const item = { ownerEmail: contexto.ownerEmail, tentativaId: `${Date.now()}-${++tentativa}-${Math.random().toString(36).slice(2)}`, criadoEm: new Date().toISOString(), snapshot: copiar(snapshot) };
        const itens = lerPendencias().filter((p) => p.ownerEmail !== contexto.ownerEmail);
        itens.push(item);
        if (!gravar(PENDENCIAS, JSON.stringify({ versao: 1, itens }))) return null;
        return item.tentativaId;
    }
    function atualizarPendencia(id, contexto, detalhes) {
        const itens = lerPendencias();
        const item = itens.find((p) => p.ownerEmail === contexto.ownerEmail && p.tentativaId === id);
        if (!item) return false;
        Object.assign(item, copiar(detalhes));
        return gravar(PENDENCIAS, JSON.stringify({ versao: 1, itens }));
    }
    function abandonarPendencia(id, contexto) {
        if (!atual(contexto)) return false;
        const itens = lerPendencias();
        if (!itens.some((p) => p.ownerEmail === contexto.ownerEmail && p.tentativaId === id)) return false;
        return gravar(PENDENCIAS, JSON.stringify({ versao: 1, itens: itens.filter((p) => p.ownerEmail !== contexto.ownerEmail || p.tentativaId !== id) }));
    }
    function snapshotLocal() {
        return copiar({ alunos: global.obterAlunos ? global.obterAlunos() : (global.alunos || []), aulas: global.obterAulas ? global.obterAulas() : (global.aulas || []), reposicoes: global.obterReposicoes ? global.obterReposicoes() : (global.aulasParaRepor || []), grade: global.obterLimitesGrade ? global.obterLimitesGrade() : { inicio: '06:00', fim: '22:00' }, meta: global.faturamentoMeta || 0 });
    }
    function operacaoAtual(op) { return Boolean(op && operacoes.has(op) && !op.finalizada && atual(op.contexto)); }
    function ocupado(op) { return Array.from(operacoes).some((outra) => outra !== op && atual(outra.contexto)); }
    function iniciarOperacao(opcoes = {}) {
        const contexto = opcoes.contexto || capturar();
        if (!atual(contexto) || obterPendencia(contexto) || ocupado()) return null;
        const id = iniciarPendencia(snapshotLocal(), contexto);
        if (!id) return null;
        const op = { contexto, id, tipo: opcoes.tipo || 'dados', alvos: opcoes.alvos || {}, intencao: opcoes.intencao || {}, etapas: [], tarefas: new Set(), falha: false, finalizada: false };
        operacoes.add(op);
        geracaoInteracao += 1;
        if (!atualizarOperacao(op, {})) {
            operacoes.delete(op);
            return null;
        }
        avisar();
        return op;
    }
    function atualizarOperacao(op, detalhes = {}) {
        if (!operacaoAtual(op)) return false;
        geracaoInteracao += 1;
        op.alvos = { ...op.alvos, ...(detalhes.alvos || {}) };
        if (detalhes.intencao) op.intencao = detalhes.intencao;
        return atualizarPendencia(op.id, op.contexto, { tipo: op.tipo, alvos: op.alvos, intencao: op.intencao, etapas: op.etapas, snapshot: snapshotLocal(), estado: op.falha ? 'desconhecida' : 'em-andamento' });
    }
    function marcarFalhaOperacao(op, erro) {
        if (!op) return;
        op.falha = true;
        atualizarPendencia(op.id, op.contexto, { estado: op.etapas.some((e) => e.confirmada) ? 'parcial' : (op.etapas.length ? 'desconhecida' : 'nao-enviada'), erro: erro && (erro.message || erro.motivo) || 'Gravação não confirmada', etapas: op.etapas });
    }
    function registrarEtapa(op, etapa) {
        if (!operacaoAtual(op) || op.falha) throw new Error('OPERACAO_INTERROMPIDA');
        op.etapas.push(etapa);
        if (!atualizarOperacao(op)) throw new Error('PENDENCIA_NAO_PERSISTIDA');
    }
    function acompanharTarefa(op, promise) {
        op.tarefas.add(promise);
        promise.then(() => op.tarefas.delete(promise), () => op.tarefas.delete(promise));
        return promise;
    }
    async function finalizarOperacao(op) {
        if (!op || op.finalizada) return;
        while (op.tarefas.size) await Promise.allSettled(Array.from(op.tarefas));
        if (operacaoAtual(op)) {
            if (!op.falha && op.etapas.every((e) => e.confirmada)) {
                if (op.etapas.length && !confirmarPendencia(op.id, op.contexto, snapshotLocal())) marcarFalhaOperacao(op, new Error('Confirmação local indisponível'));
                else abandonarPendencia(op.id, op.contexto);
            } else marcarFalhaOperacao(op);
        }
        op.finalizada = true;
        operacoes.delete(op);
        if (atual(op.contexto)) {
            geracaoInteracao += 1;
            avisar();
        }
    }
    function definirFormulario(chave, aberto) {
        if (aberto) { formularios.add(chave); geracaoInteracao += 1; }
        else formularios.delete(chave);
        avisar();
    }
    function capturarInteracao() { return geracaoInteracao; }
    function invalidarLeiturasAnteriores() { geracaoInteracao += 1; }
    function podeLer(op) { return !ocupado(op) && (op ? operacaoAtual(op) : formularios.size === 0); }
    function podeAplicarInteracao(versao, op) { return versao === geracaoInteracao && podeLer(op); }
    function semOperacoes() { return !ocupado(); }
    function confirmarPendencia(id, contexto, snapshot) {
        if (!atual(contexto)) return false;
        const itens = lerPendencias();
        const item = itens.find((p) => p.ownerEmail === contexto.ownerEmail);
        if (!item || item.tentativaId !== id || !salvarPrincipal(snapshot, contexto)) return false;
        return gravar(PENDENCIAS, JSON.stringify({ versao: 1, itens: itens.filter((p) => p !== item) }));
    }
    function atualizarVinculoPendente(id, contexto, agendamentoId, googleCalendarEventId) {
        // Pode completar o snapshot da conta antiga em disco, nunca sua projeção ativa.
        const itens = lerPendencias();
        const item = itens.find((p) => p.ownerEmail === contexto.ownerEmail && p.tentativaId === id);
        const aula = item && item.snapshot.aulas.find((a) => a.id === agendamentoId);
        if (!aula || !googleCalendarEventId) return false;
        aula.googleCalendarEventId = googleCalendarEventId;
        return gravar(PENDENCIAS, JSON.stringify({ versao: 1, itens }));
    }
    function lerFinancas(contexto = capturar()) {
        if (!atual(contexto)) return null;
        const cache = json(ler(FINANCAS));
        return cache && cache.ownerEmail === contexto.ownerEmail && Array.isArray(cache.dados) ? cache : null;
    }
    function salvarFinancas(dados, contexto = capturar()) {
        if (!atual(contexto) || !Array.isArray(dados)) return false;
        return gravar(FINANCAS, JSON.stringify({ ownerEmail: contexto.ownerEmail, atualizadoEm: new Date().toISOString(), dados }));
    }
    function iniciar() {
        if (identidadeObservada !== global.googleIdentity) {
            if (removerListener) removerListener();
            identidadeObservada = global.googleIdentity;
            removerListener = identidadeObservada && typeof identidadeObservada.addAuthChangeListener === 'function'
                ? identidadeObservada.addAuthChangeListener(sincronizarSessao) : null;
        }
        sincronizarSessao();
    }
    global.addEventListener('focus', sincronizarSessao);
    global.document.addEventListener('visibilitychange', sincronizarSessao);
    global.contextoDados = Object.freeze({
        iniciar, capturar, atual, lerPrincipal, salvarPrincipal, lerFinancas, salvarFinancas,
        obterPendencia, iniciarPendencia, confirmarPendencia,
        atualizarVinculoPendente,
        atualizarPendencia, abandonarPendencia, iniciarOperacao, operacaoAtual, atualizarOperacao,
        marcarFalhaOperacao, registrarEtapa, acompanharTarefa, finalizarOperacao,
        definirFormulario, capturarInteracao, podeLer, podeAplicarInteracao,
        invalidarLeiturasAnteriores,
        semOperacoes,
        aoMudarInteracao: (fn) => { observadores.add(fn); return () => observadores.delete(fn); },
        aoInvalidar: (fn) => { invalidadores.add(fn); return () => invalidadores.delete(fn); }
    });
})(window);