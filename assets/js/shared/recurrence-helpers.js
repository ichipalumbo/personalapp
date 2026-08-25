(function (root, factory) {
    const helpers = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = helpers;
    }

    if (root) {
        root.recurrenceHelpers = helpers;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DEFAULT_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    function parseDataFlex(valor) {
        if (!valor) return null;
        if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
        if (typeof valor !== 'string') return null;

        if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            const data = new Date(`${valor}T12:00:00`);
            if (!Number.isNaN(data.getTime())) return new Date(data.getFullYear(), data.getMonth(), data.getDate());
            return null;
        }

        const partes = valor.split('/');
        if (partes.length === 3) {
            const [dia, mes, ano] = partes.map(Number);
            if (dia && mes && ano) {
                const data = new Date(ano, mes - 1, dia);
                if (!Number.isNaN(data.getTime())) return new Date(data.getFullYear(), data.getMonth(), data.getDate());
            }
        }

        const dataGenerica = new Date(valor);
        if (!Number.isNaN(dataGenerica.getTime())) {
            return new Date(dataGenerica.getFullYear(), dataGenerica.getMonth(), dataGenerica.getDate());
        }
        return null;
    }

    function resolverCompromissoRecorrenteNaData(comp, dataAlvo, diaTexto) {
        const dataCriacao = parseDataFlex(comp && comp.dataCriacao)
            || parseDataFlex(comp && comp.recorrenciaDataInicio)
            || parseDataFlex(comp && comp.data);
        if (!dataCriacao) return false;

        const dataRef = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
        const diffMs = dataRef - dataCriacao;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return false;

        const padrao = (comp && comp.tipoRecorrencia) || 'semanal';
        const intervalo = Math.max(1, parseInt((comp && comp.intervaloRecorrencia) || 1, 10));

        if (padrao === 'diaria') {
            return diffDays % intervalo === 0;
        }

        if (padrao === 'semanal') {
            const dias = Array.isArray(comp && comp.diasSemana) && comp.diasSemana.length > 0
                ? comp.diasSemana
                : (comp && comp.dia ? [comp.dia] : []);
            if (!dias.includes(diaTexto)) return false;

            const inicioSemana = new Date(dataCriacao);
            const diaSemanaInicio = inicioSemana.getDay();
            inicioSemana.setDate(inicioSemana.getDate() - diaSemanaInicio + (diaSemanaInicio === 0 ? -6 : 1));

            const alvoSemana = new Date(dataRef);
            const diaSemanaAlvo = alvoSemana.getDay();
            alvoSemana.setDate(alvoSemana.getDate() - diaSemanaAlvo + (diaSemanaAlvo === 0 ? -6 : 1));

            const diffSemanas = Math.round((alvoSemana - inicioSemana) / (1000 * 60 * 60 * 24 * 7));
            return diffSemanas >= 0 && (diffSemanas % intervalo === 0);
        }

        if (padrao === 'mensal') {
            const diffMeses = (dataRef.getFullYear() - dataCriacao.getFullYear()) * 12 + (dataRef.getMonth() - dataCriacao.getMonth());
            if (diffMeses < 0 || (diffMeses % intervalo !== 0)) return false;

            if (Array.isArray(comp && comp.diasSemana) && comp.diasSemana.length > 0) {
                return comp.diasSemana.includes(diaTexto);
            }
            return dataRef.getDate() === dataCriacao.getDate();
        }

        if (padrao === 'anual') {
            const diffAnos = dataRef.getFullYear() - dataCriacao.getFullYear();
            return diffAnos >= 0
                && (diffAnos % intervalo === 0)
                && dataRef.getDate() === dataCriacao.getDate()
                && dataRef.getMonth() === dataCriacao.getMonth();
        }

        return false;
    }

    function contarOcorrenciasAteData(comp, dataAlvo, mapaDias) {
        const recorrenciaDataInicio = parseDataFlex(comp && comp.recorrenciaDataInicio)
            || parseDataFlex(comp && comp.dataCriacao)
            || parseDataFlex(comp && comp.data);

        if (!recorrenciaDataInicio || !dataAlvo) {
            return 0;
        }

        const dataInicio = new Date(recorrenciaDataInicio.getFullYear(), recorrenciaDataInicio.getMonth(), recorrenciaDataInicio.getDate());
        const dataLimite = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());

        if (dataLimite < dataInicio) {
            return 0;
        }

        let total = 0;
        for (let cursor = new Date(dataInicio); cursor <= dataLimite; cursor.setDate(cursor.getDate() + 1)) {
            const diaSemana = cursor.getDay();
            const diaTexto = mapaDias[diaSemana];
            if (!diaTexto) continue;

            const dataStr = cursor.toLocaleDateString('pt-BR');
            if (comp && comp.excecoes && comp.excecoes.includes(dataStr)) {
                continue;
            }

            if (resolverCompromissoRecorrenteNaData(comp, new Date(cursor), diaTexto)) {
                total += 1;
            }
        }

        return total;
    }

    function checarCompromissoNaData(comp, dataAlvo, horaStr, diasSemanaMap) {
        const mapaDias = Array.isArray(diasSemanaMap) && diasSemanaMap.length > 0
            ? diasSemanaMap
            : DEFAULT_DIAS_SEMANA;

        if (horaStr) {
            const ehDiaInteiro = comp && comp.tipo === 'bloqueio'
                && (comp.fullDay === true || (comp.horarioInicio === '00:00' && comp.horarioFim === '23:59'));
            if (!ehDiaInteiro && comp && comp.horarioInicio !== horaStr) return false;
        }

        const diaSemana = dataAlvo.getDay();
        const diaTexto = mapaDias[diaSemana];
        if (!diaTexto) return false;
        const dataStr = dataAlvo.toLocaleDateString('pt-BR');
        if (comp && comp.excecoes && comp.excecoes.includes(dataStr)) {
            return false;
        }

        if (comp && comp.frequencia === 'semanal') {
            const recorrenciaDataInicio = parseDataFlex(comp.recorrenciaDataInicio) || parseDataFlex(comp.data);
            const dataAlvoPura = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
            if (recorrenciaDataInicio) {
                const escopoRecorrencia = comp.recorrenciaEscopo || 'fromDate';
                if (escopoRecorrencia === 'monthOfDate') {
                    if (dataAlvoPura.getFullYear() !== recorrenciaDataInicio.getFullYear() || dataAlvoPura.getMonth() !== recorrenciaDataInicio.getMonth()) {
                        return false;
                    }
                } else if (dataAlvoPura < recorrenciaDataInicio) {
                    return false;
                }
            }

            if (comp.recorrenciaFimCondicao === 'untilDate' && comp.recorrenciaDataFim) {
                const fimData = parseDataFlex(comp.recorrenciaDataFim);
                if (fimData) {
                    const fimPura = new Date(fimData.getFullYear(), fimData.getMonth(), fimData.getDate());
                    if (dataAlvoPura > fimPura) return false;
                }
            }

            if (comp.recorrenciaFimCondicao === 'occurrences' && comp.recorrenciaQuantidadeOcorrencias) {
                const quantidade = Number(comp.recorrenciaQuantidadeOcorrencias);
                if (Number.isFinite(quantidade) && quantidade > 0) {
                    const ocorrenciasAteData = contarOcorrenciasAteData(comp, dataAlvoPura, mapaDias);
                    if (ocorrenciasAteData > quantidade) {
                        return false;
                    }
                }
            }

            if (comp.tipoRecorrencia) {
                return resolverCompromissoRecorrenteNaData(comp, dataAlvoPura, diaTexto);
            }

            if (Array.isArray(comp.diasSemana) && comp.diasSemana.length > 0) {
                return comp.diasSemana.includes(diaTexto);
            }
            return comp.dia === diaTexto;
        }

        if (!comp || !comp.data) {
            return comp && comp.dia === diaTexto;
        }

        if (comp.data === dataStr) {
            return true;
        }

        const isoDate = dataAlvo.getFullYear() + '-' + String(dataAlvo.getMonth() + 1).padStart(2, '0') + '-' + String(dataAlvo.getDate()).padStart(2, '0');
        return comp.data === isoDate;
    }

    function getDiasNoMes(mes, ano) {
        return new Date(ano, mes + 1, 0).getDate();
    }

    function getPrimeiroDiaSemana(mes, ano) {
        return new Date(ano, mes, 1).getDay();
    }

    return {
        DEFAULT_DIAS_SEMANA,
        parseDataFlex,
        resolverCompromissoRecorrenteNaData,
        checarCompromissoNaData,
        getDiasNoMes,
        getPrimeiroDiaSemana
    };
});
