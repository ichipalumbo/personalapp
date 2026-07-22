// [TAG-AGENDA-CONFLITOS] agenda-conflitos.js
// Responsabilidade: Detecção de conflitos de horário entre compromissos (único e recorrente)
// Depende de: state.js (aulas), calendario-engine.js (window.checarCompromissoNaData),
//             utils-datetime.js (converterPtBrParaISO, getDataSelecionadaPtBr, formatarDataPtBrLegivel),
//             view-home.js (window.getAluno — em runtime)
// Expõe: window.getCompromissoSerializadoParaConflito, window.getConflitosNoDia,
//         window.getConflitosRecorrenciaEmDatas, window.getDatasConflitoRecorrencia,
//         window.gerarResumoConflitosDatas

/**
 * Serializa um compromisso para uso no algoritmo de detecção de conflitos
 * @param {Object} compromisso @param {string} dataAlvoPtBr @returns {Object}
 */
window.getCompromissoSerializadoParaConflito = function(compromisso, dataAlvoPtBr) {
    return {
        id: compromisso.id,
        tipo: compromisso.tipo || 'aula',
        frequencia: compromisso.frequencia || 'uma_vez',
        data: compromisso.data || dataAlvoPtBr,
        dia: compromisso.dia || '',
        diasSemana: Array.isArray(compromisso.diasSemana) ? compromisso.diasSemana.slice() : [],
        horarioInicio: compromisso.horarioInicio,
        horarioFim: compromisso.horarioFim,
        tipoRecorrencia: compromisso.tipoRecorrencia || 'semanal',
        intervaloRecorrencia: Number(compromisso.intervaloRecorrencia || 1),
        dataCriacao: compromisso.dataCriacao || new Date().toISOString(),
        recorrenciaEscopo: compromisso.recorrenciaEscopo || 'fromDate',
        recorrenciaDataInicio: compromisso.recorrenciaDataInicio || compromisso.data || dataAlvoPtBr,
        excecoes: Array.isArray(compromisso.excecoes) ? compromisso.excecoes.slice() : [],
        excecoesDetalhadas: Array.isArray(compromisso.excecoesDetalhadas) ? compromisso.excecoesDetalhadas.slice() : []
    };
};

/**
 * Retorna os compromissos existentes que colidem de horário com o candidato em uma data específica
 * @param {Object} candidato @param {Date} dataAlvo @param {{ ignorarIds?: string[] }} opcoes
 * @returns {{ id: string, data: string, faixa: string, nome: string }[]}
 */
window.getConflitosNoDia = function(candidato, dataAlvo, opcoes = {}) {
    if (!Array.isArray(aulas)) return [];
    const ignorarIds = Array.isArray(opcoes.ignorarIds) ? opcoes.ignorarIds : [];
    const dataStr = dataAlvo.toLocaleDateString('pt-BR');

    return aulas
        .filter(existente => existente && !ignorarIds.includes(existente.id))
        .filter(existente => {
            const ocorreExistente = window.checarCompromissoNaData(existente, dataAlvo);
            const ocorreCandidato = window.checarCompromissoNaData(candidato, dataAlvo);
            if (!ocorreExistente || !ocorreCandidato) return false;

            const inicioA = existente.horarioInicio;
            const fimA = existente.horarioFim;
            const inicioB = candidato.horarioInicio;
            const fimB = candidato.horarioFim;
            return inicioA < fimB && inicioB < fimA;
        })
        .map(existente => {
            let nome;
            // [TAG-GCAL-CONFLICT-LABEL] Identifica conflitos com eventos externos do Google Calendar
            if (existente.source === 'google_external') {
                nome = (existente.descricao || 'Evento externo') + ' [Google Calendar]';
            } else {
                const aluno = window.getAluno(existente.alunoId);
                nome = aluno ? aluno.nome : (existente.tipo === 'aula' ? 'Aula' : (existente.descricao || 'Compromisso'));
            }
            return {
                id: existente.id,
                data: dataStr,
                faixa: `${existente.horarioInicio} - ${existente.horarioFim}`,
                nome
            };
        });
};

/**
 * Acumula conflitos do candidato em múltiplas datas
 * @param {Object} candidato @param {string[]} datasPtBr @param {{ ignorarIds?: string[] }} opcoes
 * @returns {{ id: string, data: string, faixa: string, nome: string }[]}
 */
window.getConflitosRecorrenciaEmDatas = function(candidato, datasPtBr, opcoes = {}) {
    const unicas = Array.from(new Set((datasPtBr || []).filter(Boolean)));
    const conflitos = [];
    unicas.forEach(dataPtBr => {
        const iso = window.converterPtBrParaISO(dataPtBr);
        if (!iso) return;
        const data = new Date(`${iso}T12:00:00`);
        if (Number.isNaN(data.getTime())) return;
        const conflDia = window.getConflitosNoDia(candidato, data, opcoes);
        conflDia.forEach(c => conflitos.push(c));
    });
    return conflitos;
};

/**
 * Calcula as próximas datas em que um compromisso recorrente ocorre (usado para pré-checar conflitos)
 * @param {Object} compromisso @param {number} limite - máximo de datas a retornar
 * @returns {string[]} datas em formato "DD/MM/YYYY"
 */
window.getDatasConflitoRecorrencia = function(compromisso, limite = 20) {
    const inicioPtBr = compromisso.recorrenciaDataInicio || compromisso.data || window.getDataSelecionadaPtBr();
    const inicioIso = window.converterPtBrParaISO(inicioPtBr);
    if (!inicioIso) return [];

    const inicio = new Date(`${inicioIso}T12:00:00`);
    if (Number.isNaN(inicio.getTime())) return [];

    const datas = [];
    const cursor = new Date(inicio);
    const escopoLegacyMesFechado = compromisso.recorrenciaEscopo === 'monthOfDate';
    const maxDias = escopoLegacyMesFechado ? 40 : 120;
    const mesAlvo = inicio.getMonth();
    const anoAlvo = inicio.getFullYear();

    for (let i = 0; i <= maxDias && datas.length < limite; i++) {
        const d = new Date(cursor);
        d.setDate(inicio.getDate() + i);
        if (escopoLegacyMesFechado && (d.getMonth() !== mesAlvo || d.getFullYear() !== anoAlvo)) {
            break;
        }
        if (window.checarCompromissoNaData(compromisso, d)) {
            datas.push(d.toLocaleDateString('pt-BR'));
        }
    }
    return datas;
};

/**
 * Gera um texto resumido com as datas de conflito (para exibição em alerts)
 * @param {{ data: string }[]} conflitos @param {number} limite - max datas a exibir antes de "e mais N"
 * @returns {string}
 */
window.gerarResumoConflitosDatas = function(conflitos, limite = 6) {
    if (!Array.isArray(conflitos) || conflitos.length === 0) return '';
    const vistos = new Set();
    const datas = [];
    conflitos.forEach(c => {
        if (c && c.data && !vistos.has(c.data)) {
            vistos.add(c.data);
            datas.push(c.data);
        }
    });
    if (datas.length === 0) return '';
    const preview = datas.slice(0, limite).map(window.formatarDataPtBrLegivel).join(', ');
    const resto = datas.length - limite;
    return resto > 0 ? `${preview} e mais ${resto}` : preview;
};
