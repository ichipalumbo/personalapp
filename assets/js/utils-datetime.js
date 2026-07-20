// [TAG-UTILS-DATETIME] utils-datetime.js
// Responsabilidade: Utilitários de data e hora — formatação, conversão e cálculo de intervalos
// Depende de: state.js (window.dataSelecionada — em runtime)
// Expõe: window.somarMinutos, window.diferencaMinutos, window.getDiaTextoSelecionado,
//         window.getDataSelecionadaPtBr, window.formatarDataPtBr, window.converterPtBrParaISO,
//         window.formatarDataPtBrLegivel, window.converterISODateParaDataLocal,
//         window.formatarDataLocalParaISODate, window.abrirDatePickerNativo

/** @param {string} horaStr - Ex: "08:30" @param {number} minutos @returns {string} Ex: "09:00" */
window.somarMinutos = function(horaStr, minutos) {
    const [h, m] = horaStr.split(':').map(Number);
    let totalMinutos = h * 60 + m + parseInt(minutos);
    const novaHora = Math.floor(totalMinutos / 60) % 24;
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
};

/** @param {string} inicio - Ex: "08:00" @param {string} fim - Ex: "09:00" @returns {number} minutos */
window.diferencaMinutos = function(inicio, fim) {
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fim.split(':').map(Number);
    return (hF * 60 + mF) - (hI * 60 + mI);
};

/** @returns {string} Nome do dia da semana da data selecionada. Ex: "Segunda" | "Sábado" */
window.getDiaTextoSelecionado = function() {
    const diaIndex = window.dataSelecionada.getDay();
    const diasMapeados = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return diasMapeados[diaIndex];
};

/** @returns {string} Data selecionada em formato "DD/MM/YYYY" */
window.getDataSelecionadaPtBr = function() {
    if (!window.dataSelecionada) return '';
    return window.dataSelecionada.toLocaleDateString('pt-BR');
};

/** @param {string} dataISO - Ex: "2025-07-15" @returns {string} Ex: "15/07/2025" */
window.formatarDataPtBr = function(dataISO) {
    if (!dataISO || typeof dataISO !== 'string') return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return '';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

/** @param {string} dataPtBr - Ex: "15/07/2025" @returns {string} Ex: "2025-07-15" */
window.converterPtBrParaISO = function(dataPtBr) {
    if (!dataPtBr || typeof dataPtBr !== 'string') return '';
    const partes = dataPtBr.split('/');
    if (partes.length !== 3) return '';
    const [dia, mes, ano] = partes;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

/** @param {string} dataPtBr - Ex: "15/07/2025" @returns {string} Ex: "ter., 15/07" */
window.formatarDataPtBrLegivel = function(dataPtBr) {
    if (!dataPtBr) return '';
    const iso = window.converterPtBrParaISO(dataPtBr);
    if (!iso) return dataPtBr;
    const data = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(data.getTime())) return dataPtBr;
    return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

/** @param {string} dataISO - Ex: "2026-07-19" @returns {Date|null} Data local 00:00:00 */
window.converterISODateParaDataLocal = function(dataISO) {
    if (!dataISO || typeof dataISO !== 'string') return null;
    const partes = dataISO.split('-').map(Number);
    if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) return null;

    const [ano, mes, dia] = partes;
    const dataLocal = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    if (Number.isNaN(dataLocal.getTime())) return null;
    return dataLocal;
};

/** @param {Date} data @returns {string} Ex: "2026-07-19" */
window.formatarDataLocalParaISODate = function(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
};

/** Abre o date picker nativo do browser no input informado @param {HTMLInputElement} input */
window.abrirDatePickerNativo = function(input) {
    if (!input) return;
    try {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
            return;
        }
    } catch (_) {}
    input.focus();
    input.click();
};
