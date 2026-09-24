window.__UI_MOCK_SCENARIOS = {
  default: {
    name: 'default',
    label: 'Dashboard completo',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: {
      horaInicio: '07:00',
      horaFim: '21:00',
      diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex'],
      limiteAlunosAtivos: 40
    },
    alunos: [
      {
        id: 'a1',
        nome: 'Maria Silva',
        email: 'maria@example.com',
        telefone: '(11) 99999-1111',
        local: 'Studio Centro',
        preco: 50,
        frequenciaSemanal: 3,
        objetivo: 'Hipertrofia',
        status: 'ativo',
        diaVencimento: 10,
        fechamentoMesCheio: false,
        metodoCobranca: 'por_aula',
        valorFixoCiclo: 0,
        observacoes: 'Aluna com histórico de atraso recente.',
        corObjetivo: { nome: 'Tangerina', hex: '#ff8a5b' }
      },
      {
        id: 'a2',
        nome: 'João Pereira',
        email: 'joao@example.com',
        telefone: '(11) 98888-2222',
        local: 'Online',
        preco: 0,
        frequenciaSemanal: 1,
        objetivo: 'Emagrecimento',
        status: 'ativo',
        diaVencimento: 15,
        fechamentoMesCheio: true,
        metodoCobranca: 'valor_fixo',
        valorFixoCiclo: 180,
        observacoes: 'Treino online e acompanhamento por WhatsApp.',
        corObjetivo: { nome: 'Azul', hex: '#64b5f6' }
      },
      {
        id: 'a3',
        nome: 'Ana Costa',
        email: 'ana@example.com',
        telefone: '(11) 97777-3333',
        local: 'Studio Centro',
        preco: 50,
        frequenciaSemanal: 2,
        objetivo: 'Resistência',
        status: 'inativo',
        diaVencimento: 20,
        fechamentoMesCheio: true,
        metodoCobranca: 'por_aula',
        valorFixoCiclo: 0,
        observacoes: 'Sem treinos agendados este mês.',
        corObjetivo: { nome: 'Verde', hex: '#4caf50' }
      },
      {
        id: 'a4',
        nome: 'Carlos Mendes',
        email: 'carlos@example.com',
        telefone: '(11) 96666-4444',
        local: 'Parque Municipal',
        preco: 60,
        frequenciaSemanal: 1,
        objetivo: 'Performance',
        status: 'ativo',
        diaVencimento: null,
        fechamentoMesCheio: false,
        metodoCobranca: 'por_aula',
        valorFixoCiclo: 0,
        observacoes: 'Novo cadastro aguardando configuração financeira.',
        corObjetivo: { nome: 'Roxo', hex: '#ab47bc' }
      }
    ],
    agendamentos: [
      { id: 'ag1', alunoId: 'a1', tipo: 'aula', frequencia: 'semanal', tipoRecorrencia: 'semanal', recorrenciaDataInicio: '2026-09-24', diasSemana: ['Quinta'], intervaloRecorrencia: 1, recorrenciaEscopo: 'fromDate', data: '2026-09-24', horarioInicio: '08:00', horarioFim: '09:00', descricao: 'Treino resistido' },
      { id: 'ag2', alunoId: 'a1', tipo: 'aula', frequencia: 'semanal', tipoRecorrencia: 'semanal', recorrenciaDataInicio: '2026-09-26', diasSemana: ['Sábado'], intervaloRecorrencia: 1, recorrenciaEscopo: 'fromDate', data: '2026-09-26', horarioInicio: '18:00', horarioFim: '19:00', descricao: 'Treino funcional' },
      { id: 'ag3', alunoId: 'a2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-25', horarioInicio: '19:00', horarioFim: '20:00', descricao: 'Consulta inicial' },
      { id: 'ag4', alunoId: 'a3', tipo: 'aula', frequencia: 'semanal', tipoRecorrencia: 'semanal', recorrenciaDataInicio: '2026-09-27', diasSemana: ['Domingo'], intervaloRecorrencia: 1, recorrenciaEscopo: 'fromDate', data: '2026-09-27', horarioInicio: '07:00', horarioFim: '08:00', descricao: 'Rotina de mobilidade' },
      { id: 'ag5', alunoId: 'a4', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-26', horarioInicio: '10:00', horarioFim: '11:00', descricao: 'Avaliação de performance' }
      ,{ id: 'ag6', alunoId: 'a2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-26', horarioInicio: '17:00', horarioFim: '18:00', descricao: 'Reposição de consulta', isReposicao: true, reposicaoId: 'r2' }
      ,{ id: 'ag7', alunoId: 'a1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-23', horarioInicio: '17:00', horarioFim: '18:00', descricao: 'Reposição concluída', isReposicao: true, reposicaoId: 'r3' }
    ],
    bloqueiosExternos: [
      { id: 'gcal1', googleCalendarEventId: 'gcal-mock-1', titulo: 'Reunião com fornecedor', data: '2026-09-24', horarioInicio: '12:00', horarioFim: '13:00', fullDay: false },
      { id: 'gcal2', googleCalendarEventId: 'gcal-mock-2', titulo: 'Compromisso pessoal', data: '2026-09-25', horarioInicio: '14:00', horarioFim: '16:00', fullDay: false }
    ],
    reposicoes: [
      {
        id: 'r1',
        alunoId: 'a1',
        dataOriginal: '2026-09-20',
        horarioOriginal: '09:00',
        status: 'pendente',
        cobravel: true,
        validoAte: '2026-09-27'
      },
      {
        id: 'r2',
        alunoId: 'a2',
        dataOriginal: '2026-09-18',
        horarioOriginal: '20:00',
        status: 'agendada',
        cobravel: false,
        validoAte: '2026-09-25',
        agendamentoReposicaoId: 'ag6'
      },
      {
        id: 'r3',
        alunoId: 'a1',
        dataOriginal: '2026-09-16',
        horarioOriginal: '08:00',
        status: 'realizada',
        cobravel: true,
        validoAte: '2026-09-23',
        agendamentoReposicaoId: 'ag7'
      }
    ],
    financas: [
      {
        alunoId: 'a1',
        aluno: { id: 'a1', nome: 'Maria Silva' },
        configuracaoPendente: false,
        cicloAtual: {
          _id: 'c1',
          alunoId: 'a1',
          cicloInicio: '2026-09-01',
          cicloFim: '2026-09-30',
          status: 'atrasado',
          metodoCobranca: 'por_aula',
          aulasContadas: 4,
          aulasManuaisExtras: 1,
          valorTotalCiclo: 220,
          extrato: [
            { tipo: 'recorrente', descricao: 'Aula recorrente', quantidade: 4, valorTotal: 200 },
            { tipo: 'ajuste_manual', descricao: 'Ajuste manual', quantidade: 1, valorTotal: 20 }
          ]
        },
        historicoDisponivel: true
      },
      {
        alunoId: 'a2',
        aluno: { id: 'a2', nome: 'João Pereira' },
        configuracaoPendente: false,
        cicloAtual: {
          _id: 'c2',
          alunoId: 'a2',
          cicloInicio: '2026-09-01',
          cicloFim: '2026-09-30',
          status: 'em_aberto',
          metodoCobranca: 'valor_fixo',
          aulasContadas: 0,
          aulasManuaisExtras: 0,
          valorTotalCiclo: 180,
          extrato: []
        },
        historicoDisponivel: true
      },
      {
        alunoId: 'a3',
        aluno: { id: 'a3', nome: 'Ana Costa' },
        configuracaoPendente: false,
        cicloAtual: {
          _id: 'c3',
          alunoId: 'a3',
          cicloInicio: '2026-09-01',
          cicloFim: '2026-09-30',
          status: 'pago',
          dataPagamento: '2026-09-05',
          metodoCobranca: 'por_aula',
          aulasContadas: 6,
          aulasManuaisExtras: 0,
          valorTotalCiclo: 300,
          extrato: [
            { tipo: 'recorrente', descricao: 'Aulas de mobilidade', quantidade: 6, valorTotal: 300 }
          ]
        },
        historicoDisponivel: true
      },
      {
        alunoId: 'a4',
        aluno: { id: 'a4', nome: 'Carlos Mendes' },
        configuracaoPendente: true,
        cicloAtual: null,
        historicoDisponivel: false
      }
    ],
    consistenciaAgenda: [
      { alunoId: 'a1', aulasSemanaisContrato: 3, aulasFaltamAgendar: 1 },
      { alunoId: 'a2', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
      { alunoId: 'a3', aulasSemanaisContrato: 2, aulasFaltamAgendar: 2 },
      { alunoId: 'a4', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 }
    ],
    homeSummary: {
      proximoCompromisso: '2026-09-24 08:00',
      totalAtivos: 3,
      totalPendentes: 1,
      totalSemana: 5
    }
  },
  agendaLotada: {
    name: 'agendaLotada',
    label: 'Agenda lotada / densidade alta',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: { horaInicio: '06:00', horaFim: '22:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'], limiteAlunosAtivos: 50 },
    alunos: [
      { id: 'b1', nome: 'Aluno 01', email: 'a01@example.com', telefone: '(11) 90000-0001', objetivo: 'Força', status: 'ativo', diaVencimento: 5, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Frequência alta.', corObjetivo: { nome: 'Laranja', hex: '#ffb74d' } },
      { id: 'b2', nome: 'Aluno 02', email: 'a02@example.com', telefone: '(11) 90000-0002', objetivo: 'Cardio', status: 'ativo', diaVencimento: 6, fechamentoMesCheio: true, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Treino de resistência.', corObjetivo: { nome: 'Azul', hex: '#42a5f5' } },
      { id: 'b3', nome: 'Aluno 03', email: 'a03@example.com', telefone: '(11) 90000-0003', objetivo: 'Mobilidade', status: 'ativo', diaVencimento: 7, fechamentoMesCheio: false, metodoCobranca: 'valor_fixo', valorFixoCiclo: 250, observacoes: 'Atende em casa.', corObjetivo: { nome: 'Verde', hex: '#81c784' } }
    ],
    agendamentos: [
      { id: 'bg1', alunoId: 'b1', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '06:00', horarioFim: '07:00', descricao: 'Aula 1' },
      { id: 'bg2', alunoId: 'b1', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '07:00', horarioFim: '08:00', descricao: 'Aula 2' },
      { id: 'bg3', alunoId: 'b1', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '08:00', horarioFim: '09:00', descricao: 'Aula 3' },
      { id: 'bg4', alunoId: 'b2', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '09:00', horarioFim: '10:00', descricao: 'Aula 4' },
      { id: 'bg5', alunoId: 'b2', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '10:00', horarioFim: '11:00', descricao: 'Aula 5' },
      { id: 'bg6', alunoId: 'b2', tipo: 'aula', frequencia: 'semanal', data: '2026-09-24', horarioInicio: '18:00', horarioFim: '19:00', descricao: 'Aula 6' },
      { id: 'bg7', alunoId: 'b3', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-24', horarioInicio: '19:00', horarioFim: '20:00', descricao: 'Consulta' }
    ],
    reposicoes: [],
    financas: [
      { alunoId: 'b1', aluno: { id: 'b1', nome: 'Aluno 01' }, configuracaoPendente: false, cicloAtual: { _id: 'cb1', alunoId: 'b1', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'pago', metodoCobranca: 'por_aula', aulasContadas: 8, aulasManuaisExtras: 0, valorTotalCiclo: 400, extrato: [] }, historicoDisponivel: true },
      { alunoId: 'b2', aluno: { id: 'b2', nome: 'Aluno 02' }, configuracaoPendente: false, cicloAtual: { _id: 'cb2', alunoId: 'b2', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'em_aberto', metodoCobranca: 'por_aula', aulasContadas: 5, aulasManuaisExtras: 1, valorTotalCiclo: 310, extrato: [] }, historicoDisponivel: true },
      { alunoId: 'b3', aluno: { id: 'b3', nome: 'Aluno 03' }, configuracaoPendente: false, cicloAtual: { _id: 'cb3', alunoId: 'b3', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'pago', metodoCobranca: 'valor_fixo', aulasContadas: 0, aulasManuaisExtras: 0, valorTotalCiclo: 250, extrato: [] }, historicoDisponivel: true }
    ],
    consistenciaAgenda: [
      { alunoId: 'b1', aulasSemanaisContrato: 5, aulasFaltamAgendar: 0 },
      { alunoId: 'b2', aulasSemanaisContrato: 4, aulasFaltamAgendar: 0 },
      { alunoId: 'b3', aulasSemanaisContrato: 2, aulasFaltamAgendar: 0 }
    ],
    homeSummary: { proximoCompromisso: '2026-09-24 06:00', totalAtivos: 3, totalPendentes: 1, totalSemana: 7 }
  },
  alunosEmAtraso: {
    name: 'alunosEmAtraso',
    label: 'Alunos com atraso e alertas',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: { horaInicio: '07:00', horaFim: '21:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex'], limiteAlunosAtivos: 30 },
    alunos: [
      { id: 'c1', nome: 'Julia Nogueira', email: 'julia@example.com', telefone: '(11) 90111-1111', objetivo: 'Definição', status: 'ativo', diaVencimento: 2, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Atraso recorrente no ciclo.', corObjetivo: { nome: 'Rosa', hex: '#ec407a' } },
      { id: 'c2', nome: 'Pedro Santos', email: 'pedro@example.com', telefone: '(11) 90222-2222', objetivo: 'Hipertrofia', status: 'ativo', diaVencimento: 5, fechamentoMesCheio: true, metodoCobranca: 'valor_fixo', valorFixoCiclo: 220, observacoes: 'Contratou pacote trimestral.', corObjetivo: { nome: 'Azul', hex: '#26c6da' } },
      { id: 'c3', nome: 'Renata Gomes', email: 'renata@example.com', telefone: '(11) 90333-3333', objetivo: 'Mobilidade', status: 'inativo', diaVencimento: 10, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Sem aulas recentes.', corObjetivo: { nome: 'Verde', hex: '#9ccc65' } }
    ],
    agendamentos: [
      { id: 'cg1', alunoId: 'c1', tipo: 'aula', frequencia: 'semanal', data: '2026-09-25', horarioInicio: '10:00', horarioFim: '11:00', descricao: 'Aula de força' },
      { id: 'cg2', alunoId: 'c2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '18:00', horarioFim: '19:00', descricao: 'Avaliação' }
    ],
    reposicoes: [
      { id: 'rr1', alunoId: 'c1', dataOriginal: '2026-09-15', horarioOriginal: '09:00', status: 'pendente', cobravel: true, validoAte: '2026-09-26' }
    ],
    financas: [
      { alunoId: 'c1', aluno: { id: 'c1', nome: 'Julia Nogueira' }, configuracaoPendente: false, cicloAtual: { _id: 'cc1', alunoId: 'c1', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'atrasado', metodoCobranca: 'por_aula', aulasContadas: 2, aulasManuaisExtras: 0, valorTotalCiclo: 120, extrato: [] }, historicoDisponivel: true },
      { alunoId: 'c2', aluno: { id: 'c2', nome: 'Pedro Santos' }, configuracaoPendente: false, cicloAtual: { _id: 'cc2', alunoId: 'c2', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'em_aberto', metodoCobranca: 'valor_fixo', aulasContadas: 0, aulasManuaisExtras: 0, valorTotalCiclo: 220, extrato: [] }, historicoDisponivel: true }
    ],
    consistenciaAgenda: [
      { alunoId: 'c1', aulasSemanaisContrato: 2, aulasFaltamAgendar: 1 },
      { alunoId: 'c2', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
      { alunoId: 'c3', aulasSemanaisContrato: 0, aulasFaltamAgendar: 0 }
    ],
    homeSummary: { proximoCompromisso: '2026-09-25 10:00', totalAtivos: 2, totalPendentes: 1, totalSemana: 2 }
  },
  vazio: {
    name: 'vazio',
    label: 'Estado vazio / sem dados',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: { horaInicio: '07:00', horaFim: '21:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex'], limiteAlunosAtivos: 10 },
    alunos: [],
    agendamentos: [],
    reposicoes: [],
    financas: [],
    consistenciaAgenda: [],
    homeSummary: { proximoCompromisso: null, totalAtivos: 0, totalPendentes: 0, totalSemana: 0 }
  }
};

window.__UI_MOCK_SCENARIO_NAMES = Object.keys(window.__UI_MOCK_SCENARIOS);
