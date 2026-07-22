// [TAG-VIEW-ALUNOS] view-alunos.js
// Responsabilidade: View da aba Alunos — listagem com KPIs, formulário de cadastro/edição e exclusão
// Depende de: state.js, storage.js, utils-kpi.js (calcular*), view-home.js (atualizarDashboardStats — em runtime) - Lógica de Alunos na SPA (Prô Josy)
function normalizarObjetivoAluno(valorObjetivo) {
    const objetivo = String(valorObjetivo || '').trim();
    return objetivo === 'Consultoria Online' ? 'Consultoria Online' : 'Personal Trainer';
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
    const elPreco = document.getElementById('alunoPreco');
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

    if (elPreco) {
        elPreco.disabled = ehConsultoriaOnline;
        elPreco.required = !ehConsultoriaOnline;
        if (ehConsultoriaOnline) elPreco.value = '';
        aplicarClasseCampoDesabilitado(elPreco, ehConsultoriaOnline);
    }

    if (elFrequencia) {
        elFrequencia.disabled = ehConsultoriaOnline;
        elFrequencia.required = !ehConsultoriaOnline;
        if (ehConsultoriaOnline) {
            elFrequencia.value = '';
        } else if (!elFrequencia.value) {
            elFrequencia.value = '2';
        }
        aplicarClasseCampoDesabilitado(elFrequencia, ehConsultoriaOnline);
    }
}

