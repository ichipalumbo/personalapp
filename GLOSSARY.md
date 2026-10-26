# Glossário — Modelo de Domínio e Linguagem Ubíqua

> **Finalidade**: vocabulário compartilhado e conceitos fundamentais de arquitetura e interface do Personal Josy.
> Atualizado durante as rodadas de alinhamento com o dono do projeto.

---

### Termos de Interface e Persistência

#### Mutação Otimista (Optimistic Mutation)
Aplicação imediata de uma alteração no estado local em memória (`aulas`, `alunos`, `reposicoes`) e acionamento da renderização do DOM no momento do clique ou submit (<100 ms), **antes** de qualquer confirmação ou resposta da rede (API / Google Calendar).
- *Onde se aplica*: criação, edição e exclusão de agendamentos na Agenda; ativação/inativação e cadastros básicos em Alunos.

#### Reversão com Toast (Rollback)
Restauração imediata do snapshot anterior de dados em memória e re-renderização da tela acompanhada de notificação flutuante de erro com ação `Tentar novamente`, acionada exclusivamente quando a chamada assíncrona de persistência falha (ex.: erro de rede, sessão Google expirada ou indisponibilidade da API).
- *Regra*: nunca deixa dados "fantasmas" na interface após erro remoto; reaproveita as mensagens de toast e o botão de retry já homologados no sistema.

#### Escrita Confirmada por Servidor (Pessimista)
Operação na qual a interface só fecha o modal, atualiza o DOM e conclui o fluxo após a recepção de resposta HTTP de sucesso (200/204) emitida pela API remota. Durante o voo da requisição, exibe estado transitório claro (ex.: botão "Salvando..." desabilitado).
- *Onde se aplica*: **obrigatória para o módulo de Finanças** (pagamentos e ajustes de ciclo, conforme a Seção 5 das instruções do repositório e a spec `financas-ciclo-cobranca.md`). Proibido confirmar dinheiro com base em cache local.

#### Stale-While-Revalidate (Leitura Otimista)
Padrão de carregamento onde a tela exibe imediatamente o último estado conhecido salvo no `localStorage` durante a inicialização (mitigando o cold start da API serverless na Vercel), enquanto dispara uma consulta silenciosa em segundo plano para sincronizar eventuais alterações mais recentes.

