// [TAG-UTILS-FORMATTERS] utils-formatters.js
// Responsabilidade: formatadores compartilhados de apresentação.
// Expõe: window.formatarMoeda

window.formatarMoeda = function(value) {
    const numero = Number(value);
    const seguro = Number.isFinite(numero) ? numero : 0;
    return `R$ ${seguro.toFixed(2).replace('.', ',')}`;
};