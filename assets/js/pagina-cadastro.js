// [TAG-JS-CADASTRO] - Lógica de Alunos na SPA (Prô Josy)
window.inicializarPaginaCadastro = async function(opcoes = {}) {
    const deveSincronizar = opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;
    if (deveSincronizar && typeof carregarDados === 'function') {
        await carregarDados({ forcarRender: false });
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
        
        const idEdicao = document.getElementById('alunoIdEdicao');
        if (idEdicao) idEdicao.value = '';
    }
};
window.abrirCadastroParaNovo = function() {
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    
    if (titulo) titulo.textContent = 'Cadastrar Novo Aluno';
    if (botao) botao.textContent = 'Adicionar';
    
    window.togglePainelCadastro(true);
};
window.renderizarListaAlunos = function() {
    const listaContainer = document.getElementById('listaAlunos');
    const faturamentoEl = document.getElementById('faturamentoProjetado');
    const pendenciasEl = document.getElementById('totalPendenciasGrade');
    const cardAuditoria = document.getElementById('cardAuditoriaGrade');
    
    if (!listaContainer) return;

    if (typeof alunos !== 'undefined') {
        if (alunos.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #666;">
                    <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 0.95rem;">Nenhum aluno cadastrado no momento.</p>
                </div>
            `;
            if (faturamentoEl) faturamentoEl.textContent = 'R$ 0,00';
            if (pendenciasEl) pendenciasEl.textContent = '0';
            return;
        }

        let faturamentoAcumuladoMes = 0;
        let totalAlunosComPendencia = 0;
        listaContainer.innerHTML = alunos.map(aluno => {
            const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
            const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
            const local = aluno.local || 'Não definido';
            const telefone = aluno.telefone || 'Sem tel.';
            const receitaProjetadaAluno = preco * freqAcordada * 4;
            faturamentoAcumuladoMes += receitaProjetadaAluno;
            const aulasRecorrentesDoAluno = aulas.filter(a => a.alunoId === aluno.id && a.tipo === 'aula' && a.frequencia === 'semanal');
            let totalAgendadoSemana = 0;
            
            aulasRecorrentesDoAluno.forEach(a => {
                if (a.diasSemana && Array.isArray(a.diasSemana)) {
                    totalAgendadoSemana += a.diasSemana.length;
                } else {
                    totalAgendadoSemana += 1;
                }
            });
            let statusBadgeHtml = "";
            if (totalAgendadoSemana < freqAcordada) {
                totalAlunosComPendencia++;
                const emFalta = freqAcordada - totalAgendadoSemana;
                statusBadgeHtml = `
                    <span style="background: rgba(255, 152, 0, 0.12); color: #FF9800; font-size: 0.68rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(255, 152, 0, 0.25);">
                        <i class="fa-solid fa-triangle-exclamation"></i> Pendente: falta agendar ${emFalta}x
                    </span>
                `;
            } else if (totalAgendadoSemana === freqAcordada) {
                statusBadgeHtml = `
                    <span style="background: rgba(76, 175, 80, 0.12); color: #81C784; font-size: 0.68rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(76, 175, 80, 0.25);">
                        <i class="fa-solid fa-circle-check"></i> Grade Completa (${totalAgendadoSemana}x)
                    </span>
                `;
            } else {
                statusBadgeHtml = `
                    <span style="background: rgba(100, 181, 246, 0.12); color: #64B5F6; font-size: 0.68rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(100, 181, 246, 0.25);">
                        <i class="fa-solid fa-circle-plus"></i> Grade Extra (${totalAgendadoSemana}x / ${freqAcordada}x)
                    </span>
                `;
            }

            return `
                <div class="aluno-card" style="display: flex; flex-direction: column; gap: 10px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <strong style="display: block; color: #FFF; font-size: 1.05rem; word-break: break-word;">${aluno.nome}</strong>
                            <div style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
                                <span style="font-size: 0.72rem; color: #FFD700; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${aluno.objetivo}</span>
                                <span style="color: #444; font-size: 0.75rem;">•</span>
                                <span style="font-size: 0.72rem; color: #AAA; font-weight: 600;">Contrato: ${freqAcordada}x/sem</span>
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

                    <div style="display: flex; align-items: center; gap: 8px; background: #131313; padding: 6px 10px; border-radius: 8px; margin: 2px 0;">
                        <span style="font-size: 0.72rem; color: #888;">Grade:</span>
                        ${statusBadgeHtml}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 0.78rem; color: #B0B0B0; border-top: 1px solid #2A2A2A; padding-top: 8px; margin-top: 2px;">
                        <div><i class="fa-solid fa-location-dot" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${local}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <div><i class="fa-solid fa-dollar-sign" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> R$ ${preco.toFixed(2)} / hora</div>
                            <div style="color: #FFD700; font-weight: 700;"><i class="fa-solid fa-chart-pie"></i> Projeção: R$ ${receitaProjetadaAluno.toFixed(2)}/mês</div>
                        </div>
                        <div><i class="fa-solid fa-phone" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${telefone}</div>
                    </div>
                </div>
            `;
        }).join('');
        if (faturamentoEl) {
            faturamentoEl.innerHTML = `<span style="font-size: 0.8rem; color: #FFF; display: block; margin-bottom: 2px; font-weight: 500;">R$ ${faturamentoAcumuladoMes.toFixed(2)}</span><span style="font-size: 0.65rem; color: #AAA; display: block;">Projeção total (com base em 4 semanas)</span>`;
        }
        
        if (pendenciasEl) {
            pendenciasEl.textContent = totalAlunosComPendencia;
            if (cardAuditoria) {
                if (totalAlunosComPendencia > 0) {
                    cardAuditoria.style.borderColor = '#FF9800';
                    cardAuditoria.style.background = 'rgba(255, 152, 0, 0.04)';
                    pendenciasEl.style.color = '#FF9800';
                } else {
                    cardAuditoria.style.borderColor = '#81C784';
                    cardAuditoria.style.background = 'rgba(129, 199, 132, 0.04)';
                    pendenciasEl.style.color = '#81C784';
                }
            }
        }
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
    const elObjetivo = document.getElementById('alunoObjetivo');
    const elFrequencia = document.getElementById('alunoFrequenciaSemanal');

    if (elId) elId.value = aluno.id;
    if (elNome) elNome.value = aluno.nome;
    if (elLocal) elLocal.value = aluno.local || '';
    if (elPreco) elPreco.value = aluno.preco || '';
    if (elTelefone) elTelefone.value = aluno.telefone || '';
    if (elObjetivo) elObjetivo.value = aluno.objetivo || '';
    if (elFrequencia) elFrequencia.value = aluno.frequenciaSemanal || '2';
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    if (titulo) titulo.textContent = 'Editar Aluno';
    if (botao) botao.textContent = 'Atualizar';
    window.togglePainelCadastro(true);
};
window.deletarAlunoSPA = function(id) {
    if (confirm("Tem certeza que deseja remover este aluno? Suas aulas futuras não serão mais associadas a ele.")) {
        if (typeof alunos !== 'undefined') {
            alunos = alunos.filter(a => a.id !== id);
            if (typeof salvarDados === 'function') salvarDados();
            window.renderizarListaAlunos();
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
            if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
        }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const idEdicao = document.getElementById('alunoIdEdicao').value;
            const nome = document.getElementById('alunoNome').value.trim();
            const local = document.getElementById('alunoLocal').value.trim();
            const preco = parseFloat(document.getElementById('alunoPreco').value) || 0;
            const telefone = document.getElementById('alunoTelefone').value.trim();
            const objetivo = document.getElementById('alunoObjetivo').value;
            const frequenciaSemanal = parseInt(document.getElementById('alunoFrequenciaSemanal').value, 10) || 2;

            if (typeof alunos === 'undefined') return;

            if (idEdicao) {
                const index = alunos.findIndex(a => a.id === idEdicao);
                if (index !== -1) {
                    alunos[index].nome = nome;
                    alunos[index].local = local;
                    alunos[index].preco = preco;
                    alunos[index].telefone = telefone;
                    alunos[index].objetivo = objetivo;
                    alunos[index].frequenciaSemanal = frequenciaSemanal;
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
