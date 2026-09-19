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
    const DIAS_ALERTA_REPOSICAO = 5;

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

    return {
        deveEnviarPatch,
        obterMensagemFalhaPersistencia,
        DIAS_ALERTA_REPOSICAO,
        diasAteDataISO,
        resumoReposicoesAluno
    };
});
