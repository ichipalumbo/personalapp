# ADR 0001: Mutações Otimistas e Fronteiras de Persistência na Interface

> **Status**: Aceito  
> **Data**: 2026-10-26  
> **Decisores**: Luccas (dono) e assistente  
> **Contexto da Decisão**: Rodada `/grill-with-docs` sobre responsividade geral e interface otimista

---

## 1. Contexto e Problema

O aplicativo do Personal Josy operava com um padrão misto e por vezes pessimista nas ações de escrita:
- Ao criar um agendamento ou inativar um aluno, a interface frequentemente fechava o modal ou desabilitava o controle, mas o elemento na grade ou lista só era efetivamente renderizado após a conclusão da chamada de rede com o backend e, no caso da agenda, com o Google Calendar.
- Esse intervalo criava um "vale de espera" perceptível de 1 a 3 segundos (especialmente em conexões móveis ou com a latência de roundtrip da API externa do Google), reduzindo a sensação de fluidez e reatividade do aplicativo.

O objetivo do usuário é tornar a interface **o mais otimista possível**, garantindo reatividade imediata no uso diário do personal trainer.

---

## 2. Decisão

Adotamos a seguinte arquitetura de interface e persistência:

1. **Renderização Otimista Imediata para Agenda e Alunos**:
   - As ações de criação, edição e exclusão de agendamentos (aulas avulsas, séries, bloqueios e reposições) e alterações de cadastro e status de alunos atualizam o estado local em memória e disparam a re-renderização visual do DOM imediatamente (<100 ms).
   - O usuário não aguarda a conclusão do I/O de rede para ver a alteração refletida na grade ou lista.
2. **Exceção Estrita: Finanças com Confirmação Pessimista**:
   - Operações financeiras (registro de pagamento via `PATCH` e edição de ajustes de ciclo em `view-financas.js`) **não adotam mutação otimista**.
   - Permanecem sujeitas à regra durável da seção 6.1 de `docs/specs/financas-ciclo-cobranca.md` e à seção 5 de `.github/copilot-instructions.md`: confirmação exclusivamente após resposta HTTP de sucesso (200/204). O botão exibe estado "Salvando..." desabilitado durante o voo da requisição.
3. **Rollback com Componentes de Feedback Existentes**:
   - Se a persistência assíncrona falhar (erro de rede, token expirado, falha na API), o estado anterior é restaurado na memória e na tela instantaneamente.
   - O aviso de erro utiliza os Toasts já homologados no sistema com a ação `Tentar novamente`, evitando a proliferação desnecessária de novas mensagens ou componentes flutuantes.
4. **Resiliência contra Falhas Parciais do Google Calendar**:
   - Se a gravação no banco de dados (MongoDB) for bem-sucedida, mas o envio à API do Google Calendar falhar (gerando `gcalSyncFailed: true`), o evento **não é revertido** da grade local.
   - O sistema mantém o item visível e dispara o toast de aviso existente (`'Salvo, mas a Google Agenda não foi atualizada'`), registrando a pendência de sincronização.

---

## 3. Consequências e Trade-offs

### Positivas
- **Percepção de Velocidade Instantânea**: O aplicativo responde a toques e submissões com resposta visual imediata no smartphone do personal trainer, eliminando a sensação de latência de rede.
- **Isolamento de Risco Contábil**: O congelamento estrito de pagamentos impede que erros transitórios de rede façam uma cobrança parecer liquidada quando não foi registrada no banco de dados.
- **Reuso de Infraestrutura**: Zero adição de novas bibliotecas ou novos padrões de feedback; reaproveitamento do componente de Toast unificado e do `contextoDados`.

### Negativas / Riscos Aceitos
- **Flash de Reversão**: Em caso de falha de conexão no exato momento da gravação, o usuário verá o card ser adicionado e, em seguida, revertido com o toast de erro. O dono confirmou que este é o comportamento desejado frente ao ganho de velocidade constante do caminho feliz.

