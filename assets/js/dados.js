// ========================================================
// [JS-DADOS] - Estruturas de dados e constantes
// ========================================================

// Constantes
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const HORARIOS = [];
for (let h = 6; h <= 20; h++) {
    HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}

// Estado global da aplicação
let alunos = [];
let aulas = []; // { id, alunoId, dia, horarioInicio, horarioFim }
let telaCadastroAberta = false;

// Estado do calendário mensal
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
