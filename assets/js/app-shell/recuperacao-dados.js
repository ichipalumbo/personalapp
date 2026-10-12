// Saída explícita para intenção local não confirmada. Nunca reenvia escrita nem desfaz remoto.
(function (global) {
    const contexto = global.contextoDados;
    const MENSAGEM_PADRAO = 'Sua alteração está guardada neste aparelho. Ela pode já ter sido salva. Verifique no servidor.';
    const MENSAGEM_COMPLEMENTO = 'Dados locais substituídos, mas não foi possível atualizar todos os dados complementares. Atualize apenas a leitura.';
    const requisicoes = new Set();
    let consulta = 0;
    let emAndamento = false;
    let tentativaExibida = null;
    let complementoPendente = null;
    let primeiraLeitura = true;

    function elementos() {
        return { painel: document.getElementById('recuperacaoDados'), texto: document.getElementById('recuperacaoDadosMensagem'), verificar: document.getElementById('btnVerificarDadosServidor'), usar: document.getElementById('btnUsarDadosServidor') };
    }
    function escreverMensagem(mensagem) {
        const texto = elementos().texto;
        if (texto) texto.textContent = mensagem;
    }
    function atualizar() {
        // obterPendencia sincroniza a sessão; não comparar tentativas antes dessa validação.
        const pendencia = contexto.obterPendencia();
        if (complementoPendente && !contexto.atual(complementoPendente.conta)) complementoPendente = null;
        const tentativaAtual = pendencia ? `${pendencia.ownerEmail}:${pendencia.tentativaId}` : null;
        if (tentativaAtual !== tentativaExibida) {
            tentativaExibida = tentativaAtual;
            if (pendencia) complementoPendente = null;
            escreverMensagem(MENSAGEM_PADRAO);
        }
        const el = elementos();
        if (el.painel) el.painel.hidden = !pendencia && !complementoPendente;
        if (!pendencia) escreverMensagem(complementoPendente ? MENSAGEM_COMPLEMENTO : MENSAGEM_PADRAO);
        if (el.verificar) el.verificar.disabled = emAndamento || !contexto.semOperacoes() || (!pendencia && !complementoPendente);
        if (el.usar) el.usar.disabled = emAndamento || !contexto.semOperacoes() || !pendencia;
    }
    function consultaAtual(rodada) {
        if (!contexto.atual(rodada.conta)) return false;
        if (rodada.id !== consulta || !contexto.semOperacoes()) return false;
        const pendenciaAtual = contexto.obterPendencia(rodada.conta);
        if (rodada.resultado) {
            return !pendenciaAtual && contexto.podeAplicarInteracao(rodada.interacao);
        }
        return Boolean(pendenciaAtual && pendenciaAtual.tentativaId === rodada.pendencia.tentativaId);
    }
    function conferirConsulta(rodada) {
        if (!consultaAtual(rodada)) throw new Error('CONTEXTO_OBSOLETO');
    }
    async function comPrazo(rodada, timeoutMs, executar) {
        conferirConsulta(rodada);
        const controller = new AbortController();
        requisicoes.add(controller);
        let timer;
        let cancelar;
        const interrupcao = new Promise((_, reject) => {
            cancelar = () => {
                const erro = new Error('Leitura cancelada.');
                erro.name = 'AbortError';
                reject(erro);
            };
            controller.signal.addEventListener('abort', cancelar, { once: true });
            timer = setTimeout(() => {
                reject(new Error('Tempo limite da leitura excedido. A alteração local foi preservada.'));
                controller.abort();
            }, timeoutMs);
        });
        try {
            const resultado = await Promise.race([interrupcao, executar(controller.signal)]);
            conferirConsulta(rodada);
            return resultado;
        } finally {
            clearTimeout(timer);
            controller.signal.removeEventListener('abort', cancelar);
            requisicoes.delete(controller);
        }
    }
    async function lerAlvo(url, rodada, aceitarAusente = false) {
        // O prazo cobre headers E json; a API pública não expõe seu leitor privado.
        return await comPrazo(rodada, 8000, async (signal) => {
            conferirConsulta(rodada);
            const resposta = await global.apiFetchBackend(url, { method: 'GET', contextoDados: rodada.conta, signal }, 8000);
            conferirConsulta(rodada);
            if (aceitarAusente && resposta.status === 404) return { existe: false };
            if (!resposta.ok) throw new Error('Não foi possível verificar os dados complementares. A alteração local foi preservada.');
            const dados = await resposta.json();
            conferirConsulta(rodada);
            return { existe: true, dados };
        });
    }
    async function verificarAlvos(pendencia, rodada) {
        const alvos = pendencia.alvos || {};
        const base = global.APP_API_CONFIG.apiBaseUrl;
        const dados = [];
        for (const id of alvos.reposicaoIds || []) {
            conferirConsulta(rodada);
            const alvo = await lerAlvo(`${base}/reposicoes/${encodeURIComponent(id)}`, rodada, true);
            conferirConsulta(rodada);
            if (alvo.existe && (!alvo.dados || typeof alvo.dados !== 'object' || Array.isArray(alvo.dados))) throw new Error('Reposição inválida. A alteração local foi preservada.');
            dados.push({ tipo: 'reposicao', ...alvo });
        }
        if ((alvos.cicloIds || []).length) {
            if (!(alvos.alunoIds || []).length) throw new Error('Não foi possível identificar o aluno do ciclo. A alteração local foi preservada.');
            for (const id of alvos.alunoIds || []) {
                conferirConsulta(rodada);
                const alvo = await lerAlvo(`${base}/financas/${encodeURIComponent(id)}/historico`, rodada);
                conferirConsulta(rodada);
                if (!Array.isArray(alvo.dados) || alvo.dados.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Histórico inválido. A alteração local foi preservada.');
                dados.push({ tipo: 'financas', dados: alvo.dados });
            }
        }
        return dados;
    }
    async function fecharFormularios(rodada) {
        conferirConsulta(rodada);
        // Impedir o retorno ao histórico antes de fechar o reagendamento.
        global._retornoHistoricoReposicoes = null;
        const fechamentos = [
            'fecharEdicaoCobrancaReposicao', 'fecharHistoricoReposicoes',
            'fecharModalRecorrencia', 'fecharAgendamentoModal', 'fecharReagendarAulaModal',
            'fecharModalAcaoSlot', 'fecharEscolhaTipoModal', 'fecharModalConfigAgenda', 'closeUserAreaModal'
        ];
        if (typeof global.togglePainelCadastro === 'function') global.togglePainelCadastro(false);
        for (const nome of fechamentos) {
            conferirConsulta(rodada);
            if (typeof global[nome] === 'function') {
                await global[nome]();
                conferirConsulta(rodada);
            }
        }
        // close não executa onRequestClose (que pode confirmar, buscar ou reabrir outro modal).
        if (global.DialogController) {
            const pilha = global.DialogController.getStack().slice().reverse();
            for (const modal of pilha) {
                conferirConsulta(rodada);
                global.DialogController.close(modal);
            }
        }
        conferirConsulta(rodada);
        document.querySelectorAll('.modal-overlay form, #formNovoAluno').forEach((form) => form.reset());
        global.reposicaoIdEmReagendamento = null;
        global.reagendamentoDirectCardId = null;
    }
    async function atualizarComplementos(rodada) {
        let sucesso = true;
        let financasAtualizadas = false;
        // Tentar ambos mesmo quando o financeiro falhar: histórico/indicadores antigos não podem sobreviver.
        const atualizadores = [
            async () => {
                const resultado = typeof global.atualizarFinancasAposRecuperacao === 'function'
                    ? await global.atualizarFinancasAposRecuperacao(rodada.pendencia.alvos || {}, { contextoDados: rodada.conta }) : false;
                financasAtualizadas = resultado === true || Boolean(resultado && resultado.ok === true);
                return resultado;
            },
            () => typeof global.atualizarAlunosAposRecuperacao === 'function'
                ? global.atualizarAlunosAposRecuperacao({ contextoDados: rodada.conta, financasAtualizadas }) : false
        ];
        for (const atualizarComplemento of atualizadores) {
            conferirConsulta(rodada);
            try {
                const resultado = await atualizarComplemento();
                conferirConsulta(rodada);
                if (resultado === false || (resultado && resultado.ok === false)) sucesso = false;
            } catch (_) {
                conferirConsulta(rodada);
                sucesso = false;
            }
        }
        conferirConsulta(rodada);
        if (global.modoHomeAtivo === 'dia' && global.renderizarHomeDia) global.renderizarHomeDia();
        else if (global.renderizarHomeSemana) global.renderizarHomeSemana();
        return sucesso;
    }
    function resultadoAplicado(rodada, incompleto) {
        const resultado = { ...rodada.resultado, complementoPendente: incompleto };
        // Uma interação nova adia o complemento, mas não desfaz a adoção já concluída.
        if (contexto.atual(rodada.conta) && rodada.id === consulta && !contexto.obterPendencia(rodada.conta)) {
            complementoPendente = incompleto ? { conta: rodada.conta, pendencia: rodada.pendencia, resultado } : null;
            atualizar();
        }
        return resultado;
    }
    async function consultar(usar) {
        const conta = contexto.capturar();
        if (!contexto.atual(conta)) return { ok: false, estado: 'descartado' };
        const pendencia = contexto.obterPendencia(conta);
        const complemento = !pendencia && complementoPendente && contexto.atual(complementoPendente.conta) ? complementoPendente : null;
        if ((!pendencia && !complemento) || emAndamento || !contexto.semOperacoes() || (usar && !pendencia)) return { ok: false, estado: 'adiado' };
        if (complemento && !contexto.podeLer()) return { ok: false, estado: 'adiado', motivo: 'formulario-aberto' };
        if (usar && !global.confirm('Descartar a alteração local e os formulários abertos e usar os dados atuais do servidor? Isso não desfaz o que já foi gravado. Uma gravação cuja resposta se perdeu ainda pode terminar no servidor.')) return { ok: false, estado: 'adiado', motivo: 'cancelado' };
        const rodada = { conta, pendencia: pendencia || complemento.pendencia, id: ++consulta, resultado: complemento ? complemento.resultado : null, interacao: contexto.capturarInteracao() };
        emAndamento = true;
        atualizar();
        try {
            conferirConsulta(rodada);
            if (complemento) {
                const atualizado = await atualizarComplementos(rodada);
                conferirConsulta(rodada);
                return resultadoAplicado(rodada, !atualizado);
            }
            if (usar) {
                await fecharFormularios(rodada);
                conferirConsulta(rodada);
                if (!contexto.podeLer()) return { ok: false, estado: 'adiado', motivo: 'formulario-aberto' };
                rodada.interacao = contexto.capturarInteracao();
            }
            const timeoutMs = primeiraLeitura ? 40000 : 8000;
            // Sempre uma leitura nova após a confirmação; jamais adotar o snapshot de uma verificação anterior.
            const leitura = await comPrazo(rodada, timeoutMs, (signal) => global.obterLeituraDados({ verificacao: !usar, contextoDados: conta, signal, timeoutMs }));
            conferirConsulta(rodada);
            if (!leitura || !leitura.ok) throw new Error('Não foi possível verificar os dados agora. A alteração local foi preservada.');
            primeiraLeitura = false;
            await verificarAlvos(pendencia, rodada);
            conferirConsulta(rodada);
            if (usar) {
                const resultado = global.aplicarLeituraDados(leitura, { tentativaId: pendencia.tentativaId });
                if (!resultado || !resultado.ok) {
                    if (!consultaAtual(rodada)) return { ok: false, estado: 'descartado' };
                    escreverMensagem('Não foi possível adotar os dados. A alteração local foi preservada.');
                    return resultado || { ok: false, estado: 'falha' };
                }
                rodada.resultado = resultado;
                rodada.interacao = contexto.capturarInteracao();
                conferirConsulta(rodada);
                const atualizado = await atualizarComplementos(rodada);
                conferirConsulta(rodada);
                return resultadoAplicado(rodada, !atualizado);
            }
            escreverMensagem('Consulta concluída. Sua alteração segue guardada. Uma gravação ainda pode estar em andamento.');
            return { ok: true, estado: 'verificado' };
        } catch (erro) {
            if (!contexto.atual(conta) || rodada.id !== consulta) return { ok: false, estado: 'descartado' };
            // A intenção já foi abandonada: falha de complemento não é falha da adoção nem motivo para escrita/retry.
            if (rodada.resultado) return resultadoAplicado(rodada, true);
            if (!consultaAtual(rodada)) return { ok: false, estado: 'descartado' };
            escreverMensagem(erro.message);
            return { ok: false, estado: 'falha' };
        } finally {
            if (contexto.atual(conta) && rodada.id === consulta) {
                emAndamento = false;
                atualizar();
            }
        }
    }
    global.abrirRecuperacaoDados = function () {
        atualizar();
        const painel = elementos().painel;
        if (painel && !painel.hidden) painel.focus({ preventScroll: true });
    };
    global.verificarDadosServidor = () => consultar(false);
    global.usarDadosServidor = () => consultar(true);
    contexto.aoMudarInteracao(atualizar);
    contexto.aoInvalidar(() => {
        consulta++;
        emAndamento = false;
        tentativaExibida = null;
        complementoPendente = null;
        primeiraLeitura = true;
        requisicoes.forEach((controller) => controller.abort());
        escreverMensagem(MENSAGEM_PADRAO);
        atualizar();
    });
    const el = elementos();
    if (el.verificar) el.verificar.addEventListener('click', global.verificarDadosServidor);
    if (el.usar) el.usar.addEventListener('click', global.usarDadosServidor);
    atualizar();
})(window);