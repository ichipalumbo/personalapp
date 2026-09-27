// Etapa 6i — Ponto 1: criação de aula em `modal-agendamento.js`.
// Carrega o script real via `vm` e mocka apenas as dependências externas.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function criarElemento(id) {
  return {
    id,
    value: '',
    checked: false,
    required: false,
    innerHTML: '',
    textContent: '',
    disabled: false,
    dataset: {},
    listeners: {},
    atributos: {},
    style: { display: '', color: '', visibility: '' },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute(nome, valor) {
      this.atributos[nome] = String(valor);
    },
    getAttribute(nome) {
      return Object.prototype.hasOwnProperty.call(this.atributos, nome) ? this.atributos[nome] : null;
    },
    removeAttribute(nome) {
      delete this.atributos[nome];
    },
    addEventListener(evento, fn) {
      this.listeners[evento] = fn;
    },
    removeEventListener(evento) {
      delete this.listeners[evento];
    },
    reset() {},
    focus() {},
    cloneNode() {
      return criarElemento(`${id}-clone`);
    },
    querySelectorAll() {
      return [];
    },
    parentNode: {
      replaceChild() {},
    },
  };
}

function carregarHarnessModalAgendamento({ aulas = [], alunos = [{ id: 'aluno-1', nome: 'Aluno Teste', ativo: true }] } = {}) {
  const elementos = new Map();
  const document = {
    listeners: {},
    getElementById(id) {
      if (!elementos.has(id)) elementos.set(id, criarElemento(id));
      return elementos.get(id);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(evento, fn) {
      this.listeners[evento] = fn;
    },
    removeEventListener(evento) {
      delete this.listeners[evento];
    },
    activeElement: null,
  };

  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout,
    document,
    alert: () => {},
    confirm: () => true,
    aulas,
    alunos,
    HORARIOS: Array.from({ length: 48 }, (_, index) => {
      const horas = Math.floor(index / 2);
      const minutos = index % 2 === 0 ? 0 : 30;
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }),
    log: { info() {}, warn() {}, debug() {}, error() {}, grupo() {} },
    mostrarToast: () => {},
    salvarDados: async () => ({ ok: true, motivo: 'sucesso' }),
    inicializarHome: () => {},
    gcal: { isSignedIn: () => false },
    dataSelecionada: new Date('2026-08-31T12:00:00'),
    getDiaTextoSelecionado: () => 'Segunda',
    getDataSelecionadaPtBr: () => '31/08/2026',
    getNomesDiasSemana: () => ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    formatarDataPtBr: (iso) => String(iso || '').split('-').reverse().join('/'),
    formatarDataLocalParaISODate: (valor) => {
      if (valor instanceof Date) {
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
      }
      if (typeof valor === 'string' && valor.includes('/')) return valor.split('/').reverse().join('-');
      return valor || '';
    },
    converterPtBrParaISO: (valor) => (valor && valor.includes('/') ? valor.split('/').reverse().join('-') : valor),
    somarMinutos: (inicio, minutos) => {
      const [hora, minuto] = String(inicio).split(':').map(Number);
      const total = hora * 60 + minuto + Number(minutos);
      return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    },
    getAluno: (id) => alunos.find((a) => a.id === id) || null,
    alunoEstaAtivo: (aluno) => Boolean(aluno && aluno.ativo !== false),
    getAlunosAtivos: () => alunos,
    getConflitosNoDia: () => [],
    getDatasConflitoRecorrencia: () => [],
    getConflitosRecorrenciaEmDatas: () => [],
    gerarResumoConflitosDatas: () => '',
    sincronizarSteppersDuracao: () => {},
    aplicarLimitesDuracaoPorContexto: () => {},
    atualizarEstadoBloqueioDiaInteiroAgenda: () => {},
    BLOQUEIO_DIA_INTEIRO_INICIO: '00:00',
    BLOQUEIO_DIA_INTEIRO_FIM: '23:59',
    BLOQUEIO_DIA_INTEIRO_DURACAO: 1439,
    BLOQUEIO_MAX_MINUTOS: 480,
    DURACAO_MAX_AULA_DESLOCAMENTO: 120,
  };

  context.window = context;
  context.globalThis = context;

  const carregar = (relativo) => {
    const scriptPath = path.resolve(__dirname, relativo);
    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptPath });
  };

  carregar('../shared/reposicao-flow-helpers.js');
  carregar('../../assets/js/features/modals/scheduling-flow-state.js');
  carregar('../../assets/js/features/modals/scheduling-serializer.js');
  carregar('../../assets/js/modal-agendamento.js');

  if (typeof document.listeners.DOMContentLoaded === 'function') {
    document.listeners.DOMContentLoaded();
  }

  return { context, document, elementos };
}

