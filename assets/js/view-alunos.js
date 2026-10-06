// [TAG-VIEW-ALUNOS] view-alunos.js
// Responsabilidade: View da aba Alunos — listagem com KPIs, formulário de cadastro/edição e exclusão
// Depende de: state.js, storage.js, utils-kpi.js (calcular*), view-home.js (atualizarDashboardStats — em runtime) - Lógica de Alunos na SPA (Prô Josy)

// Dirty-check key for renderizarListaAlunos — null forces a render on the next call.
let _ultimaChaveRenderAlunos = null;
// Exposto para que mutações externas possam forçar um re-render na próxima chamada.
window.invalidarChaveRenderAlunos = function () { _ultimaChaveRenderAlunos = null; };

function normalizarValorAlunoComFallback(valor, normalizadorGlobal, fallbackLocal, selfRef) {
    if (typeof normalizadorGlobal === 'function' && normalizadorGlobal !== selfRef) {
        return normalizadorGlobal(valor);
    }
    return fallbackLocal(valor);
}

function normalizarObjetivoAlunoFallbackLocal(valor) {
    const objetivo = String(valor || '').trim();
    return objetivo === 'Consultoria Online' ? 'Consultoria Online' : 'Personal Trainer';
}

function normalizarStatusAlunoFallbackLocal(valor) {
    return String(valor || '').toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function normalizarObjetivoAluno(valorObjetivo) {
    const normalizadorGlobal = typeof window.normalizarObjetivoAluno === 'function'
        && window.normalizarObjetivoAluno !== normalizarObjetivoAluno
        ? window.normalizarObjetivoAluno
        : null;

    return normalizarValorAlunoComFallback(
        valorObjetivo,
        normalizadorGlobal,
        normalizarObjetivoAlunoFallbackLocal,
        normalizarObjetivoAluno
    );
}

function normalizarStatusAlunoLocal(valorStatus) {
    return normalizarValorAlunoComFallback(
        valorStatus,
        window.normalizarStatusAluno,
        normalizarStatusAlunoFallbackLocal,
        normalizarStatusAlunoLocal
    );
}

function obterAlunoPorIdView(id) {
    if (typeof window.getAluno === 'function') {
        return window.getAluno(id);
    }
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);
    return listaAlunos.find(a => a.id === id) || null;
}

function atualizarStatusSwitchFormulario(ativo) {
    const elStatusSwitch = document.getElementById('alunoStatusSwitch');
    const elStatusTexto = document.getElementById('alunoStatusSwitchStatus');
    if (elStatusSwitch) elStatusSwitch.checked = !!ativo;
    if (elStatusTexto) elStatusTexto.textContent = ativo ? 'Ativo' : 'Inativo';
}

function statusSwitchEstaAtivo() {
    const elStatusSwitch = document.getElementById('alunoStatusSwitch');
    return !(elStatusSwitch && elStatusSwitch.checked === false);
}

function obterStatusAlunoDoSwitch() {
    return statusSwitchEstaAtivo() ? 'ativo' : 'inativo';
}


function objetivoSwitchEstaAtivo() {
    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    return !!(elObjetivoSwitch && elObjetivoSwitch.checked);
}

function obterObjetivoAlunoDoSwitch() {
    return objetivoSwitchEstaAtivo() ? 'Consultoria Online' : 'Personal Trainer';
}

function aplicarClasseCampoDesabilitado(campo, desabilitado) {
    if (!campo || typeof campo.closest !== 'function') return;
    const grupo = campo.closest('.form-grupo-spa');
    if (!grupo) return;
    grupo.classList.toggle('form-grupo-spa--desabilitado', !!desabilitado);
}

function aplicarRegrasObjetivoNoFormulario() {
    const ehConsultoriaOnline = objetivoSwitchEstaAtivo();
    const elLocal = document.getElementById('alunoLocal');
    const elLocalLabel = document.getElementById('alunoLocalLabel');
    const elFrequencia = document.getElementById('alunoFrequenciaSemanal');
    const elStatusObjetivo = document.getElementById('alunoObjetivoSwitchStatus');

    if (elStatusObjetivo) {
        elStatusObjetivo.textContent = ehConsultoriaOnline ? 'Consultoria Online' : 'Personal Trainer';
    }

    if (elLocal) {
        elLocal.required = !ehConsultoriaOnline;
    }

    if (elLocalLabel) {
        elLocalLabel.textContent = ehConsultoriaOnline
            ? 'Local de Treino (Opcional)'
            : 'Local de Treino *';
    }

    if (elFrequencia) {
        elFrequencia.disabled = ehConsultoriaOnline;
        elFrequencia.required = !ehConsultoriaOnline;
        if (!ehConsultoriaOnline && !elFrequencia.value) {
            elFrequencia.value = '2';
        }
        aplicarClasseCampoDesabilitado(elFrequencia, ehConsultoriaOnline);
    }

    aplicarRegrasFinanceirasNoFormulario();
}

function montarCorObjetivoTangerina() {
    return { nome: 'Tangerina', hex: '#FF887C' };
}

function normalizarNumeroFinanceiro(valor) {
    const numero = typeof valor === 'string' ? valor.replace(',', '.') : valor;
    const resultado = Number(numero);
    return Number.isFinite(resultado) ? resultado : null;
}

function formatarMoedaFinanceira(valor) {
    const numero = Number(valor) || 0;
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
}

function obterValorFinanceiroSelecionado() {
    const metodo = document.getElementById('alunoMetodoCobranca');
    return metodo ? (metodo.value || 'por_aula') : 'por_aula';
}

function aplicarRegrasFinanceirasNoFormulario() {
    const ehConsultoriaOnline = objetivoSwitchEstaAtivo();
    const cardCobranca = document.getElementById('cardCobrancaPorCiclo');
    const fechamentoMesCheio = document.getElementById('alunoFechamentoMesCheio');
    const fechamentoMesCheioStatus = document.getElementById('alunoFechamentoMesCheioStatus');
    const diaVencimento = document.getElementById('alunoDiaVencimento');
    const containerDiaVencimento = document.getElementById('containerAlunoDiaVencimento');
    const metodoCobranca = document.getElementById('alunoMetodoCobranca');
    const valorFixoCiclo = document.getElementById('alunoValorFixoCiclo');
    const containerValorFixo = document.getElementById('containerAlunoValorFixoCiclo');
    const preco = document.getElementById('alunoPreco');
    const containerPreco = document.getElementById('containerAlunoPreco');

    const fechaPorMes = !!(fechamentoMesCheio && fechamentoMesCheio.checked);
    const metodo = obterValorFinanceiroSelecionado();

    if (cardCobranca) {
        cardCobranca.classList.toggle('form-grupo-spa--desabilitado', ehConsultoriaOnline);
    }

    if (fechamentoMesCheio) {
        fechamentoMesCheio.disabled = ehConsultoriaOnline;
    }
    if (fechamentoMesCheioStatus) {
        fechamentoMesCheioStatus.textContent = fechaPorMes ? 'Fecha por mês cheio' : 'Fecha por vencimento';
    }

    if (containerDiaVencimento) {
        containerDiaVencimento.style.display = fechaPorMes || ehConsultoriaOnline ? 'none' : '';
    }
    if (diaVencimento) {
        diaVencimento.required = !ehConsultoriaOnline && !fechaPorMes;
        diaVencimento.disabled = ehConsultoriaOnline || fechaPorMes;
    }

    if (metodoCobranca) {
        metodoCobranca.disabled = ehConsultoriaOnline;
    }

    if (containerPreco) {
        containerPreco.style.display = ehConsultoriaOnline || metodo !== 'por_aula' ? 'none' : '';
    }
    if (preco) {
        preco.required = !ehConsultoriaOnline && metodo === 'por_aula';
        preco.disabled = ehConsultoriaOnline || metodo !== 'por_aula';
    }

    if (containerValorFixo) {
        containerValorFixo.style.display = ehConsultoriaOnline || metodo !== 'valor_fixo' ? 'none' : '';
    }
    if (valorFixoCiclo) {
        valorFixoCiclo.required = !ehConsultoriaOnline && metodo === 'valor_fixo';
        valorFixoCiclo.disabled = ehConsultoriaOnline || metodo !== 'valor_fixo';
    }
}

function obterFrequenciaContratoAluno(aluno) {
    const bruto = aluno && aluno.frequenciaSemanal !== undefined && aluno.frequenciaSemanal !== null && aluno.frequenciaSemanal !== ''
        ? aluno.frequenciaSemanal
        : (aluno ? aluno.aulasSemanais : null);
    const valor = parseInt(bruto, 10);
    return Number.isFinite(valor) && valor >= 0 ? valor : 1;
}

