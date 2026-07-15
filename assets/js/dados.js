// [TAG-JS-DADOS] - Estruturas de dados e constantes (Prô Josy)
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HORARIOS = [];
for (let h = 0; h <= 23; h++) {
    HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
    HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}
let alunos = [];
let aulas = []; // { id, alunoId, dia, horarioInicio, horarioFim, tipo: 'aula'|'bloqueio'|'deslocamento', descricao }
let aulasParaRepor = [];
let agendaConfig = { horaInicio: 7, horaFim: 21 }; // Guardará os índices das horas inteiras

let telaCadastroAberta = false;
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