function prepararCriacaoDeAula({ resultadoPersistencia, comGCal = true }) {
  const aulas = [];
  const { context, document } = carregarHarnessModalAgendamento({ aulas });
  const toasts = [];
  const reaberturas = [];

  context.window.mostrarToast = (...args) => {
    toasts.push(args);
  };

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');

  document.getElementById('agendaAluno').value = 'aluno-1';
  document.getElementById('agendaHoraInicio').value = '09:00';
  document.getElementById('agendaDuracao').value = '60';

  const abrirOriginal = context.window.abrirAgendamentoModal;
  context.window.abrirAgendamentoModal = (dia, hora, tipo) => {
    reaberturas.push({ dia, hora, tipo });
    abrirOriginal(dia, hora, tipo);
  };

  if (comGCal) {
    context.window.gcal = { isSignedIn: () => true };
    context.window.salvarEventoComGCal = async () => resultadoPersistencia;
  } else {
    context.window.gcal = { isSignedIn: () => false };
    context.window.salvarDados = async () => resultadoPersistencia;
  }

  return { context, document, aulas, toasts, reaberturas };
}

test('Ponto 1 — criação de aula com gravação bem-sucedida mantém a aula e não reabre o formulário', async () => {
  const { context, document, aulas, toasts, reaberturas } = prepararCriacaoDeAula({
    resultadoPersistencia: { ok: true, motivo: 'sucesso' },
  });

  await document.getElementById('formAgendamento').listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 1, 'a aula criada precisa continuar no array');
  assert.equal(aulas[0].alunoId, 'aluno-1');
  assert.equal(reaberturas.length, 0, 'o formulário não pode reabrir em caso de sucesso');
  assert.equal(toasts.filter(([, tipo]) => tipo === 'error').length, 0);
  assert.equal(context.document.getElementById('modalAgendamento').style.display, 'none');
});

test('fechar agendamento pelo botão remove o modal do DialogController', () => {
  const { context, document } = carregarHarnessModalAgendamento();
  const fechamentos = [];
  const modal = document.getElementById('modalAgendamento');

  context.window.DialogController = {
    open(alvo) {
      alvo.style.display = 'flex';
    },
    close(alvo) {
      fechamentos.push(alvo.id);
      alvo.style.display = 'none';
    },
  };

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
  document.getElementById('btnFecharModal').listeners.click();

  assert.deepEqual(fechamentos, ['modalAgendamento']);
  assert.equal(modal.style.display, 'none');
});

test('fechar recorrência pelo DialogController desbloqueia o modal de agendamento', () => {
  const { context, document } = carregarHarnessModalAgendamento();
  const criarClassList = () => {
    const classes = new Set();
    return {
      add: (nome) => classes.add(nome),
      remove: (nome) => classes.delete(nome),
      toggle() {},
      contains: (nome) => classes.has(nome),
    };
  };
  const principal = document.getElementById('modalAgendamento');
  const recorrencia = document.getElementById('modalRecorrencia');
  principal.classList = criarClassList();
  recorrencia.classList = criarClassList();
  context.window.formatarDataPtBrLegivel = (valor) => String(valor || '');

  context.window.DialogController = {
    open(alvo) {
      alvo.style.display = 'flex';
    },
    close(alvo) {
      alvo.style.display = 'none';
    },
  };

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
  context.window.abrirModalRecorrencia('Segunda', '09:00');
  assert.equal(principal.classList.contains('modal-underlay-blocked'), true);

  context.window.fecharModalRecorrencia();

  assert.equal(principal.classList.contains('modal-underlay-blocked'), false);
  assert.equal(principal.getAttribute('aria-hidden'), null);
  assert.equal(recorrencia.classList.contains('modal-overlay-secondary'), false);
});