// Dados complementares vindos do backend (Finanças e consistência de agenda), indexados por alunoId.
let _resumoFinanceiroPorAluno = {};
let _resumoFinanceiroErro = false;
let _consistenciaAgendaPorAluno = {};
let _consistenciaAgendaErro = false;
let _reposicoesHistorico = null;
let _reposicoesHistoricoErro = false;
let _historicoReposicoesModal = {
    alunoId: null,
    dados: null,
    origem: null,
    carregando: false,
    erro: null
};
let _edicaoCobrancaReposicao = null;
let _operacaoAluno = null;
let _operacaoCobrancaReposicao = null;

function alvosOperacaoAluno(alunoId) {
    const vinculados = typeof aulas !== 'undefined' && Array.isArray(aulas) ? aulas : (window.aulas || []);
    return {
        alunoIds: [alunoId],
        agendamentoIds: vinculados.filter((aula) => aula && aula.alunoId === alunoId && aula.source !== 'google_external').map((aula) => aula.id),
        cicloIds: [],
        reposicaoIds: []
    };
}

function exigirOperacaoAlunoAtual(op) {
    if (!window.contextoDados.operacaoAtual(op)) throw new Error('CONTEXTO_OBSOLETO');
}

function exigirPersistenciaAluno(op, resultado) {
    if (!resultado || resultado.ok !== true || op.falha) {
        window.contextoDados.marcarFalhaOperacao(op, resultado);
        throw new Error(resultado && resultado.motivo || 'Gravação não confirmada.');
    }
    exigirOperacaoAlunoAtual(op);
}

async function recuperarOperacaoAluno() {
    if (typeof window.abrirRecuperacaoDados === 'function') await window.abrirRecuperacaoDados();
}

if (!window.contextoDados) throw new Error('contexto-dados.js precisa carregar antes de view-alunos.js.');
window.contextoDados.aoInvalidar(() => {
    _operacaoAluno = null;
    _operacaoCobrancaReposicao = null;
    ['btnSalvarAluno', 'btnExcluirAlunoModal'].forEach((id) => {
        const botao = document.getElementById(id);
        if (botao) botao.disabled = false;
    });
    _resumoFinanceiroPorAluno = {};
    _resumoFinanceiroErro = false;
    _consistenciaAgendaPorAluno = {};
    _consistenciaAgendaErro = false;
    _reposicoesHistorico = null;
    _reposicoesHistoricoErro = false;
    const botaoCobranca = document.getElementById('btnSalvarEdicaoCobrancaReposicao');
    if (botaoCobranca) botaoCobranca.disabled = false;
    window._retornoHistoricoReposicoes = null;
    window.fecharEdicaoCobrancaReposicao();
    window.fecharHistoricoReposicoes();
    window.togglePainelCadastro(false);
    window.invalidarChaveRenderAlunos();
    ['listaAlunos', 'conteudoHistoricoReposicoes', 'resumoHistoricoReposicoes', 'descricaoEdicaoCobrancaReposicao'].forEach((id) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.replaceChildren();
    });
});

// Caixinha só de alerta: resumo de valor/status do ciclo saiu por ser redundante
// com o card do aluno na tela de Finanças (Etapa 4, Cartão A).
function montarCaixinhaFinanceiraAluno(aluno, objetivo) {
    if (objetivo === 'Consultoria Online') return '';

    if (_resumoFinanceiroErro) {
        return '<div class="aluno-card-indicador aluno-card-indicador--alerta" role="alert">Não foi possível atualizar o financeiro.</div>';
    }
    const resumo = _resumoFinanceiroPorAluno[aluno.id];
    const pendente = !resumo
        ? (!aluno.fechamentoMesCheio && !aluno.diaVencimento)
        : !!resumo.configuracaoPendente;

    if (pendente) {
        return `
            <div class="aluno-card-indicador aluno-card-indicador--alerta">
                <div class="aluno-card-indicador-titulo">⚠️ Configurar cobrança</div>
                <div class="aluno-card-indicador-detalhe">Defina o vencimento para calcular o ciclo.</div>
            </div>
        `;
    }

    return '';
}

function montarCaixinhaConsistenciaAluno(aluno) {
    if (_consistenciaAgendaErro) {
        return '<div class="aluno-card-indicador aluno-card-indicador--alerta" role="alert">Não foi possível atualizar a consistência da agenda.</div>';
    }
    const consistencia = _consistenciaAgendaPorAluno[aluno.id];
    if (!consistencia || !consistencia.aulasFaltamAgendar) return '';

    return `
        <div class="aluno-card-indicador aluno-card-indicador--alerta">
            <div class="aluno-card-indicador-titulo">⚠️ Faltam agendar ${consistencia.aulasFaltamAgendar} de ${consistencia.aulasSemanaisContrato} aulas semanais</div>
            <div class="aluno-card-indicador-detalhe">Recorrência da agenda menor que o contrato.</div>
        </div>
    `;
}

// Terceira caixinha do card: acesso permanente ao histórico de reposições.
function montarCaixinhaReposicaoAluno(aluno) {
    const helpers = window.reposicaoFlowHelpers;
    if (!helpers || typeof helpers.resumoHistoricoReposicoesAluno !== 'function') return '';

    const abrirHistorico = `event.stopPropagation(); if (typeof window.abrirHistoricoReposicoes === 'function') window.abrirHistoricoReposicoes('${aluno.id}', this);`;
    const atributosHistorico = `onclick="${abrirHistorico}" data-historico-aluno="${aluno.id}"`;
    if (_reposicoesHistorico === null) {
        return `
            <button type="button" class="aluno-card-indicador aluno-card-indicador--reposicoes" ${atributosHistorico} aria-label="Ver histórico de reposições de ${aluno.nome}">
                <div class="aluno-card-indicador-titulo"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Reposições</div>
                <div class="aluno-card-indicador-detalhe">Atualizando…</div>
            </button>
        `;
    }

    if (_reposicoesHistoricoErro) {
        return `
            <button type="button" class="aluno-card-indicador aluno-card-indicador--reposicoes aluno-card-indicador--alerta" ${atributosHistorico} aria-label="Ver histórico de reposições de ${aluno.nome}">
                <div class="aluno-card-indicador-titulo"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Reposições</div>
                <div class="aluno-card-indicador-detalhe">Não foi possível atualizar</div>
            </button>
        `;
    }

    const resumo = helpers.resumoHistoricoReposicoesAluno(_reposicoesHistorico, aluno.id);
    const classeAlerta = resumo.severidade === 'alerta' || resumo.severidade === 'critico'
        ? ' aluno-card-indicador--alerta'
        : '';

    return `
        <button type="button" class="aluno-card-indicador aluno-card-indicador--reposicoes${classeAlerta}" ${atributosHistorico} aria-label="Ver histórico de reposições de ${aluno.nome}">
            <div class="aluno-card-indicador-titulo"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> ${resumo.linhaPrincipal}</div>
            <div class="aluno-card-indicador-detalhe">${resumo.linhaSecundaria} <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></div>
        </button>
    `;
}

