// [TAG-GCAL-BACKEND] google-calendar.js
// Responsabilidade: ponte frontend->backend para calendário.
// Não executa chamadas diretas para a API do Google Calendar no navegador.
// Expõe compatibilidade com APIs antigas usadas por outros módulos.

(function (global) {
    'use strict';

    async function _ensureCalendarConnection(options) {
        const opts = options && typeof options === 'object' ? options : {};

        if (!global.googleIdentity || typeof global.googleIdentity.ensureCalendarConnection !== 'function') {
            return { connected: false, reason: 'google-identity-unavailable' };
        }

        try {
            return await global.googleIdentity.ensureCalendarConnection(opts);
        } catch (error) {
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('Não foi possível conectar à Google Agenda agora.', 'warning');
            }
            return { connected: false, error: error.message || 'connection-failed' };
        }
    }

    function _isAppSignedIn() {
        return !!(global.googleIdentity
            && typeof global.googleIdentity.isSignedIn === 'function'
            && global.googleIdentity.isSignedIn());
    }

    async function _persistirDadosComBackend(silencioso, operacao) {
        if (typeof global.salvarDados !== 'function') {
            return { ok: false, motivo: 'falha_remota' };
        }

        if (!global.contextoDados.operacaoAtual(operacao)) return { ok: false, motivo: 'sessao_expirada' };
        const resultado = await global.salvarDados(!!silencioso, { operacao, contextoDados: operacao.contexto });

        if (!resultado || resultado.ok !== true) {
            return resultado || { ok: false, motivo: 'falha_remota' };
        }

        if (typeof global.inicializarHome === 'function') {
            try {
                const atualizada = await global.inicializarHome({ operacao, contextoDados: operacao.contexto });
                if (atualizada !== false) return resultado;
            } catch (_) {
                // O Mongo já confirmou: falha de refresh não é falha de gravação.
            }
            if (!silencioso && global.contextoDados.operacaoAtual(operacao) && typeof global.mostrarToast === 'function') {
                global.mostrarToast('Alteração salva, mas a tela não foi atualizada. Atualize apenas os dados; não repita a gravação.', 'warning');
            }
            return { ...resultado, atualizacaoPendente: true };
        }

        return resultado;
    }

    async function _verificarCanalGoogleCalendar() {
        if (!_isAppSignedIn()) {
            if (window.log && typeof window.log.debug === 'function') {
                window.log.debug('[gcal]', 'Sem sessão Google; ignorando verificação do canal de webhook.');
            }
            return { renewed: false, synced: false, skipped: true, reason: 'not_signed_in' };
        }

        const endpoint = `${global.APP_API_CONFIG.apiBaseUrl}/gcal/webhook/renew`;

        try {
            const resposta = await global.apiFetchBackend(endpoint, { method: 'POST' }, 30000);
            const dados = await resposta.json().catch(() => ({}));
            const payload = dados && typeof dados === 'object' ? dados : {};
            const renewed = !!payload.renewed;
            const synced = !!payload.synced;
            const reason = payload.reason || 'unknown';

            if (renewed && window.log && typeof window.log.info === 'function') {
                window.log.info('[gcal]', 'Canal renovado', {
                    reason,
                    synced,
                    activeItems: Number(payload.activeItems || 0),
                    cancelledItems: Number(payload.cancelledItems || 0)
                });
            } else if (!renewed && reason === 'channel_valid' && window.log && typeof window.log.debug === 'function') {
                window.log.debug('[gcal]', 'Canal ainda válido, nada a fazer', { reason });
            } else if (!renewed && reason !== 'channel_valid' && window.log && typeof window.log.warn === 'function') {
                const logPayload = { reason };
                if (payload.error) {
                    logPayload.error = payload.error;
                }
                window.log.warn('[gcal]', 'Falha ao verificar/renovar o canal do Google Calendar.', logPayload);
            }

            if (synced && window.log && typeof window.log.info === 'function') {
                window.log.info('[gcal]', 'Sync de recuperação concluída', {
                    reason,
                    activeItems: Number(payload.activeItems || 0),
                    cancelledItems: Number(payload.cancelledItems || 0)
                });
            }

            return payload;
        } catch (error) {
            const mensagem = error && error.message ? error.message : String(error);
            if (window.log && typeof window.log.warn === 'function') {
                window.log.warn('[gcal]', 'Falha ao verificar/renovar o canal do Google Calendar.', { mensagem });
            }
            return { renewed: false, synced: false, skipped: true, reason: 'renewal_failed', error: mensagem };
        }
    }

    global.gcal = {
        isSignedIn: function () {
            return _isAppSignedIn();
        },

        requestSignIn: function (afterAuthCallback, options) {
            var opts = options && typeof options === 'object' ? options : {};
            _ensureCalendarConnection({ interactive: opts.auto !== true }).then(function () {
                if (typeof afterAuthCallback === 'function') {
                    afterAuthCallback();
                }
            });
        }
    };

    global.renovarCanalGoogleCalendar = _verificarCanalGoogleCalendar;

    global.salvarEventoComGCal = async function (_agendamento, opcoes) {
        var opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        var silencioso = opts.silencioso === true;

        const propria = !opts.operacao || typeof opts.operacao !== 'object';
        const operacao = propria ? global.contextoDados.iniciarOperacao({ tipo: 'agenda', contexto: opts.contextoDados }) : opts.operacao;
        if (!operacao) return { ok: false, motivo: 'falha_remota' };
        try {
            if (_isAppSignedIn()) {
                await _ensureCalendarConnection({ interactive: true, force: false, operacao, contextoDados: operacao.contexto });
            }
            if (!global.contextoDados.operacaoAtual(operacao)) return { ok: false, motivo: 'sessao_expirada' };
            const resultado = await _persistirDadosComBackend(silencioso, operacao);
            if (!resultado.ok) global.contextoDados.marcarFalhaOperacao(operacao, resultado);
            return resultado;
        } catch (erro) {
            global.contextoDados.marcarFalhaOperacao(operacao, erro);
            return { ok: false, motivo: 'falha_remota' };
        } finally {
            if (propria) await global.contextoDados.finalizarOperacao(operacao);
        }
    };

    global.solicitarSyncCalendario = async function (opcoes) {
        var opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        return _ensureCalendarConnection({ interactive: opts.allowInteractive === true, force: false });
    };

    global.iniciarSyncGoogleCalendar = async function (opcoes) {
        var opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        return _ensureCalendarConnection({ interactive: opts.auto === true ? false : opts.allowInteractive === true, force: opts.force === true });
    };

    global.iniciarSyncGoogleCalendarAutomatica = async function () {
        // Etapa 6 (2026-09-29): religado ao toast unificado via contexto 'syncCalendario' —
        // antes rodava direto, sem passar por nenhum feedback de progresso/sucesso na UI.
        if (typeof global.executarOperacaoRemotaComFeedback === 'function') {
            return global.executarOperacaoRemotaComFeedback(function () {
                return _ensureCalendarConnection({ interactive: false, force: false });
            }, { contexto: 'syncCalendario', exibirFalha: false });
        }
        return _ensureCalendarConnection({ interactive: false, force: false });
    };

    global.sincronizarBloqueiosExternos = async function () {
        return { skipped: true, reason: 'backend-owned-sync' };
    };

    global.inicializarUltimaSincronizacao = function () {
        var labelEl = document.getElementById('ultimaSincronizacao');
        if (labelEl) {
            labelEl.style.display = 'none';
        }
    };
})(window);