test('cancelar agendamento sem alteração fecha sem pedir confirmação', () => {
  const { context, document } = carregarHarnessModalAgendamento();
  const confirmacoes = [];
  context.window.confirm = (mensagem) => {
    confirmacoes.push(mensagem);
    return false;
  };
  context.window.DialogController = {
    open(alvo) {
      alvo.style.display = 'flex';
    },
    close(alvo) {
      alvo.style.display = 'none';
    },
  };

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
  document.getElementById('btnFecharModal').listeners.click();

  assert.equal(confirmacoes.length, 0);
  assert.equal(document.getElementById('modalAgendamento').style.display, 'none');
});

test('cancelar agendamento alterado pede confirmação e respeita a resposta', () => {
  const { context, document } = carregarHarnessModalAgendamento();
  let resposta = false;
  const confirmacoes = [];
  context.window.confirm = (mensagem) => {
    confirmacoes.push(mensagem);
    return resposta;
  };
  context.window.DialogController = {
    open(alvo) {
      alvo.style.display = 'flex';
    },
    close(alvo) {
      alvo.style.display = 'none';
    },
  };
  const modal = document.getElementById('modalAgendamento');

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
  document.getElementById('agendaAluno').value = 'aluno-1';

  document.getElementById('btnFecharModal').listeners.click();
  assert.equal(confirmacoes.length, 1);
  assert.equal(modal.style.display, 'flex', 'recusar a confirmação mantém o formulário aberto');

  resposta = true;
  document.getElementById('btnFecharModal').listeners.click();
  assert.equal(confirmacoes.length, 2);
  assert.equal(modal.style.display, 'none');
});

test('clique no fundo da recorrência não fecha o modal', () => {
  const { context, document } = carregarHarnessModalAgendamento();
  const recorrencia = document.getElementById('modalRecorrencia');
  context.window.formatarDataPtBrLegivel = (valor) => String(valor || '');
  context.window.DialogController = {
    open(alvo) {
      alvo.style.display = 'flex';
    },
    close(alvo) {
      alvo.style.display = 'none';
    },
  };

  context.window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
  context.window.abrirModalRecorrencia('Segunda', '09:00');
  const cliqueFundo = recorrencia.listeners.mousedown;
  if (typeof cliqueFundo === 'function') cliqueFundo({ target: recorrencia });

  assert.equal(recorrencia.style.display, 'flex');
});

test('Ponto 1 — falha na gravação remove a aula, avisa e reabre o formulário preenchido', async () => {
  const { document, aulas, toasts, reaberturas } = prepararCriacaoDeAula({
    resultadoPersistencia: { ok: false, motivo: 'falha_remota' },
  });

  await document.getElementById('formAgendamento').listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 0, 'a aula criada precisa sair do array');
  assert.ok(toasts.some(([mensagem, tipo]) => tipo === 'error' && String(mensagem).toLowerCase().includes('falha')));
  assert.equal(reaberturas.length, 1, 'o formulário precisa reabrir');
  assert.deepEqual(reaberturas[0], { dia: 'Segunda', hora: '09:00', tipo: 'aula' });
  assert.equal(document.getElementById('agendaAluno').value, 'aluno-1', 'o aluno escolhido precisa voltar preenchido');
  assert.equal(document.getElementById('agendaHoraInicio').value, '09:00');
  assert.equal(document.getElementById('agendaDuracao').value, '60');
});

test('Ponto 1 — falha na gravação sem Google Agenda conectada também reverte, avisa e reabre', async () => {
  const { document, aulas, toasts, reaberturas } = prepararCriacaoDeAula({
    resultadoPersistencia: { ok: false, motivo: 'sessao_expirada' },
    comGCal: false,
  });

  await document.getElementById('formAgendamento').listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 0);
  assert.ok(toasts.some(([mensagem, tipo]) => tipo === 'error' && String(mensagem).includes('Sessão expirada')));
  assert.equal(reaberturas.length, 1);
});
