// [TAG-UTILS-KPI] utils-kpi.js
// Responsabilidade: Notificação toast e overlays/indicadores de sincronização
// Expõe: mostrarToast, mostrarOverlaySinc, mostrarOverlaySleepMode, mostrarOverlayErroConexao,
//        ocultarOverlayConexao, ocultarOverlaySinc, mostrarIndicadorSyncBackground,
//        ocultarIndicadorSyncBackground

// [TAG-JS-TOAST] - Função de exibição de toast
function mostrarToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast';
    if (tipo === 'error') toast.classList.add('error');
    if (tipo === 'warning') toast.classList.add('warning');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// [TAG-JS-OVERLAY-SINC] - Overlay bloqueante para operações de sincronização críticas

function _garantirOverlaySinc() {
    let overlay = document.getElementById('overlay-sinc');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlay-sinc';
        overlay.className = 'overlay-sinc';
        overlay.innerHTML =
            '<div class="overlay-sinc-conteudo">' +
            '<div class="overlay-sinc-spinner"></div>' +
            '<p class="overlay-sinc-msg"></p>' +
            '</div>';
        document.body.appendChild(overlay);
    }
    return overlay;
}

function mostrarOverlaySinc(mensagem) {
    const overlay = _garantirOverlaySinc();
    const spinner = overlay.querySelector('.overlay-sinc-spinner');

    if (spinner) spinner.style.display = 'block';
    overlay.classList.remove('overlay-sinc-erro');
    overlay.querySelector('.overlay-sinc-msg').textContent = mensagem || 'Salvando...';
    overlay.classList.add('ativo');
    document.body.style.pointerEvents = 'none';
}

function mostrarOverlaySleepMode(mensagem) {
    mostrarOverlaySinc(mensagem || 'Sincronizando... isso pode levar alguns segundos.');
}

function mostrarOverlayErroConexao(mensagem) {
    const overlay = _garantirOverlaySinc();
    const spinner = overlay.querySelector('.overlay-sinc-spinner');

    if (spinner) spinner.style.display = 'none';

    overlay.classList.add('overlay-sinc-erro');
    overlay.querySelector('.overlay-sinc-msg').textContent = mensagem || 'Falha ao conectar. Banco de dados inativo.';
    overlay.classList.add('ativo');
    document.body.style.pointerEvents = '';
}

function ocultarOverlayConexao() {
    const overlay = document.getElementById('overlay-sinc');
    if (!overlay) return;

    const spinner = overlay.querySelector('.overlay-sinc-spinner');
    if (spinner) spinner.style.display = 'block';

    overlay.classList.remove('overlay-sinc-erro');
    overlay.classList.remove('ativo');
    document.body.style.pointerEvents = '';
}

function ocultarOverlaySinc(resultado) {
    ocultarOverlayConexao();
    if (resultado === 'partial') {
        mostrarToast('⚠️ Salvo no banco. Falha na Google Agenda — o evento pode não aparecer no calendário.', 'warning');
    } else if (resultado === 'error') {
        mostrarToast('❌ Falha ao salvar. Tente novamente.', 'error');
    }
}

// [TAG-JS-INDICADOR-SYNC-BG] — Indicador não-bloqueante para sincronizações em background.
// Exibe um pequeno badge no canto inferior-direito sem bloquear a interação do usuário.
let _indicadorBgHideTimer = null;

function mostrarIndicadorSyncBackground(mensagem) {
    clearTimeout(_indicadorBgHideTimer);
    let badge = document.getElementById('indicador-sync-bg');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'indicador-sync-bg';
        badge.className = 'indicador-sync-bg';
        badge.innerHTML =
            '<span class="indicador-sync-bg-spinner"></span>' +
            '<span class="indicador-sync-bg-msg"></span>';
        document.body.appendChild(badge);
    }
    badge.querySelector('.indicador-sync-bg-msg').textContent = mensagem || 'Sincronizando calendário...';
    badge.classList.add('ativo');
}

function ocultarIndicadorSyncBackground() {
    clearTimeout(_indicadorBgHideTimer);
    _indicadorBgHideTimer = setTimeout(function () {
        const badge = document.getElementById('indicador-sync-bg');
        if (badge) badge.classList.remove('ativo');
    }, 600);
}
