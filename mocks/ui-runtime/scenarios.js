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
  // ───────────────────────────────────────────────────────────────────────────
  // CENÁRIO DEMONSTRATIVO — Cartão C da Etapa 4 (densidade de cards), 2026-09-27
  // Desenha o "antes/depois" do fix dos seletores #agendaGridHomeHome:
  // na mesma linha de horário, um card de 30min TIGHT ao lado de um de 60min
  // NORMAL — a diferença visível SÓ existe porque o CSS de densidade voltou a
  // casar com o id real da grade de Dia.
  // Legenda (Home → aba "Dia": o app pousa no dia atual, domingo 27/09/2026):
  //   08:30 "Aurora Helena de Camargo Monzani" (33 chars) + local longo,
  //         30min → TIGHT: padding 6px 8px, hora oculta, linha do objetivo
  //         removida — só nome + local cabem nos 48px.
  //   09:00 "Bruna Rocha" (nome curto) + local curto, 60min → NORMAL:
  //         padding base (9px 12px 10px 10px) — o contraste com o card
  //         de cima é o que o fix devolveu.
  //   10:00 "Deslocamento" + descrição longa, 30min → TIGHT (variação de
  //         tipo: badge inline no título, descrição de localização oculta).
  //   12:00 "Reunião de equipe" (bloqueio Google Agenda), 90min → NORMAL
  //         (controle: card alto e largo segue com layout cheio).
  //   14:00 "Bruna Rocha" AULA RECORRENTE (semanal de domingo, início
  //         2026-09-20), 60min → NORMAL: chip dourado ∞ ao lado do
  //         📌 verde da aula única das 09:00 — a comparação de cor do
  //         Cartão D (refinamento 2026-09-27).
  // Os textos longos (33/25 chars) e as durações de 30min são o gatilho da
  // heurística de densidade (REGRAS_VISUAIS_CARD_DIA em view-home.js).
  // Obs.: os itens são `uma_vez` de data 2026-09-27 (data atual na abertura do
  // cenário) — abrem com o selo de concluída à medida que o dia avança, como
  // no dia real. Em outra data a grade fica vazia; navegue com os botões de
  // dia anterior/próximo para voltar ao 27/09.
  // ───────────────────────────────────────────────────────────────────────────
  densidadeAgenda: {
    name: 'densidadeAgenda',
    label: 'Densidade de cards — demonstração do Cartão C',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: { horaInicio: '07:00', horaFim: '22:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'], limiteAlunosAtivos: 10 },
    alunos: [
      { id: 'd1', nome: 'Aurora Helena de Camargo Monzani', email: 'aurora.monzani@example.com', telefone: '(11) 90555-0001', local: 'Estúdio Central — Sala 02 A', objetivo: 'Recuperação', status: 'ativo', diaVencimento: 12, fechamentoMesCheio: false, metodoCobranca: 'por_aula', preco: 60, frequenciaSemanal: 1, valorFixoCiclo: 0, observacoes: 'Exemplo para demonstrar a densidade tight em card de 30min com nome e local longos.', corObjetivo: { nome: 'Cinza-azulado', hex: '#34c2eb' } },
      { id: 'd2', nome: 'Bruna Rocha', email: 'bruna.rocha@example.com', telefone: '(11) 90555-0002', local: 'Estúdio Central', objetivo: 'Força', status: 'ativo', diaVencimento: 15, fechamentoMesCheio: false, metodoCobranca: 'por_aula', preco: 60, frequenciaSemanal: 2, valorFixoCiclo: 0, observacoes: 'Contraste: card 60min com nome curto fica em densidade normal.', corObjetivo: { nome: 'Laranja', hex: '#ffb74d' } }
    ],
    agendamentos: [
      { id: 'dg1', alunoId: 'd1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '08:30', horarioFim: '09:00', descricao: 'Avaliação pós-cirúrgica' },
      { id: 'dg2', alunoId: 'd1', tipo: 'deslocamento', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '10:00', horarioFim: '10:30', descricao: 'Estúdio Norte — Consultório 2B' },
      { id: 'dg3', alunoId: 'd2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '09:00', horarioFim: '10:00', descricao: 'Treino resistido' },
      { id: 'dg4', alunoId: 'd2', tipo: 'aula', frequencia: 'semanal', tipoRecorrencia: 'semanal', recorrenciaDataInicio: '2026-09-20', diasSemana: ['Domingo'], intervaloRecorrencia: 1, recorrenciaEscopo: 'fromDate', data: '2026-09-20', horarioInicio: '14:00', horarioFim: '15:00', descricao: 'Treino resistido' }
    ],
    bloqueiosExternos: [
      { id: 'gcal_demo', googleCalendarEventId: 'gcal-demo-1234', titulo: 'Reunião de equipe', data: '2026-09-27', horarioInicio: '12:00', horarioFim: '13:30', fullDay: false }
    ],
    reposicoes: [],
    financas: [
      { alunoId: 'd1', aluno: { id: 'd1', nome: 'Aurora Helena de Camargo Monzani' }, configuracaoPendente: false, cicloAtual: { _id: 'cd1', alunoId: 'd1', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'pago', metodoCobranca: 'por_aula', aulasContadas: 2, aulasManuaisExtras: 0, valorTotalCiclo: 120, extrato: [] }, historicoDisponivel: true },
      { alunoId: 'd2', aluno: { id: 'd2', nome: 'Bruna Rocha' }, configuracaoPendente: false, cicloAtual: { _id: 'cd2', alunoId: 'd2', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'em_aberto', metodoCobranca: 'por_aula', aulasContadas: 1, aulasManuaisExtras: 0, valorTotalCiclo: 60, extrato: [] }, historicoDisponivel: true }
    ],
    consistenciaAgenda: [
      { alunoId: 'd1', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
      { alunoId: 'd2', aulasSemanaisContrato: 2, aulasFaltamAgendar: 0 }
    ],
    homeSummary: { proximoCompromisso: '2026-09-27 08:30', totalAtivos: 2, totalPendentes: 0, totalSemana: 4 }
  },
  // ───────────────────────────────────────────────────────────────────────────
  // CENÁRIO DEMONSTRATIVO — Etapa 5 (eventos simultâneos na agenda diária), 2026-09-27
  // Objetivo: dar 2/3/4 eventos sobrepostos na MESMA data para a Home (aba Dia)
  // renderizar o motor de colunas (calcularColisoes) em cada nível de
  // simultaneidade. Como a criação/edição no app bloqueia sobreposição de
  // aulas entre si (scheduling-serializer → validarConflitos), os eventos
  // sobrepostos aqui simulam as duas fontes que NÃO passam por esse gate:
  //   (1) aulas reais entre si — caso hipotético (migrado de outro perfil,
  //       seed antigo, ou mudança futura de regra de negócio);
  //   (2) evento externo do Google Calendar em cima de aula (gcalExternal) —
  //       é o caso REAL: o sync grava BloqueioExterno sem checar conflito
  //       (gcalSyncService.upsertBloqueio).
  // Legenda (Home → aba Dia, domingo 27/09/2026, data atual na abertura):
  //   FAIXA 2 COLUNAS (sobreposição de 60min):
  //     s2a  08:00-09:00 aula (Aurora Helena de Camargo Monzani, nome 33ch)
  //     s2b  08:30-09:30 aula (Bruna Rocha)
  //   FAIXA 3 COLUNAS (todos os 3 se cortam):
  //     s3a  10:00-11:00 aula (Aurora Helena...)
  //     s3b  10:15-11:15 bloqueio interno ("Descanso da equipe técnica")
  //     s3c  10:30-11:30 aula (Bruna Rocha)
  //   FAIXA 4 COLUNAS (todos os 4 se cortam):
  //     s4a        12:00-13:00 aula (Aurora Helena...)
  //     gcal_ext5  12:15-13:15 externo GCal ("Reunião de coordenação")
  //     s4b        12:30-13:30 aula (Bruna Rocha)
  //     s4c        12:45-13:45 deslocamento
  //   INÍCIOS IGUAIS (fallback em colunas, NÃO cascata — valida a regra
  //     de banda com par no mesmo minuto, que a cascata esconderia):
  //     s5a  14:00-15:00 aula (Aurora Helena...)
  //     s5b  14:00-15:00 bloqueio interno ("Ajuste de agenda — recepção")
  // Nota de modelo: dois eventos que apenas se TOCAM na borda (08:00/08:30)
  // NÃO são conflito (a regra usa inicio < fim) — por isso a sobreposição
  // interna foi desenhada com início deslocado de 15-30min.
  // Os nomes/descrições são os "dados extremos" da auditoria (7.2):
  // 33 e 12 chars de nome, 27 chars de descrição de deslocamento.
  // ───────────────────────────────────────────────────────────────────────────
  agendaSimultaneos: {
    name: 'agendaSimultaneos',
    label: 'Eventos simultâneos — demonstração da Etapa 5',
    ownerEmail: 'mock@local.test',
    profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
    configuracao: { horaInicio: '07:00', horaFim: '15:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'], limiteAlunosAtivos: 10 },
    alunos: [
      { id: 'e1', nome: 'Aurora Helena de Camargo Monzani', email: 'aurora.monzani@example.com', telefone: '(11) 90555-0011', local: 'Estúdio Central — Sala 02 A', objetivo: 'Recuperação', status: 'ativo', diaVencimento: 12, fechamentoMesCheio: false, metodoCobranca: 'por_aula', preco: 60, frequenciaSemanal: 1, valorFixoCiclo: 0, observacoes: 'Nome de 33 chars, usado nas colunas comprimidas.', corObjetivo: { nome: 'Cinza-azulado', hex: '#34c2eb' } },
      { id: 'e2', nome: 'Bruna Rocha', email: 'bruna.rocha@example.com', telefone: '(11) 90555-0012', local: 'Estúdio Central', objetivo: 'Força', status: 'ativo', diaVencimento: 15, fechamentoMesCheio: false, metodoCobranca: 'por_aula', preco: 60, frequenciaSemanal: 2, valorFixoCiclo: 0, observacoes: 'Nome curto, contraste dentro da coluna.', corObjetivo: { nome: 'Laranja', hex: '#ffb74d' } }
    ],
    agendamentos: [
      // Par (2 colunas): sobreposição em 08:30-09:00
      { id: 's2a', alunoId: 'e1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '08:00', horarioFim: '09:00', descricao: 'Avaliação motora' },
      { id: 's2b', alunoId: 'e2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '08:30', horarioFim: '09:30', descricao: 'Treino resistido' },
      // Tríade (3 colunas): sobreposição de 3 em 10:30-11:00
      { id: 's3a', alunoId: 'e1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '10:00', horarioFim: '11:00', descricao: 'Avaliação motora' },
      { id: 's3b', tipo: 'bloqueio', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '10:15', horarioFim: '11:15', descricao: 'Descanso da equipe técnica' },
      { id: 's3c', alunoId: 'e2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '10:30', horarioFim: '11:30', descricao: 'Treino resistido' },
      // Quadrúpla (4 colunas): sobreposição de 4 em 12:45-13:00 — inclui o externo GCal
      { id: 's4a', alunoId: 'e1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '12:00', horarioFim: '13:00', descricao: 'Avaliação motora' },
      { id: 's4b', alunoId: 'e2', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '12:30', horarioFim: '13:30', descricao: 'Treino resistido' },
      { id: 's4c', tipo: 'deslocamento', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '12:45', horarioFim: '13:45', descricao: 'Estúdio Norte — Consultório 2B' },
      // Inícios iguais (14:00/14:00): valida o fallback em colunas — a
      // cascata esconderia a linha do nome do card de trás quando dois
      // eventos começam no mesmo minuto (o motor de colunas é o caminho
      // que se preserva nesse caso).
      { id: 's5a', alunoId: 'e1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '14:00', horarioFim: '15:00', descricao: 'Avaliação motora' },
      { id: 's5b', tipo: 'bloqueio', frequencia: 'uma_vez', data: '2026-09-27', horarioInicio: '14:00', horarioFim: '15:00', descricao: 'Ajuste de agenda — recepção' }
    ],
    bloqueiosExternos: [
      { id: 'gcal_ext5', googleCalendarEventId: 'gcal-ext-5555', titulo: 'Reunião de coordenação', data: '2026-09-27', horarioInicio: '12:15', horarioFim: '13:15', fullDay: false }
    ],
    reposicoes: [],
    financas: [
      { alunoId: 'e1', aluno: { id: 'e1', nome: 'Aurora Helena de Camargo Monzani' }, configuracaoPendente: false, cicloAtual: { _id: 'ce1', alunoId: 'e1', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'pago', metodoCobranca: 'por_aula', aulasContadas: 1, aulasManuaisExtras: 0, valorTotalCiclo: 60, extrato: [] }, historicoDisponivel: true },
      { alunoId: 'e2', aluno: { id: 'e2', nome: 'Bruna Rocha' }, configuracaoPendente: false, cicloAtual: { _id: 'ce2', alunoId: 'e2', cicloInicio: '2026-09-01', cicloFim: '2026-09-30', status: 'em_aberto', metodoCobranca: 'por_aula', aulasContadas: 1, aulasManuaisExtras: 0, valorTotalCiclo: 60, extrato: [] }, historicoDisponivel: true }
    ],
    consistenciaAgenda: [
      { alunoId: 'e1', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
      { alunoId: 'e2', aulasSemanaisContrato: 2, aulasFaltamAgendar: 1 }
    ],
    homeSummary: { proximoCompromisso: '2026-09-27 08:00', totalAtivos: 2, totalPendentes: 0, totalSemana: 8 }
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
  // ───────────────────────────────────────────────────────────────────────────
  // CENÁRIO DE AUDITORIA — Etapa 7 (consistência e acessibilidade), 2026-10-01
  // Reúne num só lugar os estados que a Etapa 7 precisa auditar:
  //   v1 Helena Prado — ciclo ATRASADO + reposição PENDENTE A VENCER (≤5 dias)
  //                     → amarelo de alerta em contextos diferentes (4.13)
  //   v2 Rafael Lima  — ciclo PAGO → "Marcar como pago"/"Editar ajuste"
  //                     desabilitados em Finanças (4.17.4)
  //   v3 Sofia Alves  — aluno INATIVO com aula hoje → modal em modo somente
  //                     leitura (#editAvisoAlunoInativo) (4.17.1)
  //   v4 Diego Souza  — Consultoria Online → campos do form do aluno
  //                     desabilitados (4.17.4)
  //   v5 Marina Reis  — configuração financeira pendente
  // As datas são RELATIVAS a hoje (este cenário não "vence" como os pinados em
  // 2026-09-27): os compromissos caem no dia atual para aparecerem na Home.
  // ───────────────────────────────────────────────────────────────────────────
  vitrineEstados: (function () {
    function iso(deslocamentoDias) {
      const d = new Date();
      d.setDate(d.getDate() + deslocamentoDias);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const hoje = iso(0);
    const ontem = iso(-1);
    return {
      name: 'vitrineEstados',
      label: 'Etapa 7 — vitrine de estados (amarelo, disabled, modo leitura)',
      ownerEmail: 'mock@local.test',
      profile: { name: 'Mock User', email: 'mock@local.test', picture: '' },
      configuracao: { horaInicio: '07:00', horaFim: '21:00', diasTrabalho: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'], limiteAlunosAtivos: 40 },
      alunos: [
        { id: 'v1', nome: 'Helena Prado', email: 'helena@example.com', telefone: '(11) 90777-0001', local: 'Studio Centro', preco: 60, frequenciaSemanal: 2, objetivo: 'Hipertrofia', status: 'ativo', diaVencimento: 2, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Ciclo atrasado e reposição a vencer — vitrine do amarelo.', corObjetivo: { nome: 'Tangerina', hex: '#ff8a5b' } },
        { id: 'v2', nome: 'Rafael Lima', email: 'rafael@example.com', telefone: '(11) 90777-0002', local: 'Online', preco: 0, frequenciaSemanal: 1, objetivo: 'Emagrecimento', status: 'ativo', diaVencimento: 12, fechamentoMesCheio: true, metodoCobranca: 'valor_fixo', valorFixoCiclo: 200, observacoes: 'Ciclo pago — botões desabilitados em Finanças.', corObjetivo: { nome: 'Azul', hex: '#64b5f6' } },
        { id: 'v3', nome: 'Sofia Alves', email: 'sofia@example.com', telefone: '(11) 90777-0003', local: 'Parque Municipal', preco: 55, frequenciaSemanal: 1, objetivo: 'Resistência', status: 'inativo', diaVencimento: 18, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Inativa com aula hoje — dispara o modo somente leitura.', corObjetivo: { nome: 'Rosa', hex: '#ec407a' } },
        { id: 'v4', nome: 'Diego Souza', email: 'diego@example.com', telefone: '(11) 90777-0004', local: 'Online', preco: 0, frequenciaSemanal: 1, objetivo: 'Consultoria Online', status: 'ativo', diaVencimento: null, fechamentoMesCheio: false, metodoCobranca: 'valor_fixo', valorFixoCiclo: 150, observacoes: 'Consultoria online — campos do cadastro desabilitados.', corObjetivo: { nome: 'Verde', hex: '#4caf50' } },
        { id: 'v5', nome: 'Marina Reis', email: 'marina@example.com', telefone: '(11) 90777-0005', local: 'Studio Norte', preco: 50, frequenciaSemanal: 2, objetivo: 'Mobilidade', status: 'ativo', diaVencimento: null, fechamentoMesCheio: false, metodoCobranca: 'por_aula', valorFixoCiclo: 0, observacoes: 'Configuração financeira pendente.', corObjetivo: { nome: 'Roxo', hex: '#ab47bc' } }
      ],
      agendamentos: [
        { id: 'vg1', alunoId: 'v1', tipo: 'aula', frequencia: 'uma_vez', data: hoje, horarioInicio: '08:00', horarioFim: '09:00', descricao: 'Treino resistido' },
        { id: 'vg2', alunoId: 'v3', tipo: 'aula', frequencia: 'uma_vez', data: hoje, horarioInicio: '10:00', horarioFim: '11:00', descricao: 'Aula de aluna inativa' },
        { id: 'vg3', alunoId: 'v2', tipo: 'aula', frequencia: 'uma_vez', data: hoje, horarioInicio: '18:00', horarioFim: '19:00', descricao: 'Treino online' },
        { id: 'vg4', alunoId: 'v1', tipo: 'aula', frequencia: 'uma_vez', data: ontem, horarioInicio: '09:00', horarioFim: '10:00', descricao: 'Aula que virou reposição' }
      ],
      bloqueiosExternos: [
        { id: 'gcal_v', googleCalendarEventId: 'gcal-mock-v', titulo: 'Compromisso pessoal', data: hoje, horarioInicio: '12:00', horarioFim: '13:00', fullDay: false }
      ],
      reposicoes: [
        { id: 'vr1', alunoId: 'v1', dataOriginal: ontem, horarioOriginal: '09:00', status: 'pendente', cobravel: true, validoAte: iso(2) },
        { id: 'vr2', alunoId: 'v1', dataOriginal: iso(-12), horarioOriginal: '08:00', status: 'expirada', cobravel: false, validoAte: iso(-5) },
        { id: 'vr3', alunoId: 'v1', dataOriginal: iso(-3), horarioOriginal: '18:00', status: 'agendada', cobravel: false, validoAte: iso(4), agendamentoReposicaoId: 'vg1' }
      ],
      financas: [
        { alunoId: 'v1', aluno: { id: 'v1', nome: 'Helena Prado' }, configuracaoPendente: false, cicloAtual: { _id: 'cv1', alunoId: 'v1', cicloInicio: iso(-30), cicloFim: hoje, status: 'atrasado', metodoCobranca: 'por_aula', aulasContadas: 5, aulasManuaisExtras: 0, valorTotalCiclo: 300, extrato: [] }, historicoDisponivel: true },
        { alunoId: 'v2', aluno: { id: 'v2', nome: 'Rafael Lima' }, configuracaoPendente: false, cicloAtual: { _id: 'cv2', alunoId: 'v2', cicloInicio: iso(-30), cicloFim: hoje, status: 'pago', dataPagamento: iso(-2), metodoCobranca: 'valor_fixo', aulasContadas: 0, aulasManuaisExtras: 0, valorTotalCiclo: 200, extrato: [] }, historicoDisponivel: true },
        { alunoId: 'v3', aluno: { id: 'v3', nome: 'Sofia Alves' }, configuracaoPendente: false, cicloAtual: { _id: 'cv3', alunoId: 'v3', cicloInicio: iso(-30), cicloFim: hoje, status: 'em_aberto', metodoCobranca: 'por_aula', aulasContadas: 1, aulasManuaisExtras: 0, valorTotalCiclo: 55, extrato: [] }, historicoDisponivel: true },
        { alunoId: 'v4', aluno: { id: 'v4', nome: 'Diego Souza' }, configuracaoPendente: false, cicloAtual: { _id: 'cv4', alunoId: 'v4', cicloInicio: iso(-30), cicloFim: hoje, status: 'em_aberto', metodoCobranca: 'valor_fixo', aulasContadas: 0, aulasManuaisExtras: 0, valorTotalCiclo: 150, extrato: [] }, historicoDisponivel: true },
        { alunoId: 'v5', aluno: { id: 'v5', nome: 'Marina Reis' }, configuracaoPendente: true, cicloAtual: null, historicoDisponivel: false }
      ],
      consistenciaAgenda: [
        { alunoId: 'v1', aulasSemanaisContrato: 2, aulasFaltamAgendar: 1 },
        { alunoId: 'v2', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
        { alunoId: 'v3', aulasSemanaisContrato: 1, aulasFaltamAgendar: 0 },
        { alunoId: 'v4', aulasSemanaisContrato: 1, aulasFaltamAgendar: 1 },
        { alunoId: 'v5', aulasSemanaisContrato: 2, aulasFaltamAgendar: 2 }
      ],
      homeSummary: { proximoCompromisso: hoje + ' 08:00', totalAtivos: 4, totalPendentes: 1, totalSemana: 3 }
    };
  })(),
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

// ───────────────────────────────────────────────────────────────────────────
// CENÁRIOS DERIVADOS (clones do `default`, ajustados por flag) — 2026-10-01
// ───────────────────────────────────────────────────────────────────────────

// Carregamento lento — atrasa toda resposta /api/* em 4s para ver skeleton e o
// toast de progresso (>3s) sem throttle do browser. Também aceita
// `?mockLatencia=<ms>` em qualquer cenário.
window.__UI_MOCK_SCENARIOS.carregamentoLento = Object.assign({}, window.__UI_MOCK_SCENARIOS.default, {
  name: 'carregamentoLento',
  label: 'Carregamento lento — skeleton e progresso',
  latenciaMs: 4000
});

// Usuário desconectado — o mock responde como sessão ausente (sem ownerEmail nem
// perfil), para auditar a área de sessão (4.17.4) e o estado sem login.
window.__UI_MOCK_SCENARIOS.desconectado = Object.assign({}, window.__UI_MOCK_SCENARIOS.default, {
  name: 'desconectado',
  label: 'Usuário desconectado (sem sessão)',
  signedIn: false
});

window.__UI_MOCK_SCENARIO_NAMES = Object.keys(window.__UI_MOCK_SCENARIOS);