function escaparTextoAluno(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escaparHtmlHistorico(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatarDataHistorico(dataISO) {
    if (!dataISO) return 'Data não informada';
    if (typeof window.formatarDataPtBr === 'function') return window.formatarDataPtBr(dataISO);
    return String(dataISO).split('-').reverse().join('/');
}

function obterNomeAlunoHistorico(alunoId, reposicoes) {
    const aluno = obterAlunoPorIdView(alunoId);
    if (aluno && aluno.nome) return aluno.nome;
    const registro = (Array.isArray(reposicoes) ? reposicoes : []).find((item) => item && item.alunoNome);
    return registro && registro.alunoNome ? registro.alunoNome : 'Aluno removido';
}

function alunoHistoricoEstaAtivo(alunoId) {
    const aluno = obterAlunoPorIdView(alunoId);
    if (!aluno) return false;
    return typeof window.alunoEstaAtivo !== 'function' || window.alunoEstaAtivo(aluno);
}

function obterAgendamentoReposicaoHistorico(reposicao) {
    if (!reposicao || !reposicao.agendamentoReposicaoId) return null;
    const listaAulas = typeof aulas !== 'undefined' && Array.isArray(aulas)
        ? aulas
        : (Array.isArray(window.aulas) ? window.aulas : []);
    return listaAulas.find((aula) => aula && aula.id === reposicao.agendamentoReposicaoId) || null;
}

function obterTextoUrgenciaReposicao(reposicao, helpers) {
    if (!reposicao || reposicao.status !== 'pendente' || !reposicao.validoAte) return '';
    const dias = helpers.diasAteDataISO(reposicao.validoAte);
    if (dias === null) return '';
    if (dias < 0) return 'Prazo encerrado';
    if (dias === 0) return 'Vence hoje';
    return `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

function renderizarLinhaHistoricoReposicao(reposicao, helpers) {
    const statusLabels = {
        pendente: 'Pendente',
        agendada: 'Agendada',
        realizada: 'Realizada',
        expirada: 'Expirada'
    };
    const status = statusLabels[reposicao.status] || reposicao.status;
    const dataOriginal = reposicao.dataOriginal
        ? `Aula original: ${formatarDataHistorico(reposicao.dataOriginal)}${reposicao.horarioOriginal ? ` às ${reposicao.horarioOriginal}` : ''}`
        : 'Aula original: Horário não informado';
    const validade = reposicao.validoAte
        ? `Válida até ${formatarDataHistorico(reposicao.validoAte)}`
        : '';
    const cobranca = reposicao.cobravel ? 'Cobrável' : 'Não cobrável';
    const urgencia = obterTextoUrgenciaReposicao(reposicao, helpers);
    const agendamento = reposicao.status === 'agendada'
        ? obterAgendamentoReposicaoHistorico(reposicao)
        : null;
    const novaData = agendamento
        ? `Nova data: ${formatarDataHistorico(agendamento.data)}${agendamento.horarioInicio ? ` às ${agendamento.horarioInicio}` : ''}`
        : (reposicao.status === 'agendada' ? 'Agendamento vinculado' : '');
    const ativo = alunoHistoricoEstaAtivo(reposicao.alunoId);
    const pendenciaDisponivel = typeof window.aulasParaRepor !== 'undefined'
        && Array.isArray(window.aulasParaRepor)
        && window.aulasParaRepor.some((item) => item && item.id === reposicao.id);
    let acao = '';

    if (reposicao.status === 'pendente' && ativo && pendenciaDisponivel) {
        acao += `<button type="button" class="btn btn-secondary historico-reposicao-acao" onclick="window.iniciarReagendamentoReposicaoDoHistorico('${escaparHtmlHistorico(reposicao.id)}');">Reagendar</button>`;
    } else if (reposicao.status === 'pendente' && !ativo) {
        acao += '<span class="historico-reposicao-aviso">Aluno inativo: reagendamento indisponível.</span>';
    }
    acao += `<button type="button" class="btn btn-secondary historico-reposicao-acao" onclick="window.abrirEdicaoCobrancaReposicao('${escaparHtmlHistorico(reposicao.id)}', ${reposicao.cobravel === true});">Editar cobrança</button>`;

    return `
        <article class="historico-reposicao-linha">
            <div class="historico-reposicao-linha-cabecalho">
                <span class="historico-reposicao-status historico-reposicao-status--${escaparHtmlHistorico(reposicao.status)}">${escaparHtmlHistorico(status)}</span>
                <span class="historico-reposicao-cobranca">${cobranca}</span>
            </div>
            <div class="historico-reposicao-data">${escaparHtmlHistorico(dataOriginal)}</div>
            <div class="historico-reposicao-detalhes">
                ${validade ? `<span>${escaparHtmlHistorico(validade)}</span>` : ''}
                ${novaData ? `<span>${escaparHtmlHistorico(novaData)}</span>` : ''}
                ${urgencia ? `<strong>${escaparHtmlHistorico(urgencia)}</strong>` : ''}
            </div>
            ${acao ? `<div class="historico-reposicao-linha-acao">${acao}</div>` : ''}
        </article>
    `;
}

function renderizarHistoricoReposicoes() {
    const modal = document.getElementById('modalHistoricoReposicoes');
    const conteudo = document.getElementById('conteudoHistoricoReposicoes');
    const resumoEl = document.getElementById('resumoHistoricoReposicoes');
    if (!modal || !conteudo || !_historicoReposicoesModal.alunoId) return;

    const helpers = window.reposicaoFlowHelpers;
    const dados = Array.isArray(_historicoReposicoesModal.dados) ? _historicoReposicoesModal.dados : [];
    const nome = obterNomeAlunoHistorico(_historicoReposicoesModal.alunoId, dados);
    const resumo = helpers && typeof helpers.resumoHistoricoReposicoesAluno === 'function'
        ? helpers.resumoHistoricoReposicoesAluno(dados, _historicoReposicoesModal.alunoId)
        : null;
    const contagens = resumo ? Object.entries(resumo.contagens)
        .filter(([, quantidade]) => quantidade > 0)
        .map(([status, quantidade]) => `${quantidade} ${status}`)
        .join(' · ') : '';
    if (resumoEl) resumoEl.textContent = `${nome} · ${contagens || 'nenhuma reposição'}`;
    modal.setAttribute('aria-busy', _historicoReposicoesModal.carregando ? 'true' : 'false');

    if (_historicoReposicoesModal.carregando && dados.length === 0) {
        // 5.8 (Parte A): skeleton padronizado (.skeleton); altura 78px é a
        // silhueta original do modal (antes vinha da classe .historico-reposicoes-skeleton).
        conteudo.innerHTML = `
            <div class="historico-reposicoes-carregando" role="status">
                <span class="skeleton" style="height: 78px;"></span>
                <span class="skeleton" style="height: 78px;"></span>
                <span class="skeleton" style="height: 78px;"></span>
                <span class="sr-only">Carregando histórico de reposições</span>
            </div>
        `;
        return;
    }

    const erro = _historicoReposicoesModal.erro
        ? `<div class="historico-reposicoes-erro" role="alert"><span>Não foi possível carregar o histórico.</span><button type="button" class="btn btn-secondary" onclick="window.recarregarHistoricoReposicoes()">Tentar novamente</button></div>`
        : '';
    if (dados.length === 0) {
        conteudo.innerHTML = `${erro}<div class="historico-reposicoes-vazio"><strong>Nenhuma reposição registrada para este aluno.</strong><span>As reposições são criadas a partir da agenda.</span></div>`;
        return;
    }

    const grupos = helpers && typeof helpers.agruparHistoricoReposicoes === 'function'
        ? helpers.agruparHistoricoReposicoes(dados, _historicoReposicoesModal.alunoId)
        : [];
    const titulos = { pendente: 'Pendentes', agendada: 'Agendadas', realizada: 'Realizadas', expirada: 'Expiradas' };
    conteudo.innerHTML = erro + grupos.map((grupo) => `
        <section class="historico-reposicao-grupo" aria-labelledby="historico-grupo-${grupo.status}">
            <h4 id="historico-grupo-${grupo.status}">${titulos[grupo.status]} (${grupo.itens.length})</h4>
            <div class="historico-reposicao-lista">${grupo.itens.map((reposicao) => renderizarLinhaHistoricoReposicao(reposicao, helpers)).join('')}</div>
        </section>
    `).join('');
}

async function carregarHistoricoReposicoesAluno(alunoId, opcoes = {}) {
    const operacao = opcoes.operacao;
    const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const podeAplicar = () => window.contextoDados.atual(contexto)
        && window.contextoDados.podeAplicarInteracao(interacao, operacao)
        && (typeof opcoes.podeAplicar !== 'function' || opcoes.podeAplicar());
    if (!podeAplicar()) throw new Error('CONTEXTO_OBSOLETO');
    const base = window.APP_API_CONFIG && window.APP_API_CONFIG.apiBaseUrl;
    if (typeof window.apiFetchBackend !== 'function' || !base) throw new Error('API indisponível.');
    const resposta = await window.apiFetchBackend(`${base}/reposicoes?alunoId=${encodeURIComponent(alunoId)}`, { operacao, contextoDados: contexto });
    if (!resposta.ok) throw new Error('Falha ao carregar reposições.');
    const dados = await resposta.json();
    if (!podeAplicar()) throw new Error('CONTEXTO_OBSOLETO');
    if (!Array.isArray(dados)) throw new Error('Histórico de reposições inválido.');
    const lista = dados;
    const anteriores = Array.isArray(_reposicoesHistorico)
        ? _reposicoesHistorico.filter((reposicao) => reposicao && reposicao.alunoId !== alunoId)
        : [];
    _reposicoesHistorico = [...anteriores, ...lista];
    _reposicoesHistoricoErro = false;
    window.invalidarChaveRenderAlunos();
    window.renderizarListaAlunos();
    return lista;
}

window.abrirHistoricoReposicoes = async function(alunoId, origem, opcoes = {}) {
    const operacao = opcoes.operacao;
    const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const contextoAtual = () => window.contextoDados.atual(contexto) && window.contextoDados.podeAplicarInteracao(interacao, operacao);
    if (!contextoAtual()) return false;
    const modal = document.getElementById('modalHistoricoReposicoes');
    if (!modal || !document.getElementById('conteudoHistoricoReposicoes')) return false;
    _historicoReposicoesModal = {
        alunoId,
        dados: null,
        origem: origem || document.activeElement,
        carregando: true,
        erro: null
    };
    if (window.DialogController && typeof window.DialogController.open === 'function') {
        window.DialogController.open(modal, {
            trigger: _historicoReposicoesModal.origem || null,
            onRequestClose: window.fecharHistoricoReposicoes
        });
    } else {
        modal.style.display = 'flex';
        modal.setAttribute('tabindex', '-1');
        modal.focus({ preventScroll: true });
    }
    renderizarHistoricoReposicoes();
    const estadoModal = _historicoReposicoesModal;
    const podeAplicar = () => contextoAtual() && estadoModal === _historicoReposicoesModal
        && modal.isConnected && modal.style.display !== 'none';
    try {
        const dados = await carregarHistoricoReposicoesAluno(alunoId, { operacao, contextoDados: contexto, podeAplicar });
        if (!podeAplicar()) return false;
        estadoModal.dados = dados;
    } catch (_) {
        if (!podeAplicar()) return false;
        _reposicoesHistorico = Array.isArray(_reposicoesHistorico)
            ? _reposicoesHistorico.filter((reposicao) => reposicao && reposicao.alunoId !== alunoId)
            : [];
        _reposicoesHistoricoErro = true;
        estadoModal.dados = [];
        estadoModal.erro = true;
        // Falha de GET não transforma etapas de escrita confirmadas em resultado desconhecido.
        // Se a raiz já falhou, sua pendência permanece; caso contrário, só a leitura pede retry.
        window.invalidarChaveRenderAlunos();
        window.renderizarListaAlunos();
    } finally {
        if (podeAplicar()) {
            estadoModal.carregando = false;
            renderizarHistoricoReposicoes();
        }
    }
    return podeAplicar() && estadoModal.erro !== true;
};

window.recarregarHistoricoReposicoes = function() {
    if (_historicoReposicoesModal.alunoId) {
        window.abrirHistoricoReposicoes(_historicoReposicoesModal.alunoId, _historicoReposicoesModal.origem);
    }
};

window.iniciarReagendamentoReposicaoDoHistorico = function(reposicaoId) {
    if (!_historicoReposicoesModal.alunoId) return;
    window._retornoHistoricoReposicoes = {
        alunoId: _historicoReposicoesModal.alunoId,
        reposicaoId: reposicaoId,
        origem: _historicoReposicoesModal.origem
    };
    window.fecharHistoricoReposicoes();
    window.iniciarReagendamentoReposicao(reposicaoId);
};

window.finalizarRetornoHistoricoReposicoes = async function(resultado) {
    const operacao = resultado && resultado.operacao;
    const contexto = (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const podeAplicar = () => window.contextoDados.atual(contexto) && window.contextoDados.podeAplicarInteracao(interacao, operacao);
    if (!podeAplicar()) return false;
    const retorno = window._retornoHistoricoReposicoes;
    window._retornoHistoricoReposicoes = null;
    if (!retorno) return false;
    const historicoCarregado = await window.abrirHistoricoReposicoes(retorno.alunoId, retorno.origem, { operacao, contextoDados: contexto });
    if (!podeAplicar() || historicoCarregado !== true || (operacao && operacao.falha)) return false;
    if (resultado && resultado.status === 'sucesso' && typeof window.mostrarToast === 'function') {
        window.mostrarToast('Histórico de reposições atualizado.');
    }
    return true;
};

window.fecharHistoricoReposicoes = function() {
    const modal = document.getElementById('modalHistoricoReposicoes');
    if (modal && dialogEstaNaPilha(modal)) {
        window.DialogController.close(modal);
    } else if (modal) {
        modal.style.display = 'none';
    }
    const origem = _historicoReposicoesModal.origem;
    const alunoIdHistorico = _historicoReposicoesModal.alunoId;
    _historicoReposicoesModal = { alunoId: null, dados: null, origem: null, carregando: false, erro: null };
    // A lista de alunos é re-renderizada durante o carregamento e pode substituir o botão de origem.
    const destino = origem && origem.isConnected
        ? origem
        : (alunoIdHistorico ? document.querySelector(`[data-historico-aluno="${window.CSS && CSS.escape ? CSS.escape(alunoIdHistorico) : alunoIdHistorico}"]`) : null);
    if (destino && typeof destino.focus === 'function') destino.focus();
};

window.abrirEdicaoCobrancaReposicao = function(reposicaoId, cobravel) {
    if (_operacaoCobrancaReposicao) return;
    const modal = document.getElementById('modalEdicaoCobrancaReposicao');
    const seletor = document.getElementById('seletorCobrancaReposicao');
    const descricao = document.getElementById('descricaoEdicaoCobrancaReposicao');
    if (!modal || !seletor) return;
    // Este diálogo usa select/botões, sem <form>; o controlador não o registra sozinho.
    window.contextoDados.definirFormulario(modal, true);
    _edicaoCobrancaReposicao = { reposicaoId, cobravel: Boolean(cobravel) };
    seletor.value = String(Boolean(cobravel));
    if (descricao) descricao.textContent = 'Escolha quando a reposição deve entrar na cobrança.';
    if (window.DialogController && typeof window.DialogController.open === 'function') {
        window.DialogController.open(modal, {
            trigger: document.activeElement || null,
            onRequestClose: window.fecharEdicaoCobrancaReposicao
        });
    } else {
        modal.style.display = 'flex';
        modal.setAttribute('tabindex', '-1');
        modal.focus({ preventScroll: true });
    }
};

window.fecharEdicaoCobrancaReposicao = function() {
    if (_operacaoCobrancaReposicao && window.contextoDados.operacaoAtual(_operacaoCobrancaReposicao)) return;
    const modal = document.getElementById('modalEdicaoCobrancaReposicao');
    if (modal && dialogEstaNaPilha(modal)) {
        window.DialogController.close(modal);
    } else if (modal) {
        modal.style.display = 'none';
        window.contextoDados.definirFormulario(modal, false);
    }
    _edicaoCobrancaReposicao = null;
};

window.salvarEdicaoCobrancaReposicao = async function() {
    if (_operacaoCobrancaReposicao) return;
    const conta = window.contextoDados.capturar();
    if (!window.contextoDados.atual(conta)) return;
    const contexto = _edicaoCobrancaReposicao;
    const seletor = document.getElementById('seletorCobrancaReposicao');
    if (!contexto || !seletor) return;
    const novoCobravel = seletor.value === 'true';
    if (novoCobravel === contexto.cobravel) {
        window.fecharEdicaoCobrancaReposicao();
        return;
    }

    const base = window.APP_API_CONFIG && window.APP_API_CONFIG.apiBaseUrl;
    if (typeof window.apiFetchBackend !== 'function' || !base) return;
    const registro = (Array.isArray(_reposicoesHistorico) ? _reposicoesHistorico : []).find((item) => item && item.id === contexto.reposicaoId);
    const alunoId = registro && registro.alunoId || _historicoReposicoesModal.alunoId;
    const op = window.contextoDados.iniciarOperacao({
        tipo: 'cobranca-reposicao', contexto: conta,
        alvos: { alunoIds: alunoId ? [alunoId] : [], reposicaoIds: [contexto.reposicaoId], agendamentoIds: registro && registro.agendamentoReposicaoId ? [registro.agendamentoReposicaoId] : [], cicloIds: [] },
        intencao: { reposicaoId: contexto.reposicaoId, cobravel: novoCobravel }
    });
    if (!op) { await recuperarOperacaoAluno(); return; }
    _operacaoCobrancaReposicao = op;
    const botao = document.getElementById('btnSalvarEdicaoCobrancaReposicao');
    if (botao) botao.disabled = true;
    let escritaConfirmada = false;
    try {
        exigirOperacaoAlunoAtual(op);
        if (!window.contextoDados.atualizarOperacao(op)) throw new Error('Não foi possível preservar a alteração.');
        const resposta = await window.apiFetchBackend(
            `${base}/reposicoes/${encodeURIComponent(contexto.reposicaoId)}`,
            {
                method: 'PATCH',
                operacao: op,
                contextoDados: op.contexto,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cobravel: novoCobravel })
            }
        );
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.error || 'Não foi possível alterar a cobrança.');
        }
        escritaConfirmada = true;
        const atualizado = await resposta.json();
        exigirOperacaoAlunoAtual(op);
        if (!atualizado || atualizado.id !== contexto.reposicaoId) throw new Error('Resposta de cobrança inválida.');
        if (Array.isArray(_reposicoesHistorico)) {
            const indice = _reposicoesHistorico.findIndex((item) => item && item.id === contexto.reposicaoId);
            if (indice !== -1) _reposicoesHistorico[indice] = atualizado;
        }
        contexto.cobravel = novoCobravel;
        if (Array.isArray(_historicoReposicoesModal.dados)) {
            const indice = _historicoReposicoesModal.dados.findIndex((item) => item && item.id === contexto.reposicaoId);
            if (indice !== -1) _historicoReposicoesModal.dados[indice] = atualizado;
        }
        window.invalidarChaveRenderAlunos();
        window.renderizarListaAlunos();
        renderizarHistoricoReposicoes();
        if (typeof window.mostrarToast === 'function') window.mostrarToast('Cobrança da reposição atualizada.');
    } catch (erro) {
        escritaConfirmada = escritaConfirmada || op.etapas.some((etapa) => etapa.method === 'PATCH' && etapa.confirmada);
        if (!escritaConfirmada) window.contextoDados.marcarFalhaOperacao(op, erro);
        if (window.contextoDados.operacaoAtual(op)) {
            if (escritaConfirmada) {
                // O PATCH já foi aceito: recuperação repete somente a consulta, nunca a escrita.
                contexto.cobravel = novoCobravel;
                try {
                    if (!alunoId) throw new Error('Aluno da reposição indisponível.');
                    const dados = await carregarHistoricoReposicoesAluno(alunoId, { operacao: op, contextoDados: op.contexto });
                    exigirOperacaoAlunoAtual(op);
                    if (_historicoReposicoesModal.alunoId === alunoId) _historicoReposicoesModal.dados = dados;
                    renderizarHistoricoReposicoes();
                } catch (_) { /* A escrita continua confirmada mesmo se a releitura falhar. */ }
            }
            if (window.contextoDados.operacaoAtual(op) && typeof window.mostrarToast === 'function') {
                window.mostrarToast(escritaConfirmada ? 'Cobrança salva. Se o histórico não atualizou, tente novamente apenas a leitura.' : 'Cobrança não confirmada. Verifique os dados no servidor antes de tentar novamente.', escritaConfirmada ? 'warning' : 'error');
            }
        }
    } finally {
        try { await window.contextoDados.finalizarOperacao(op); }
        finally {
            if (window.contextoDados.atual(op.contexto) && _operacaoCobrancaReposicao === op) {
                _operacaoCobrancaReposicao = null;
                if (botao) botao.disabled = false;
                if (escritaConfirmada) window.fecharEdicaoCobrancaReposicao();
            }
        }
    }
};

async function carregarDadosComplementaresAlunos(opcoes = {}) {
    const operacao = opcoes.operacao;
    const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const podeAplicar = () => window.contextoDados.atual(contexto) && window.contextoDados.podeAplicarInteracao(interacao, operacao);
    if (!podeAplicar()) return false;
    let sucesso = true;
    try {
        let resumo;
        if (opcoes.financasAtualizadas === true) {
            // A recuperação já confirmou a leitura: até um mapa vazio é válido e não exige outro GET.
            if (typeof window.obterResumoFinanceiroPorAluno !== 'function') throw new Error('Financeiro indisponível.');
            resumo = window.obterResumoFinanceiroPorAluno();
        } else {
            if (typeof window.garantirDadosFinancas !== 'function') throw new Error('Financeiro indisponível.');
            resumo = await window.garantirDadosFinancas({ forcarRemoto: true, operacao, contextoDados: contexto });
        }
        if (!podeAplicar()) return false;
        if (!resumo || typeof resumo !== 'object' || Array.isArray(resumo)) throw new Error('Resumo financeiro inválido.');
        _resumoFinanceiroPorAluno = resumo;
        _resumoFinanceiroErro = false;
    } catch (_) {
        if (!podeAplicar()) return false;
        _resumoFinanceiroPorAluno = {};
        _resumoFinanceiroErro = true;
        sucesso = false;
    }

    const base = window.APP_API_CONFIG && window.APP_API_CONFIG.apiBaseUrl;
    if (!podeAplicar()) return false;
    try {
        if (typeof window.apiFetchBackend !== 'function' || !base) throw new Error('API indisponível.');
        const resposta = await window.apiFetchBackend(`${base}/reposicoes`, { operacao, contextoDados: contexto });
        if (!resposta.ok) throw new Error('Falha ao carregar reposições.');
        const dados = await resposta.json();
        if (!podeAplicar()) return false;
        if (!Array.isArray(dados)) throw new Error('Histórico de reposições inválido.');
        _reposicoesHistorico = dados;
        _reposicoesHistoricoErro = false;
    } catch (_) {
        if (!podeAplicar()) return false;
        _reposicoesHistorico = [];
        _reposicoesHistoricoErro = true;
        sucesso = false;
    }

    if (!podeAplicar()) return false;
    try {
        if (typeof window.apiFetchBackend !== 'function' || !base) throw new Error('API indisponível.');
        const resposta = await window.apiFetchBackend(`${base}/alunos/consistencia-agenda`, { operacao, contextoDados: contexto });
        if (!resposta.ok) throw new Error('Falha ao carregar consistência da agenda.');
        const dados = await resposta.json();
        if (!podeAplicar()) return false;
        if (!Array.isArray(dados)) throw new Error('Consistência da agenda inválida.');
        _consistenciaAgendaPorAluno = {};
        dados.forEach((item) => {
            if (item && item.alunoId) _consistenciaAgendaPorAluno[item.alunoId] = item;
        });
        _consistenciaAgendaErro = false;
    } catch (_) {
        if (!podeAplicar()) return false;
        _consistenciaAgendaPorAluno = {};
        _consistenciaAgendaErro = true;
        sucesso = false;
    }

    if (!podeAplicar()) return false;
    window.invalidarChaveRenderAlunos();
    window.renderizarListaAlunos();
    return podeAplicar() && sucesso;
}

// Recuperação explícita (cartão C): refaz somente a leitura dos complementos da lista
// de alunos. Nunca escreve e nunca reenvia operação; devolve false quando a leitura
// ficou incompleta (a recuperação usa isso para manter o aviso de complemento pendente).
window.atualizarAlunosAposRecuperacao = async function(opcoes = {}) {
    const operacao = opcoes.operacao;
    const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const podeAplicar = () => window.contextoDados.atual(contexto) && window.contextoDados.podeAplicarInteracao(interacao, operacao);
    if (!podeAplicar()) return false;
    const atualizado = await carregarDadosComplementaresAlunos({ ...opcoes, contextoDados: contexto });
    return podeAplicar() && atualizado === true;
};

window.inicializarPaginaCadastro = async function(opcoes = {}) {
    const operacao = opcoes.operacao;
    const contexto = opcoes.contextoDados || (operacao && operacao.contexto) || window.contextoDados.capturar();
    const interacao = window.contextoDados.capturarInteracao();
    const podeAplicar = () => window.contextoDados.atual(contexto) && window.contextoDados.podeAplicarInteracao(interacao, operacao);
    if (!podeAplicar()) return;
    const deveSincronizar = opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;
    if (deveSincronizar && typeof carregarDados === 'function') {
        const resultado = await carregarDados({
            forcarRender: false,
            forcarRemoto: opcoes.sincronizar === true,
            operacao,
            contextoDados: contexto
        });
        if (!podeAplicar() || !resultado || resultado.ok !== true) return;
        window.__sincronizacaoInicialConcluida = true;
    }
    window.renderizarListaAlunos();
    window.togglePainelCadastro(false);
    carregarDadosComplementaresAlunos(opcoes);
};
window.inicializarAlunos = async function() {
    await window.inicializarPaginaCadastro();
};
let assinaturaAberturaCadastroAluno = null;

function assinaturaFormularioAluno() {
    const form = document.getElementById('formNovoAluno');
    if (!form) return '';
    return JSON.stringify(Array.from(form.elements).map((el) => (
        el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value
    )));
}

function dialogEstaNaPilha(modal) {
    return Boolean(window.DialogController
        && typeof window.DialogController.getStack === 'function'
        && window.DialogController.getStack().includes(modal));
}

window.cancelarCadastroAluno = function() {
    if (_operacaoAluno) return;
    const alterado = assinaturaAberturaCadastroAluno !== null
        && assinaturaFormularioAluno() !== assinaturaAberturaCadastroAluno;
    if (alterado && !window.confirm('Descartar as alterações deste aluno?')) return;
    window.togglePainelCadastro(false);
};

window.togglePainelCadastro = function(mostrar) {
    if (_operacaoAluno && window.contextoDados.operacaoAtual(_operacaoAluno)) return;
    const modal = document.getElementById('modalFormAluno');
    const form = document.getElementById('formNovoAluno');
    if (!modal) {
        if (form) window.contextoDados.definirFormulario(form, !!mostrar);
        return;
    }

    if (mostrar) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'tituloFormAluno');
        assinaturaAberturaCadastroAluno = assinaturaFormularioAluno();
        if (window.DialogController && typeof window.DialogController.open === 'function') {
            window.DialogController.open(modal, {
                trigger: document.activeElement || null,
                onRequestClose: window.cancelarCadastroAluno
            });
        } else {
            window.contextoDados.definirFormulario(modal, true);
            modal.style.display = 'flex';
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('tabindex', '-1');
            modal.focus({ preventScroll: true });
        }
    } else {
        assinaturaAberturaCadastroAluno = null;
        if (dialogEstaNaPilha(modal)) {
            window.DialogController.close(modal);
        } else {
            modal.style.display = 'none';
            modal.setAttribute('aria-modal', 'false');
            window.contextoDados.definirFormulario(modal, false);
        }
        if (form) form.reset();

        const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
        if (elObjetivoSwitch) elObjetivoSwitch.checked = false;
        aplicarRegrasObjetivoNoFormulario();
        atualizarStatusSwitchFormulario(true);
        const btnExcluirAlunoModal = document.getElementById('btnExcluirAlunoModal');
        if (btnExcluirAlunoModal) btnExcluirAlunoModal.style.display = 'none';

        const idEdicao = document.getElementById('alunoIdEdicao');
        if (idEdicao) idEdicao.value = '';
    }
};
window.abrirCadastroParaNovo = function() {
    if (_operacaoAluno) return;
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');

    if (titulo) titulo.textContent = 'Cadastrar Novo Aluno';
    if (botao) botao.textContent = 'Adicionar';

    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    if (elObjetivoSwitch) elObjetivoSwitch.checked = false;
    const elFechamentoMesCheio = document.getElementById('alunoFechamentoMesCheio');
    const elMetodoCobranca = document.getElementById('alunoMetodoCobranca');
    if (elFechamentoMesCheio) elFechamentoMesCheio.checked = false;
    if (elMetodoCobranca) elMetodoCobranca.value = 'por_aula';
    aplicarRegrasObjetivoNoFormulario();
    atualizarStatusSwitchFormulario(true);
    const btnExcluirAlunoModal = document.getElementById('btnExcluirAlunoModal');
    if (btnExcluirAlunoModal) btnExcluirAlunoModal.style.display = 'none';

    window.togglePainelCadastro(true);
};
window.renderizarListaAlunos = function() {
    if (!window.contextoDados.atual(window.contextoDados.capturar())) return;
    const listaContainer = document.getElementById('listaAlunos');

    if (!listaContainer) return;

    if (typeof alunos !== 'undefined') {
        // Dirty-check: skip the DOM write if the student list is unchanged.
        // Inclui aulasParaRepor para a caixinha de reposições reagir no re-render
        // (sem re-render a badge de "a vencer" só aparecia quando o fetch financeiro
        // assíncrono voltava e invalidava a chave — o "delay" reportado).
        const _chaveAtual = (function () {
            try {
                return JSON.stringify(alunos)
                    + '|' + JSON.stringify(_resumoFinanceiroPorAluno)
                    + '|' + _resumoFinanceiroErro
                    + '|' + JSON.stringify(_consistenciaAgendaPorAluno)
                    + '|' + _consistenciaAgendaErro
                    + '|' + JSON.stringify(_reposicoesHistorico)
                    + '|' + _reposicoesHistoricoErro
                    + '|' + JSON.stringify(typeof aulasParaRepor === 'undefined' ? [] : aulasParaRepor);
            } catch (_) { return null; }
        })();
        if (_chaveAtual !== null && _chaveAtual === _ultimaChaveRenderAlunos) return;
        _ultimaChaveRenderAlunos = _chaveAtual;

        if (alunos.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #666;">
                    <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 1rem;">Nenhum aluno cadastrado no momento.</p>
                </div>
            `;
            return;
        }

        listaContainer.innerHTML = alunos.map(aluno => {
            const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
            const freqAcordada = obterFrequenciaContratoAluno(aluno);
            const local = aluno.local || 'Não definido';
            const objetivo = normalizarObjetivoAluno(aluno.objetivo);
            const objetivoClass = objetivo.replace(/\s+/g, '');
            const statusAluno = normalizarStatusAlunoLocal(aluno.status);
            const statusLabel = statusAluno === 'inativo' ? 'Inativo' : 'Ativo';
            const financeiroAtivo = objetivo !== 'Consultoria Online';
            const metodoCobranca = !financeiroAtivo
                ? 'Financeiro'
                : (aluno.metodoCobranca === 'valor_fixo' ? 'Valor fixo' : 'Por aula');
            const cobrancaDetalhe = !financeiroAtivo
                ? 'Não aplicável'
                : (aluno.metodoCobranca === 'valor_fixo'
                    ? `${formatarMoedaFinanceira(aluno.valorFixoCiclo)} / ciclo`
                    : `${formatarMoedaFinanceira(preco)} / aula`);
            const fechamentoLabel = !financeiroAtivo
                ? 'Consultoria Online'
                : (aluno.fechamentoMesCheio
                    ? 'Fecha por mês cheio'
                    : (aluno.diaVencimento ? `Vence dia ${aluno.diaVencimento}` : 'Sem vencimento definido'));
                    const observacoes = String(aluno.observacoes || '').trim();

            // Indicadores do card: ciclo financeiro, consistência de agenda e reposições a vencer.
            const caixinhas = [
                montarCaixinhaFinanceiraAluno(aluno, objetivo),
                montarCaixinhaConsistenciaAluno(aluno),
                montarCaixinhaReposicaoAluno(aluno)
            ].filter(Boolean).join('');

            return `
                <div class="aluno-card aluno-card--gerenciavel" onclick="prepararEdicaoAluno('${aluno.id}')" style="display: flex; flex-direction: column; gap: 10px; position: relative; cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <strong style="display: block; color: #FFF; font-size: 1.05rem; word-break: break-word;">${aluno.nome}</strong>
                            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
                                <span class="objetivo-${objetivoClass}" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${objetivo}</span>
                                <span style="color: #969696; font-size: 0.75rem;">•</span> <!-- Etapa 2 (Cartão D): 1.47:1 → 4.85:1 sobre o card #2a2a2a -->
                                <span style="font-size: 0.75rem; color: #AAA; font-weight: 600;">Contrato: ${freqAcordada}x/sem</span>
                            </div>
                        </div>
                        <div onclick="event.stopPropagation();" style="margin-left: auto; display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-shrink: 0;">
                            <!-- Etapa 7 (Cartão B, achado 4.6): o card continua clicável ao
                                 toque (alvo grande), mas NÃO é o alvo de teclado — ele tem
                                 interativo aninhado (toggle de status e <details>), o que
                                 impede que ele mesmo seja o controle. O alvo de teclado é
                                 este botão. -->
                            <button
                                type="button"
                                class="aluno-card-editar"
                                onclick="prepararEdicaoAluno('${aluno.id}')"
                                aria-label="Editar ${escaparTextoAluno(aluno.nome)}"
                            ><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                            <label class="status-toggle status-toggle--card" for="alunoStatusCard-${aluno.id}" style="margin: 0;">
                                <input type="checkbox" id="alunoStatusCard-${aluno.id}" ${statusAluno === 'ativo' ? 'checked' : ''} onchange="alternarStatusAluno('${aluno.id}', this.checked)" />
                                <span class="status-toggle-track" aria-hidden="true"><span class="status-toggle-knob"></span></span>
                                <span class="status-toggle-label">${statusLabel}</span>
                            </label>
                        </div>
                    </div>

                    <details class="aluno-card-detalhes" onclick="event.stopPropagation();" style="border-top: 1px solid #2A2A2A; padding-top: 8px; margin-top: 2px;">
                        <summary style="cursor: pointer; color: #FFD700; font-weight: 700; font-size: 0.875rem;">Ver detalhes</summary>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 0.875rem; color: #B0B0B0; margin-top: 8px;">
                            <div><i class="fa-solid fa-location-dot" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${local}</div>
                            <div><i class="fa-solid fa-dollar-sign" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${metodoCobranca}: ${cobrancaDetalhe}</div>
                            <div><i class="fa-solid fa-calendar-days" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${fechamentoLabel}</div>
                        </div>

                        ${observacoes ? `<div class="aluno-card-observacoes"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i><span>${escaparTextoAluno(observacoes)}</span></div>` : ''}
                    </details>

                    ${caixinhas ? `<div class="aluno-card-indicadores">${caixinhas}</div>` : ''}
                </div>
            `;
        }).join('');
    }
};
window.prepararEdicaoAluno = function(id) {
    if (_operacaoAluno) return;
    if (typeof alunos === 'undefined') return;
    const aluno = obterAlunoPorIdView(id);
    if (!aluno) return;
    const elId = document.getElementById('alunoIdEdicao');
    const elNome = document.getElementById('alunoNome');
    const elLocal = document.getElementById('alunoLocal');
    const elPreco = document.getElementById('alunoPreco');
    const elTelefone = document.getElementById('alunoTelefone');
    const elObservacoes = document.getElementById('alunoObservacoes');
    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    const elFrequencia = document.getElementById('alunoFrequenciaSemanal');

    if (elId) elId.value = aluno.id;
    if (elNome) elNome.value = aluno.nome;
    if (elLocal) elLocal.value = aluno.local || '';
    if (elPreco) elPreco.value = aluno.preco || '';
    if (elTelefone) elTelefone.value = aluno.telefone || '';
    if (elObservacoes) elObservacoes.value = aluno.observacoes || '';
    if (elObjetivoSwitch) elObjetivoSwitch.checked = normalizarObjetivoAluno(aluno.objetivo) === 'Consultoria Online';
    if (elFrequencia) elFrequencia.value = aluno.frequenciaSemanal || '2';
    const elFechamentoMesCheio = document.getElementById('alunoFechamentoMesCheio');
    const elDiaVencimento = document.getElementById('alunoDiaVencimento');
    const elMetodoCobranca = document.getElementById('alunoMetodoCobranca');
    const elValorFixoCiclo = document.getElementById('alunoValorFixoCiclo');
    if (elFechamentoMesCheio) elFechamentoMesCheio.checked = !!aluno.fechamentoMesCheio;
    if (elDiaVencimento) elDiaVencimento.value = aluno.diaVencimento || '';
    if (elMetodoCobranca) elMetodoCobranca.value = aluno.metodoCobranca || 'por_aula';
    if (elValorFixoCiclo) elValorFixoCiclo.value = aluno.valorFixoCiclo || '';
    atualizarStatusSwitchFormulario(normalizarStatusAlunoLocal(aluno.status) === 'ativo');
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    const btnExcluirAlunoModal = document.getElementById('btnExcluirAlunoModal');
    if (titulo) titulo.textContent = 'Editar Aluno';
    if (botao) botao.textContent = 'Atualizar';
    if (btnExcluirAlunoModal) btnExcluirAlunoModal.style.display = 'inline-flex';
    aplicarRegrasObjetivoNoFormulario();
    window.togglePainelCadastro(true);
};
window.deletarAlunoSPA = async function(id) {
    if (_operacaoAluno || typeof alunos === 'undefined') return false;
    const contexto = window.contextoDados.capturar();
    if (!window.contextoDados.atual(contexto)) return false;
    const indice = alunos.findIndex(a => a.id === id);
    if (indice === -1 || !confirm("Excluir remove permanentemente o cadastro e os vínculos atuais de agenda. Para preservar histórico operacional, prefira inativar. Deseja realmente excluir este aluno?")) return false;
    const op = window.contextoDados.iniciarOperacao({ tipo: 'excluir-aluno', contexto, alvos: alvosOperacaoAluno(id), intencao: { alunoId: id, excluir: true } });
    if (!op) { await recuperarOperacaoAluno(); return false; }
    _operacaoAluno = op;
    const botao = document.getElementById('btnExcluirAlunoModal');
    if (botao) botao.disabled = true;
    let escritaConfirmada = false;
    try {
        exigirOperacaoAlunoAtual(op);
        alunos.splice(indice, 1);
        if (!window.contextoDados.atualizarOperacao(op)) throw new Error('Não foi possível preservar a exclusão.');
        if (typeof salvarDados !== 'function') throw new Error('Persistência indisponível.');
        exigirPersistenciaAluno(op, await salvarDados(true, { operacao: op, contextoDados: op.contexto }));
        escritaConfirmada = true;
        window.renderizarListaAlunos();
        if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
        if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
        if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
        return true;
    } catch (erro) {
        if (!escritaConfirmada) window.contextoDados.marcarFalhaOperacao(op, erro);
        if (window.contextoDados.operacaoAtual(op) && typeof mostrarToast === 'function') mostrarToast(escritaConfirmada ? 'Aluno excluído. Atualize apenas os dados para atualizar a tela.' : 'Exclusão não confirmada. Verifique os dados no servidor.', escritaConfirmada ? 'warning' : 'error');
        return escritaConfirmada;
    } finally {
        try { await window.contextoDados.finalizarOperacao(op); }
        finally {
            if (window.contextoDados.atual(op.contexto) && _operacaoAluno === op) {
                _operacaoAluno = null;
                if (botao) botao.disabled = false;
            }
        }
    }
};
window.excluirAlunoViaModal = async function() {
    const contexto = window.contextoDados.capturar();
    const idEdicao = document.getElementById('alunoIdEdicao').value;
    if (!idEdicao) return;
    const excluiu = await window.deletarAlunoSPA(idEdicao);
    if (excluiu && window.contextoDados.atual(contexto)) window.togglePainelCadastro(false);
};
window.alternarStatusAluno = async function(id, ativoForcado) {
    if (_operacaoAluno || typeof alunos === 'undefined') return;
    const contexto = window.contextoDados.capturar();
    if (!window.contextoDados.atual(contexto)) return;
    const index = alunos.findIndex(a => a.id === id);
    if (index === -1) return;

    const statusAtual = normalizarStatusAlunoLocal(alunos[index].status);
    const proximoStatus = typeof ativoForcado === 'boolean'
        ? (ativoForcado ? 'ativo' : 'inativo')
        : (statusAtual === 'inativo' ? 'ativo' : 'inativo');
    if (statusAtual === proximoStatus) return;

    const op = window.contextoDados.iniciarOperacao({ tipo: 'status-aluno', contexto, alvos: alvosOperacaoAluno(id), intencao: { alunoId: id, status: proximoStatus } });
    if (!op) { await recuperarOperacaoAluno(); return; }
    _operacaoAluno = op;
    const controle = document.getElementById(`alunoStatusCard-${id}`);
    if (controle) controle.disabled = true;
    let escritaConfirmada = false;
    try {
        exigirOperacaoAlunoAtual(op);
        alunos[index].status = proximoStatus;
        if (!window.contextoDados.atualizarOperacao(op)) throw new Error('Não foi possível preservar o status.');
        if (typeof salvarDados !== 'function') throw new Error('Persistência indisponível.');
        exigirPersistenciaAluno(op, await salvarDados(true, { operacao: op, contextoDados: op.contexto }));
        escritaConfirmada = true;
        window.renderizarListaAlunos();
        if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
        if (typeof mostrarToast === 'function') mostrarToast(proximoStatus === 'inativo' ? 'Aluno inativado com sucesso!' : 'Aluno ativado com sucesso!');
    } catch (erro) {
        if (!escritaConfirmada) window.contextoDados.marcarFalhaOperacao(op, erro);
        if (window.contextoDados.operacaoAtual(op) && typeof mostrarToast === 'function') mostrarToast(escritaConfirmada ? 'Status salvo. Atualize apenas os dados para atualizar a tela.' : 'Status não confirmado. Verifique os dados no servidor.', escritaConfirmada ? 'warning' : 'error');
    } finally {
        try { await window.contextoDados.finalizarOperacao(op); }
        finally {
            if (window.contextoDados.atual(op.contexto) && _operacaoAluno === op) {
                _operacaoAluno = null;
                if (controle) controle.disabled = false;
            }
        }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnFecharHistoricoReposicoes')?.addEventListener('click', window.fecharHistoricoReposicoes);
    document.getElementById('btnRodapeHistoricoReposicoes')?.addEventListener('click', window.fecharHistoricoReposicoes);
    document.getElementById('btnCancelarEdicaoCobrancaReposicao')?.addEventListener('click', window.fecharEdicaoCobrancaReposicao);
    document.getElementById('btnSalvarEdicaoCobrancaReposicao')?.addEventListener('click', window.salvarEdicaoCobrancaReposicao);

    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    if (elObjetivoSwitch) {
        elObjetivoSwitch.addEventListener('change', aplicarRegrasObjetivoNoFormulario);
    }
    const elFechamentoMesCheio = document.getElementById('alunoFechamentoMesCheio');
    if (elFechamentoMesCheio) {
        elFechamentoMesCheio.addEventListener('change', aplicarRegrasFinanceirasNoFormulario);
    }
    const elMetodoCobranca = document.getElementById('alunoMetodoCobranca');
    if (elMetodoCobranca) {
        elMetodoCobranca.addEventListener('change', aplicarRegrasFinanceirasNoFormulario);
    }
    const elStatusSwitch = document.getElementById('alunoStatusSwitch');
    if (elStatusSwitch) {
        elStatusSwitch.addEventListener('change', () => atualizarStatusSwitchFormulario(elStatusSwitch.checked));
    }
    atualizarStatusSwitchFormulario(true);
    aplicarRegrasObjetivoNoFormulario();

    const btnExcluirAlunoModal = document.getElementById('btnExcluirAlunoModal');
    if (btnExcluirAlunoModal) {
        btnExcluirAlunoModal.addEventListener('click', window.excluirAlunoViaModal);
    }

    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (_operacaoAluno) return;
            const contexto = window.contextoDados.capturar();
            if (!window.contextoDados.atual(contexto)) return;

            const idEdicao = document.getElementById('alunoIdEdicao').value;
            const ehConsultoriaOnline = objetivoSwitchEstaAtivo();
            const nome = document.getElementById('alunoNome').value.trim();
            const local = document.getElementById('alunoLocal').value.trim();
            const preco = ehConsultoriaOnline ? 0 : (normalizarNumeroFinanceiro(document.getElementById('alunoPreco').value) || 0);
            const telefone = document.getElementById('alunoTelefone').value.trim();
            const observacoes = document.getElementById('alunoObservacoes').value.trim();
            const objetivo = obterObjetivoAlunoDoSwitch();
            const corObjetivo = montarCorObjetivoTangerina();
            const frequenciaSemanal = ehConsultoriaOnline
                ? 0
                : (parseInt(document.getElementById('alunoFrequenciaSemanal').value, 10) || 2);
            const status = normalizarStatusAlunoLocal(obterStatusAlunoDoSwitch());
            const fechamentoMesCheio = !ehConsultoriaOnline && document.getElementById('alunoFechamentoMesCheio').checked;
            const diaVencimentoRaw = document.getElementById('alunoDiaVencimento').value;
            const diaVencimento = fechamentoMesCheio || ehConsultoriaOnline
                ? null
                : (parseInt(diaVencimentoRaw, 10) || null);
            const metodoCobranca = ehConsultoriaOnline
                ? 'por_aula'
                : (document.getElementById('alunoMetodoCobranca').value || 'por_aula');
            const valorFixoRaw = document.getElementById('alunoValorFixoCiclo').value;
            const valorFixoCiclo = metodoCobranca === 'valor_fixo'
                ? normalizarNumeroFinanceiro(valorFixoRaw)
                : null;

            if (typeof alunos === 'undefined') return;

            if (!ehConsultoriaOnline) {
                if (!fechamentoMesCheio && !diaVencimento) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast("Informe o dia de vencimento ou ative 'Fechar por mês cheio'.", 'error');
                    }
                    return;
                }
                if (!fechamentoMesCheio && diaVencimento === 1) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast("O vencimento no dia 1 exige 'Fechar por mês cheio'.", 'error');
                    }
                    return;
                }
                if (metodoCobranca === 'valor_fixo' && (!Number.isFinite(valorFixoCiclo) || valorFixoCiclo <= 0)) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Informe o valor fixo do ciclo.', 'error');
                    }
                    return;
                }
                if (metodoCobranca === 'por_aula' && (!Number.isFinite(preco) || preco <= 0)) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Informe o valor hora/aula para salvar este aluno.', 'error');
                    }
                    return;
                }
            }

            const index = idEdicao ? alunos.findIndex(a => a.id === idEdicao) : -1;
            if (idEdicao && index === -1) return;
            const id = idEdicao || Date.now().toString();
            const dadosAluno = { id, nome, local, preco, telefone, observacoes, objetivo, corObjetivo, frequenciaSemanal, status, fechamentoMesCheio, diaVencimento, metodoCobranca, valorFixoCiclo };
            const alunoAntigo = index !== -1 ? { ...alunos[index] } : null;
            const deveSincronizarAgenda = alunoAntigo && (alunoAntigo.nome !== nome || alunoAntigo.local !== local);
            const op = window.contextoDados.iniciarOperacao({
                tipo: idEdicao ? 'editar-aluno' : 'criar-aluno', contexto,
                alvos: alvosOperacaoAluno(id), intencao: { aluno: dadosAluno }
            });
            if (!op) { await recuperarOperacaoAluno(); return; }
            _operacaoAluno = op;
            const botao = document.getElementById('btnSalvarAluno');
            if (botao) botao.disabled = true;
            let concluida = false;
            try {
                exigirOperacaoAlunoAtual(op);
                if (index !== -1) Object.assign(alunos[index], dadosAluno);
                else alunos.push(dadosAluno);
                if (!window.contextoDados.atualizarOperacao(op, { alvos: alvosOperacaoAluno(id), intencao: { aluno: dadosAluno } })) throw new Error('Não foi possível preservar o cadastro.');

                // [TAG-CASCADE-SYNC] Preparar/persistir a agenda sob a mesma raiz antes do snapshot de salvarDados.
                // A cascata recebe a raiz: não iniciar salvamentos concorrentes com dados antigos.
                if (deveSincronizarAgenda) {
                    if (typeof sincronizarAgendamentosDoAluno !== 'function') throw new Error('Sincronização dos agendamentos indisponível.');
                    exigirOperacaoAlunoAtual(op);
                    const resultado = await sincronizarAgendamentosDoAluno(id, { nome, local, objetivo }, { operacao: op, contextoDados: op.contexto });
                    exigirOperacaoAlunoAtual(op);
                    if (!window.contextoDados.atualizarOperacao(op, { alvos: alvosOperacaoAluno(id) })) throw new Error('Não foi possível preservar os agendamentos.');
                    exigirPersistenciaAluno(op, resultado);
                }
                exigirOperacaoAlunoAtual(op);
                if (typeof salvarDados !== 'function') throw new Error('Persistência indisponível.');
                exigirPersistenciaAluno(op, await salvarDados(true, { operacao: op, contextoDados: op.contexto }));
                concluida = true;
                window.log.info('[aluno]', idEdicao ? 'Aluno editado' : 'Aluno criado', { id, nome, metodoCobranca });
                window.renderizarListaAlunos();
                if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
                if (typeof mostrarToast === 'function') mostrarToast(idEdicao ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!');
            } catch (erro) {
                if (!concluida) window.contextoDados.marcarFalhaOperacao(op, erro);
                if (window.contextoDados.operacaoAtual(op) && typeof mostrarToast === 'function') mostrarToast(concluida ? 'Cadastro salvo. Atualize apenas os dados para atualizar a tela.' : 'Cadastro não confirmado. A alteração foi mantida para verificar no servidor.', concluida ? 'warning' : 'error');
            } finally {
                try { await window.contextoDados.finalizarOperacao(op); }
                finally {
                    if (window.contextoDados.atual(op.contexto) && _operacaoAluno === op) {
                        _operacaoAluno = null;
                        if (botao) botao.disabled = false;
                        if (concluida && !op.falha) window.togglePainelCadastro(false);
                    }
                }
            }
        });
    }
});