function montarCorObjetivoTangerina() {
    return { nome: 'Tangerina', hex: '#FF887C' };
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
    aplicarRegrasObjetivoNoFormulario();
    
    window.togglePainelCadastro(true);
};
window.renderizarListaAlunos = function() {
    const listaContainer = document.getElementById('listaAlunos');
    
    if (!listaContainer) return;

    if (typeof alunos !== 'undefined') {
        if (alunos.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #666;">
                    <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 0.95rem;">Nenhum aluno cadastrado no momento.</p>
                </div>
            `;
            return;
        }
        listaContainer.innerHTML = alunos.map(aluno => {
            const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
            const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
            const local = aluno.local || 'Não definido';
            const objetivo = aluno.objetivo || 'Personal Trainer';
            const objetivoClass = objetivo.replace(/\s+/g, '');
            
            // Calcular KPIs usando as novas funções
            const projecaoMes = calcularProjecaoMensalCompleta(aluno, aulas);
            const realizadoAteHoje = calcularProjecaoRealizadaAteHoje(aluno, aulas);
            const projecaoAproximada = calcularProjecaoAproximada(aluno);
            const aulasFaltam = calcularAulasFaltamAgendar(aluno, aulas);
            const reposicoes = contarReposicoesPorAluno(aluno.id, aulas);
            
            return `
                <div class="aluno-card" style="display: flex; flex-direction: column; gap: 10px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <strong style="display: block; color: #FFF; font-size: 1.05rem; word-break: break-word;">${aluno.nome}</strong>
                            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
                                <span class="objetivo-${objetivoClass}" style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${objetivo}</span>
                                <span style="color: #444; font-size: 0.75rem;">•</span>
                                <span style="font-size: 0.72rem; color: #AAA; font-weight: 600;">Contrato: ${freqAcordada}x/sem</span>
                                <span style="font-size: 0.72rem; color: #81C784; font-weight: 600;">~R$ ${projecaoAproximada.toFixed(2)}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; flex-shrink: 0;">
                            <button class="btn btn-secondary btn-sm" onclick="prepararEdicaoAluno('${aluno.id}')" style="padding: 6px 10px; background: #333;" title="Editar Aluno">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deletarAlunoSPA('${aluno.id}')" style="padding: 6px 10px;" title="Excluir Aluno">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 0.78rem; color: #B0B0B0; border-top: 1px solid #2A2A2A; padding-top: 8px; margin-top: 2px;">
                        <div><i class="fa-solid fa-location-dot" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${local}</div>
                        <div><i class="fa-solid fa-dollar-sign" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> R$ ${preco.toFixed(2)} / hora</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 8px;">
                        <div style="background: rgba(129, 199, 132, 0.12); border: 1px solid rgba(129, 199, 132, 0.25); border-radius: 6px; padding: 6px 8px; text-align: center;">
                            <div style="font-size: 0.65rem; color: #81C784; font-weight: 700;">💰 PROJEÇÃO</div>
                            <div style="font-size: 0.7rem; color: #A5D6A7; margin-top: 3px;">
                                <div style="font-weight: 600;">R$ ${projecaoMes.toFixed(2)}</div>
                                <div style="font-size: 0.55rem; color: #AAA; margin-top: 1px;">Mês inteiro</div>
                            </div>
                            <div style="font-size: 0.7rem; color: #B0B0B0; margin-top: 4px; border-top: 1px solid rgba(129, 199, 132, 0.2); padding-top: 3px;">
                                <div style="font-weight: 600;">R$ ${realizadoAteHoje.toFixed(2)}</div>
                                <div style="font-size: 0.55rem; color: #888;">Realizado</div>
                            </div>
                        </div>
                        
                        <div style="background: rgba(255, 152, 0, 0.12); border: 1px solid rgba(255, 152, 0, 0.25); border-radius: 6px; padding: 6px 8px; text-align: center;">
                            <div style="font-size: 0.65rem; color: #FF9800; font-weight: 700;">📅 FALTAM</div>
                            <div style="font-size: 1.4rem; color: #FFB74D; font-weight: 700; margin-top: 4px;">${aulasFaltam}</div>
                            <div style="font-size: 0.6rem; color: #AAA; margin-top: 2px;">aula(s) / sem</div>
                        </div>
                        
                        <div style="background: rgba(100, 181, 246, 0.12); border: 1px solid rgba(100, 181, 246, 0.25); border-radius: 6px; padding: 6px 8px; text-align: center;">
                            <div style="font-size: 0.65rem; color: #64B5F6; font-weight: 700;">🔄 REPOSIÇÃO</div>
                            <div style="font-size: 1.4rem; color: #90CAF9; font-weight: 700; margin-top: 4px;">${reposicoes}</div>
                            <div style="font-size: 0.6rem; color: #AAA; margin-top: 2px;">devida(s)</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};
window.prepararEdicaoAluno = function(id) {
    if (typeof alunos === 'undefined') return;
    const aluno = alunos.find(a => a.id === id);
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
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    if (titulo) titulo.textContent = 'Editar Aluno';
    if (botao) botao.textContent = 'Atualizar';
    aplicarRegrasObjetivoNoFormulario();
    window.togglePainelCadastro(true);
};
window.deletarAlunoSPA = function(id) {
    if (confirm("Tem certeza que deseja remover este aluno? Suas aulas futuras não serão mais associadas a ele.")) {
        if (typeof alunos !== 'undefined') {
            const _idxDeletar = alunos.findIndex(a => a.id === id);
            if (_idxDeletar !== -1) alunos.splice(_idxDeletar, 1);
            if (typeof salvarDados === 'function') salvarDados();
            window.renderizarListaAlunos();
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
            if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
        }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const elObjetivoSwitch = document.getElementById('alunoObjetivoSwitch');
    if (elObjetivoSwitch) {
        elObjetivoSwitch.addEventListener('change', aplicarRegrasObjetivoNoFormulario);
    }
    aplicarRegrasObjetivoNoFormulario();

    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const idEdicao = document.getElementById('alunoIdEdicao').value;
            const ehConsultoriaOnline = objetivoSwitchEstaAtivo();
            const nome = document.getElementById('alunoNome').value.trim();
            const local = document.getElementById('alunoLocal').value.trim();
            const preco = ehConsultoriaOnline ? 0 : (parseFloat(document.getElementById('alunoPreco').value) || 0);
            const telefone = document.getElementById('alunoTelefone').value.trim();
            const objetivo = obterObjetivoAlunoDoSwitch();
            const corObjetivo = montarCorObjetivoTangerina();
            const frequenciaSemanal = ehConsultoriaOnline
                ? 0
                : (parseInt(document.getElementById('alunoFrequenciaSemanal').value, 10) || 2);

            if (typeof alunos === 'undefined') return;

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
                    
                    // [TAG-CASCADE-SYNC] Se nome ou local mudou, sincroniza agendamentos futuros
                    if (alunoAntigo.nome !== nome || alunoAntigo.local !== local) {
                        console.log('[view-alunos] Detectada mudança no nome ou local, acionando cascade sync...');
                        if (typeof sincronizarAgendamentosDoAluno === 'function') {
                            sincronizarAgendamentosDoAluno(idEdicao, {
                                nome: nome,
                                local: local,
                                objetivo: objetivo
                            });
                        }
                    }
                    
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
                    frequenciaSemanal: frequenciaSemanal
                };
                alunos.push(novoAluno);
                if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno cadastrado com sucesso!');
            }
            if (typeof salvarDados === 'function') salvarDados();
            window.togglePainelCadastro(false); // Fecha o modal
            window.renderizarListaAlunos(); // Atualiza a lista na tela
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats(); // Atualiza contador na Home
        });
    }
});
