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

    return {
        deveEnviarPatch,
        obterMensagemFalhaPersistencia,
    };
});
