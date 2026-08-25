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

function obterFiltroStatusAlunos() {
    const select = document.getElementById('filtroAlunosStatus');
    return select ? (select.value || 'todos') : 'todos';
}

function obterFiltroObjetivoAlunos() {
    const select = document.getElementById('filtroAlunosObjetivo');
    return select ? (select.value || 'todos') : 'todos';
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
let _consistenciaAgendaPorAluno = {};

function montarCaixinhaFinanceiraAluno(aluno, objetivo) {
    if (objetivo === 'Consultoria Online') return '';

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

    const ciclo = resumo && resumo.cicloAtual;
    if (!ciclo) return '';

    const statusLabels = { pago: 'pago', atrasado: 'atrasado', em_aberto: 'em aberto' };
    const statusTexto = statusLabels[ciclo.status] || 'em aberto';
    const periodo = `${formatarDataCurtaAluno(ciclo.cicloInicio)} → ${formatarDataCurtaAluno(ciclo.cicloFim)}`;

    return `
        <div class="aluno-card-indicador">
            <div class="aluno-card-indicador-titulo">Ciclo atual: ${formatarMoedaFinanceira(ciclo.valorTotalCiclo)} · ${statusTexto}</div>
            <div class="aluno-card-indicador-detalhe">${periodo}</div>
        </div>
    `;
}

function montarCaixinhaConsistenciaAluno(aluno) {
    const consistencia = _consistenciaAgendaPorAluno[aluno.id];
    if (!consistencia || !consistencia.aulasFaltamAgendar) return '';

    return `
        <div class="aluno-card-indicador aluno-card-indicador--alerta">
            <div class="aluno-card-indicador-titulo">⚠️ Faltam agendar ${consistencia.aulasFaltamAgendar} de ${consistencia.aulasSemanaisContrato} aulas semanais</div>
            <div class="aluno-card-indicador-detalhe">Recorrência da agenda menor que o contrato.</div>
        </div>
    `;
}

function formatarDataCurtaAluno(dataISO) {
    if (!dataISO) return '--/--';
    const partes = String(dataISO).split('-');
    if (partes.length !== 3) return String(dataISO);
    return `${partes[2]}/${partes[1]}`;
}

async function carregarDadosComplementaresAlunos() {
    if (typeof window.garantirDadosFinancas === 'function') {
        try {
            _resumoFinanceiroPorAluno = await window.garantirDadosFinancas() || {};
        } catch (_) { /* card do aluno segue sem o bloco financeiro */ }
    }

    if (typeof window.apiFetchBackend === 'function') {
        try {
            const base = window.API_BASE_URL || 'https://personal-app-api.vercel.app/api';
            const resposta = await window.apiFetchBackend(`${base}/alunos/consistencia-agenda`);
            if (resposta.ok) {
                const dados = await resposta.json();
                _consistenciaAgendaPorAluno = {};
                (Array.isArray(dados) ? dados : []).forEach((item) => {
                    if (item && item.alunoId) _consistenciaAgendaPorAluno[item.alunoId] = item;
                });
            }
        } catch (_) { /* indicador de consistência é opcional */ }
    }

    window.invalidarChaveRenderAlunos();
    window.renderizarListaAlunos();
}

window.inicializarPaginaCadastro = async function(opcoes = {}) {
    const deveSincronizar = opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;
    if (deveSincronizar && typeof carregarDados === 'function') {
        await carregarDados({
            forcarRender: false,
            forcarRemoto: opcoes.sincronizar === true
        });
        window.__sincronizacaoInicialConcluida = true;
    }
    window.renderizarListaAlunos();
    window.togglePainelCadastro(false);
    carregarDadosComplementaresAlunos();
};
window.inicializarAlunos = async function() {
    await window.inicializarPaginaCadastro();
};
window.togglePainelCadastro = function(mostrar) {
    const modal = document.getElementById('modalFormAluno');
    if (!modal) return;

    if (mostrar) {
        modal.style.display = 'flex'; // Exibe o overlay centralizado
    } else {
        modal.style.display = 'none'; // Esconde o modal
        const form = document.getElementById('formNovoAluno');
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
    const listaContainer = document.getElementById('listaAlunos');

    if (!listaContainer) return;

    if (typeof alunos !== 'undefined') {
        const filtroStatus = obterFiltroStatusAlunos();
        const filtroObjetivo = obterFiltroObjetivoAlunos();

        // Dirty-check: skip the DOM write if the student list is unchanged.
        const _chaveAtual = (function () {
            try {
                return JSON.stringify(alunos)
                    + '|' + filtroStatus + '|' + filtroObjetivo
                    + '|' + JSON.stringify(_resumoFinanceiroPorAluno)
                    + '|' + JSON.stringify(_consistenciaAgendaPorAluno);
            } catch (_) { return null; }
        })();
        if (_chaveAtual !== null && _chaveAtual === _ultimaChaveRenderAlunos) return;
        _ultimaChaveRenderAlunos = _chaveAtual;

        if (alunos.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #666;">
                    <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 0.95rem;">Nenhum aluno cadastrado no momento.</p>
                </div>
            `;
            return;
        }
        const alunosFiltrados = alunos.filter((aluno) => {
            const statusAluno = normalizarStatusAlunoLocal(aluno.status);
            const objetivoAluno = normalizarObjetivoAluno(aluno.objetivo);
            const passaStatus = filtroStatus === 'todos' || filtroStatus === statusAluno;
            const passaObjetivo = filtroObjetivo === 'todos' || filtroObjetivo === objetivoAluno;
            return passaStatus && passaObjetivo;
        });

        if (alunosFiltrados.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: #8A8A8A;">
                    <i class="fa-solid fa-filter-circle-xmark" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 0.92rem;">Nenhum aluno encontrado com os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        listaContainer.innerHTML = alunosFiltrados.map(aluno => {
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

            // Indicadores do card: ciclo financeiro atual e consistência de agenda.
            // O grid abaixo comporta uma futura caixinha de "aulas a repor" sem refatoração.
            const caixinhas = [
                montarCaixinhaFinanceiraAluno(aluno, objetivo),
                montarCaixinhaConsistenciaAluno(aluno)
            ].filter(Boolean).join('');

            return `
                <div class="aluno-card aluno-card--gerenciavel" onclick="prepararEdicaoAluno('${aluno.id}')" style="display: flex; flex-direction: column; gap: 10px; position: relative; cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <strong style="display: block; color: #FFF; font-size: 1.05rem; word-break: break-word;">${aluno.nome}</strong>
                            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
                                <span class="objetivo-${objetivoClass}" style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${objetivo}</span>
                                <span style="color: #444; font-size: 0.75rem;">•</span>
                                <span style="font-size: 0.72rem; color: #AAA; font-weight: 600;">Contrato: ${freqAcordada}x/sem</span>
                            </div>
                        </div>
                        <div onclick="event.stopPropagation();" style="margin-left: auto; display: flex; justify-content: flex-end; flex-shrink: 0;">
                            <label class="status-toggle status-toggle--card" for="alunoStatusCard-${aluno.id}" style="margin: 0;">
                                <input type="checkbox" id="alunoStatusCard-${aluno.id}" ${statusAluno === 'ativo' ? 'checked' : ''} onchange="alternarStatusAluno('${aluno.id}', this.checked)" />
                                <span class="status-toggle-track" aria-hidden="true"><span class="status-toggle-knob"></span></span>
                                <span class="status-toggle-label">${statusLabel}</span>
                            </label>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 0.78rem; color: #B0B0B0; border-top: 1px solid #2A2A2A; padding-top: 8px; margin-top: 2px;">
                        <div><i class="fa-solid fa-location-dot" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${local}</div>
                        <div><i class="fa-solid fa-dollar-sign" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${metodoCobranca}: ${cobrancaDetalhe}</div>
                        <div><i class="fa-solid fa-calendar-days" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${fechamentoLabel}</div>
                    </div>

                    ${caixinhas ? `<div class="aluno-card-indicadores">${caixinhas}</div>` : ''}
                </div>
            `;
        }).join('');
    }
};
window.prepararEdicaoAluno = function(id) {
    if (typeof alunos === 'undefined') return;
    const aluno = obterAlunoPorIdView(id);
    if (!aluno) return;
    const elId = document.getElementById('alunoIdEdicao');
    const elNome = document.getElementById('alunoNome');
    const elLocal = document.getElementById('alunoLocal');
    const elPreco = document.getElementById('alunoPreco');
    const elTelefone = document.getElementById('alunoTelefone');
    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    const elFrequencia = document.getElementById('alunoFrequenciaSemanal');

    if (elId) elId.value = aluno.id;
    if (elNome) elNome.value = aluno.nome;
    if (elLocal) elLocal.value = aluno.local || '';
    if (elPreco) elPreco.value = aluno.preco || '';
    if (elTelefone) elTelefone.value = aluno.telefone || '';
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
window.deletarAlunoSPA = function(id) {
    if (confirm("Excluir remove permanentemente o cadastro e os vínculos atuais de agenda. Para preservar histórico operacional, prefira inativar. Deseja realmente excluir este aluno?")) {
        if (typeof alunos !== 'undefined') {
            const _idxDeletar = alunos.findIndex(a => a.id === id);
            if (_idxDeletar !== -1) alunos.splice(_idxDeletar, 1);
            if (typeof salvarDados === 'function') salvarDados();
            window.renderizarListaAlunos();
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
            if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
            if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
            return true;
        }
    }
    return false;
};
window.excluirAlunoViaModal = function() {
    const idEdicao = document.getElementById('alunoIdEdicao').value;
    if (!idEdicao) return;
    const excluiu = window.deletarAlunoSPA(idEdicao);
    if (excluiu) window.togglePainelCadastro(false);
};
window.alternarStatusAluno = function(id, ativoForcado) {
    if (typeof alunos === 'undefined') return;
    const index = alunos.findIndex(a => a.id === id);
    if (index === -1) return;

    const statusAtual = normalizarStatusAlunoLocal(alunos[index].status);
    const proximoStatus = typeof ativoForcado === 'boolean'
        ? (ativoForcado ? 'ativo' : 'inativo')
        : (statusAtual === 'inativo' ? 'ativo' : 'inativo');
    if (statusAtual === proximoStatus) return;

    alunos[index].status = proximoStatus;
    if (typeof salvarDados === 'function') salvarDados();
    window.renderizarListaAlunos();
    if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
    if (typeof mostrarToast === 'function') {
        mostrarToast(proximoStatus === 'inativo' ? 'Aluno inativado com sucesso.' : 'Aluno ativado com sucesso!');
    }
};
document.addEventListener('DOMContentLoaded', () => {
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

    const filtroStatus = document.getElementById('filtroAlunosStatus');
    const filtroObjetivo = document.getElementById('filtroAlunosObjetivo');
    if (filtroStatus) filtroStatus.addEventListener('change', () => window.renderizarListaAlunos());
    if (filtroObjetivo) filtroObjetivo.addEventListener('change', () => window.renderizarListaAlunos());

    const btnExcluirAlunoModal = document.getElementById('btnExcluirAlunoModal');
    if (btnExcluirAlunoModal) {
        btnExcluirAlunoModal.addEventListener('click', window.excluirAlunoViaModal);
    }

    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', (e) => {
            e.preventDefault();

            const idEdicao = document.getElementById('alunoIdEdicao').value;
            const ehConsultoriaOnline = objetivoSwitchEstaAtivo();
            const nome = document.getElementById('alunoNome').value.trim();
            const local = document.getElementById('alunoLocal').value.trim();
            const preco = ehConsultoriaOnline ? 0 : (normalizarNumeroFinanceiro(document.getElementById('alunoPreco').value) || 0);
            const telefone = document.getElementById('alunoTelefone').value.trim();
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

            if (idEdicao) {
                const index = alunos.findIndex(a => a.id === idEdicao);
                if (index !== -1) {
                    const alunoAntigo = { ...alunos[index] };

                    alunos[index].nome = nome;
                    alunos[index].local = local;
                    alunos[index].preco = preco;
                    alunos[index].telefone = telefone;
                    alunos[index].objetivo = objetivo;
                    alunos[index].corObjetivo = corObjetivo;
                    alunos[index].frequenciaSemanal = frequenciaSemanal;
                    alunos[index].status = status;
                    alunos[index].fechamentoMesCheio = fechamentoMesCheio;
                    alunos[index].diaVencimento = diaVencimento;
                    alunos[index].metodoCobranca = metodoCobranca;
                    alunos[index].valorFixoCiclo = valorFixoCiclo;

                    // [TAG-CASCADE-SYNC] Se nome ou local mudou, sincroniza agendamentos futuros
                    if (alunoAntigo.nome !== nome || alunoAntigo.local !== local) {
                        window.log.debug('[view-alunos]', 'Detectada mudança no nome ou local, acionando cascade sync...');
                        if (typeof sincronizarAgendamentosDoAluno === 'function') {
                            sincronizarAgendamentosDoAluno(idEdicao, {
                                nome: nome,
                                local: local,
                                objetivo: objetivo
                            });
                        }
                    }

                    window.log.info('[aluno]', 'Aluno editado', {
                        id: idEdicao,
                        nome: nome,
                        metodoCobranca: metodoCobranca || 'por_aula'
                    });
                    if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno atualizado com sucesso!');
                }
            } else {
                const novoAluno = {
                    id: Date.now().toString(),
                    nome: nome,
                    local: local,
                    preco: preco,
                    telefone: telefone,
                    objetivo: objetivo,
                    corObjetivo: corObjetivo,
                    frequenciaSemanal: frequenciaSemanal,
                    status: status,
                    fechamentoMesCheio: fechamentoMesCheio,
                    diaVencimento: diaVencimento,
                    metodoCobranca: metodoCobranca,
                    valorFixoCiclo: valorFixoCiclo
                };
                alunos.push(novoAluno);
                window.log.info('[aluno]', 'Aluno criado', {
                    id: novoAluno.id,
                    nome: novoAluno.nome,
                    metodoCobranca: novoAluno.metodoCobranca || 'por_aula'
                });
                if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno cadastrado com sucesso!');
            }
            if (typeof salvarDados === 'function') salvarDados();
            window.togglePainelCadastro(false); // Fecha o modal
            window.renderizarListaAlunos(); // Atualiza a lista na tela
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats(); // Atualiza contador na Home
        });
    }
});
