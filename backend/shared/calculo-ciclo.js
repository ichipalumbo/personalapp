(function (root, factory) {
    const helpers = factory(require('./recurrence-helpers'));

    if (typeof module === 'object' && module.exports) {
        module.exports = helpers;
    }

    if (root) {
        root.calculoCiclo = helpers;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (recurrenceHelpers) {
    const PRAZO_MINIMO_REPOSICAO_DIAS = 7;

    function toISODateOnly(value) {
        if (!value) return null;
        const data = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(data.getTime())) return null;
        return [
            data.getFullYear(),
            String(data.getMonth() + 1).padStart(2, "0"),
            String(data.getDate()).padStart(2, "0"),
        ].join("-");
    }

    function normalizarDateOnly(value) {
        const data = recurrenceHelpers.parseDataFlex(value);
        return data
            ? new Date(data.getFullYear(), data.getMonth(), data.getDate())
            : null;
    }

    function inicioDoMes(data) {
        return new Date(data.getFullYear(), data.getMonth(), 1);
    }

    function fimDoMes(data) {
        return new Date(data.getFullYear(), data.getMonth() + 1, 0);
    }

    function diaSeguinte(data) {
        const prox = new Date(data);
        prox.setDate(prox.getDate() + 1);
        return new Date(prox.getFullYear(), prox.getMonth(), prox.getDate());
    }

    function ajustarDiaParaMesValido(ano, mes, diaVencimento) {
        const ultimoDia = recurrenceHelpers.getDiasNoMes(mes, ano);
        const dia = Math.min(
            Math.max(parseInt(diaVencimento, 10) || 1, 1),
            ultimoDia,
        );
        return new Date(ano, mes, dia, 12, 0, 0, 0);
    }

    function dataEmJanela(dataISO, cicloInicio, cicloFim) {
        if (!dataISO) return false;

        const inicio = normalizarDateOnly(cicloInicio);
        const fim = normalizarDateOnly(cicloFim);
        const data = normalizarDateOnly(dataISO);
        if (!inicio || !fim || !data) {
            return false;
        }

        return data >= inicio && data <= fim;
    }

    // Cálculo puro do ciclo vigente: lê só os campos de fechamento do aluno.
    // Fonte única compartilhada entre o financeiro do backend e, no futuro, a exibição do frontend.
    function calcularCicloVigente(aluno, hoje = new Date()) {
        if (
            aluno &&
            aluno.objetivo !== "Consultoria Online" &&
            !aluno.fechamentoMesCheio &&
            !aluno.diaVencimento
        ) {
            return null;
        }

        const dataHoje = normalizarDateOnly(hoje) || new Date();
        const criadoEm = normalizarDateOnly(aluno && aluno.criadoEm) || dataHoje;
        let cicloInicio;
        let cicloFim;

        if (aluno && aluno.fechamentoMesCheio === true) {
            cicloInicio = inicioDoMes(dataHoje);
            cicloFim = fimDoMes(dataHoje);
        } else {
            const vencimentoEsteMes = ajustarDiaParaMesValido(
                dataHoje.getFullYear(),
                dataHoje.getMonth(),
                aluno && aluno.diaVencimento,
            );

            if (dataHoje <= vencimentoEsteMes) {
                cicloFim = vencimentoEsteMes;
                const mesAnterior =
                    dataHoje.getMonth() === 0 ? 11 : dataHoje.getMonth() - 1;
                const anoAnterior =
                    dataHoje.getMonth() === 0
                        ? dataHoje.getFullYear() - 1
                        : dataHoje.getFullYear();
                cicloInicio = diaSeguinte(
                    ajustarDiaParaMesValido(
                        anoAnterior,
                        mesAnterior,
                        aluno && aluno.diaVencimento,
                    ),
                );
            } else {
                const mesSeguinte =
                    dataHoje.getMonth() === 11 ? 0 : dataHoje.getMonth() + 1;
                const anoSeguinte =
                    dataHoje.getMonth() === 11
                        ? dataHoje.getFullYear() + 1
                        : dataHoje.getFullYear();
                cicloFim = ajustarDiaParaMesValido(
                    anoSeguinte,
                    mesSeguinte,
                    aluno && aluno.diaVencimento,
                );
                cicloInicio = diaSeguinte(vencimentoEsteMes);
            }
        }

        if (criadoEm && cicloInicio < criadoEm) {
            cicloInicio = criadoEm;
        }

        return {
            cicloInicio,
            cicloFim,
            cicloInicioISO: toISODateOnly(cicloInicio),
            cicloFimISO: toISODateOnly(cicloFim),
        };
    }

    // Prazo de validade de uma reposição: fim do ciclo de competência,
    // estendido para o ciclo seguinte quando o restante fica abaixo do piso.
    function calcularPrazoReposicao(aluno, dataOriginal) {
        const dataOriginalNormalizada = normalizarDateOnly(dataOriginal);

        if (!dataOriginalNormalizada) {
            return { validoAte: null, pisoAplicado: false };
        }

        const ciclo = calcularCicloVigente(aluno, dataOriginalNormalizada);
        if (!ciclo || !ciclo.cicloFimISO) {
            return { validoAte: null, pisoAplicado: false };
        }

        const cicloFim = normalizarDateOnly(ciclo.cicloFimISO);
        if (!cicloFim) {
            return { validoAte: null, pisoAplicado: false };
        }

        const diferencaDias = Math.round(
            (cicloFim.getTime() - dataOriginalNormalizada.getTime()) / 86400000,
        );

        if (diferencaDias < PRAZO_MINIMO_REPOSICAO_DIAS) {
            const cicloSeguinte = calcularCicloVigente(
                aluno,
                diaSeguinte(cicloFim),
            );

            if (!cicloSeguinte || !cicloSeguinte.cicloFimISO) {
                return { validoAte: null, pisoAplicado: false };
            }

            return {
                validoAte: cicloSeguinte.cicloFimISO,
                pisoAplicado: true,
            };
        }

        return {
            validoAte: ciclo.cicloFimISO,
            pisoAplicado: false,
        };
    }

    return {
        PRAZO_MINIMO_REPOSICAO_DIAS,
        toISODateOnly,
        normalizarDateOnly,
        inicioDoMes,
        fimDoMes,
        diaSeguinte,
        ajustarDiaParaMesValido,
        dataEmJanela,
        calcularCicloVigente,
        calcularPrazoReposicao,
    };
});
