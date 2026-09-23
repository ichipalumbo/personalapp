(function (root, factory) {
    const helpers = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = helpers;
    }

    if (root) {
        root.reposicaoFlowHelpers = helpers;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function deveEnviarPatch(resultadoPersistencia) {
        return Boolean(resultadoPersistencia && resultadoPersistencia.ok === true);
    }

    function obterMensagemFalhaPersistencia(resultadoPersistencia) {
        const motivo = resultadoPersistencia && typeof resultadoPersistencia.motivo === 'string'
            ? resultadoPersistencia.motivo
            : 'falha_remota';

        if (motivo === 'nao_autenticado' || motivo === 'sessao_expirada') {
            return 'Sessão expirada. Faça login com Google para continuar.';
        }
        if (motivo === 'falha_remota') {
            return 'Falha ao salvar alterações antes de concluir a reposição.';
        }
        return 'Não foi possível confirmar a persistência dos dados.';
    }

    // Dias antes do fim da validade em que a reposição entra em alerta "a vencer".
    const DIAS_ALERTA_REPOSICAO = 7;

    function dataLocalDeISO(dataISO) {
        if (!dataISO || typeof dataISO !== 'string') return null;
        const partes = dataISO.split('-');
        if (partes.length !== 3) return null;
        const [ano, mes, dia] = partes.map(Number);
        if (!ano || !mes || !dia) return null;
        return new Date(ano, mes - 1, dia);
    }

    function diasAteDataISO(dataISO) {
        const alvo = dataLocalDeISO(dataISO);
        if (!alvo) return null;
        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
    }

    // Resumo das reposições pendentes de um aluno usadas pelos avisos "a vencer".
    function resumoReposicoesAluno(reposicoes, alunoId) {
        const doAluno = (Array.isArray(reposicoes) ? reposicoes : []).filter(
            (r) => r && r.alunoId === alunoId && r.status === 'pendente' && r.validoAte
        );
        if (doAluno.length === 0) return null;

        let diasMinimo = Infinity;
        for (const r of doAluno) {
            const dias = diasAteDataISO(r.validoAte);
            if (dias !== null && dias < diasMinimo) diasMinimo = dias;
        }
        if (!Number.isFinite(diasMinimo)) {
            return { total: doAluno.length, diasProximaValidade: null, aVencer: false };
        }

        return {
            total: doAluno.length,
            diasProximaValidade: diasMinimo,
            aVencer: diasMinimo <= DIAS_ALERTA_REPOSICAO
        };
    }

    const STATUS_REPOSICAO = ['pendente', 'agendada', 'realizada', 'expirada'];

    function pluralizar(quantidade, singular, plural) {
        return `${quantidade} ${quantidade === 1 ? singular : plural}`;
    }

    function obterReposicoesDoAluno(reposicoes, alunoId) {
        return (Array.isArray(reposicoes) ? reposicoes : []).filter(
            (reposicao) => reposicao
                && reposicao.alunoId === alunoId
                && STATUS_REPOSICAO.includes(reposicao.status)
        );
    }

    function resumoHistoricoReposicoesAluno(reposicoes, alunoId) {
        const doAluno = obterReposicoesDoAluno(reposicoes, alunoId);
        const contagens = { pendente: 0, agendada: 0, realizada: 0, expirada: 0 };
        doAluno.forEach((reposicao) => { contagens[reposicao.status] += 1; });

        const base = {
            total: doAluno.length,
            contagens,
            diasProximaValidade: null
        };

        if (doAluno.length === 0) {
            return {
                ...base,
                severidade: 'neutro',
                linhaPrincipal: 'Nenhuma reposição',
                linhaSecundaria: 'Ver histórico'
            };
        }

        if (contagens.pendente === 0) {
            const partes = [];
            if (contagens.agendada) partes.push(pluralizar(contagens.agendada, 'agendada', 'agendadas'));
            if (contagens.realizada) partes.push(pluralizar(contagens.realizada, 'realizada', 'realizadas'));
            if (contagens.expirada) partes.push(pluralizar(contagens.expirada, 'expirada', 'expiradas'));
            return {
                ...base,
                severidade: 'info',
                linhaPrincipal: 'Histórico disponível',
                linhaSecundaria: partes.join(' · ')
            };
        }

        const prazos = doAluno
            .filter((reposicao) => reposicao.status === 'pendente' && reposicao.validoAte)
            .map((reposicao) => diasAteDataISO(reposicao.validoAte))
            .filter((dias) => dias !== null);
        const linhaPrincipal = pluralizar(contagens.pendente, 'pendente', 'pendentes');

        if (prazos.length === 0) {
            return { ...base, severidade: 'info', linhaPrincipal, linhaSecundaria: 'Sem prazo definido' };
        }

        const diasMinimo = Math.min(...prazos);
        const resumo = { ...base, diasProximaValidade: diasMinimo, linhaPrincipal };

        if (diasMinimo < 0) {
            const encerrados = prazos.filter((dias) => dias < 0).length;
            return { ...resumo, severidade: 'critico', linhaSecundaria: `${encerrados} com prazo encerrado` };
        }
        if (diasMinimo === 0) {
            const vencendoHoje = prazos.filter((dias) => dias === 0).length;
            return {
                ...resumo,
                severidade: 'alerta',
                linhaSecundaria: vencendoHoje === 1 ? 'Vence hoje' : `${vencendoHoje} vencem hoje`
            };
        }
        if (diasMinimo <= DIAS_ALERTA_REPOSICAO) {
            const naJanela = prazos.filter((dias) => dias > 0 && dias <= DIAS_ALERTA_REPOSICAO).length;
            return {
                ...resumo,
                severidade: 'alerta',
                linhaSecundaria: `${naJanela} vence${naJanela === 1 ? '' : 'm'} em ${pluralizar(diasMinimo, 'dia', 'dias')}`
            };
        }

        return {
            ...resumo,
            severidade: 'info',
            linhaSecundaria: `Próxima validade em ${pluralizar(diasMinimo, 'dia', 'dias')}`
        };
    }

    function agruparHistoricoReposicoes(reposicoes, alunoId) {
        const doAluno = obterReposicoesDoAluno(reposicoes, alunoId);
        return STATUS_REPOSICAO.reduce((grupos, status) => {
            const itens = doAluno
                .filter((reposicao) => reposicao.status === status)
                .sort((a, b) => {
                    const chaveA = `${a.dataOriginal || ''}T${a.horarioOriginal || ''}`;
                    const chaveB = `${b.dataOriginal || ''}T${b.horarioOriginal || ''}`;
                    return chaveB.localeCompare(chaveA);
                });
            if (itens.length > 0) grupos.push({ status, itens });
            return grupos;
        }, []);
    }

    return {
        deveEnviarPatch,
        obterMensagemFalhaPersistencia,
        DIAS_ALERTA_REPOSICAO,
        STATUS_REPOSICAO,
        diasAteDataISO,
        resumoReposicoesAluno,
        resumoHistoricoReposicoesAluno,
        agruparHistoricoReposicoes
    };
});
