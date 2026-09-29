// [TAG-UTILS-KPI] utils-kpi.js
// Responsabilidade: componente único de feedback assíncrono (toast) e seus estados
// Expõe: mostrarToast, mostrarOverlaySinc, mostrarOverlaySleepMode, mostrarOverlayErroConexao,
//        ocultarOverlayConexao, ocultarOverlaySinc, mostrarIndicadorSyncBackground,
//        ocultarIndicadorSyncBackground
//
// Etapa 6 (2026-09-29): os 3 mecanismos que existiam (toast, overlay-sinc bloqueante,
// indicador-sync-bg silencioso) foram unificados num único elemento #toast com 4 estados
// visuais (success/warning auto-somem; progress e error ficam até resolver/o usuário agir).
// As 7 funções antigas continuam com a mesma assinatura — por dentro, delegam para o núcleo
// _exibirToast, para não exigir nenhuma mudança nos ~60 pontos de chamada existentes.

let _toastAutoHideTimer = null;
let _toastOnRetryAtivo = null;

function _elementoToast() {
    return document.getElementById('toast');
}

// [TAG-JS-TOAST] - Núcleo único de exibição do toast, com suporte a estado persistente e retry.
function _exibirToast(mensagem, estado, opcoes = {}) {
    const toast = _elementoToast();
    if (!toast) return;

    clearTimeout(_toastAutoHideTimer);
    _toastOnRetryAtivo = typeof opcoes.onRetry === 'function' ? opcoes.onRetry : null;

    toast.innerHTML = '';
    toast.className = 'toast';

    if (estado === 'progress') {
        const spinner = document.createElement('span');
        spinner.className = 'toast-spinner';
        toast.appendChild(spinner);
        toast.classList.add('progress');
    }

    const textoEl = document.createElement('span');
    textoEl.className = 'toast-msg';
    textoEl.textContent = mensagem;
    toast.appendChild(textoEl);

    if (estado === 'error') {
        toast.classList.add('error');
        if (_toastOnRetryAtivo) {
            const btnRetry = document.createElement('button');
            btnRetry.type = 'button';
            btnRetry.className = 'toast-retry';
            btnRetry.textContent = 'Tentar de novo';
            btnRetry.onclick = function () {
                const retry = _toastOnRetryAtivo;
                if (typeof retry === 'function') retry();
            };
            toast.appendChild(btnRetry);
        }
    } else if (estado === 'warning') {
        toast.classList.add('warning');
    }

    toast.setAttribute('role', estado === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', estado === 'error' ? 'assertive' : 'polite');

    setTimeout(() => toast.classList.add('show'), 10);

    if (estado !== 'progress' && estado !== 'error') {
        _toastAutoHideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function _ocultarToast() {
    const toast = _elementoToast();
    if (!toast) return;
    clearTimeout(_toastAutoHideTimer);
    _toastOnRetryAtivo = null;
    toast.classList.remove('show');
}

function mostrarToast(msg, tipo = 'success') {
    _exibirToast(msg, tipo === 'error' ? 'error' : (tipo === 'warning' ? 'warning' : 'success'));
}

// [TAG-JS-OVERLAY-SINC] - Wrappers legados: mesma assinatura, delegam para o toast único.
function mostrarOverlaySinc(mensagem, opcoes) {
    _exibirToast(mensagem || 'Salvando...', 'progress', opcoes);
}

function mostrarOverlaySleepMode(mensagem) {
    mostrarOverlaySinc(mensagem || 'Sincronizando... isso pode levar alguns segundos.');
}

function mostrarOverlayErroConexao(mensagem, opcoes) {
    _exibirToast(mensagem || 'Falha ao conectar. Banco de dados inativo.', 'error', opcoes);
}

function ocultarOverlayConexao() {
    _ocultarToast();
}

function ocultarOverlaySinc(resultado) {
    ocultarOverlayConexao();
    if (resultado === 'partial') {
        mostrarToast('⚠️ Salvo no banco. Falha na Google Agenda — o evento pode não aparecer no calendário.', 'warning');
    } else if (resultado === 'error') {
        mostrarToast('❌ Falha ao salvar. Tente novamente.', 'error');
    }
}

// [TAG-JS-INDICADOR-SYNC-BG] — Etapa 6: passou a usar o mesmo toast (estado "progress"),
// em vez do badge silencioso separado.
function mostrarIndicadorSyncBackground(mensagem) {
    _exibirToast(mensagem || 'Sincronizando calendário...', 'progress');
}

function ocultarIndicadorSyncBackground() {
    _ocultarToast();
}
