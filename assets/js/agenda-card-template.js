// [TAG-AGENDA-CARD-TEMPLATE] agenda-card-template.js
// Responsabilidade: Renderização compartilhada do card de agendamento padrão da agenda
// Depende de: alunos-helpers.js (window.getAluno), widget-bloqueio.js (window.ehBloqueioDiaInteiroCompromisso)
// Expõe: window.criarCardAgendamento(comp, opcoes)

(function() {
    const AULA_COR_FALLBACK = '#6B7280';

    // Chips de status de AULA (Etapa 4, Cartão D — refinamento 2026-09-27):
// caixas fixas de 20x20px definidas no CSS (.agenda-card-inline-status
// .badge-tag-tipo); aqui só a cor por tipo. Visual clean: FUNDOS translúcidos
// sem borda (decisão do dono — "só o fundo, sem a borda"), como o Cartão D
// original. Reposição usa a classe .badge-tag-tipo--reposicao (dourada
// tracejada, design pré-existente). Deslocamento/Bloqueio/Google não têm chip:
// o ícone do tipo já abre o título do card (carro/cadeado/G) — "só em AULA".
const BADGE_STYLES = {
    recorrente: 'background: rgba(255, 215, 0, 0.18); color: #FFD700; font-weight: 700;',
    unico: 'background: rgba(129, 199, 132, 0.18); color: #81C784; font-weight: 700;'
};

    function normalizarHex(valorHex) {
        if (typeof valorHex !== 'string') {
            return null;
        }

        const valorLimpo = valorHex.trim();
        if (!valorLimpo) {
            return null;
        }

        if (/^#([0-9a-fA-F]{3})$/.test(valorLimpo)) {
            return `#${valorLimpo[1]}${valorLimpo[1]}${valorLimpo[2]}${valorLimpo[2]}${valorLimpo[3]}${valorLimpo[3]}`.toUpperCase();
        }

        if (/^#([0-9a-fA-F]{6})$/.test(valorLimpo)) {
            return valorLimpo.toUpperCase();
        }

        return null;
    }

    function resolverCorObjetivoAula(aluno) {
        const corObjetivoHex = aluno && aluno.corObjetivo ? aluno.corObjetivo.hex : null;
        return normalizarHex(corObjetivoHex) || AULA_COR_FALLBACK;
    }

    function montarStyleComposto(estilos) {
        if (!Array.isArray(estilos)) {
            return '';
        }

        const partes = estilos
            .map(estilo => (typeof estilo === 'string' ? estilo.trim() : ''))
            .filter(Boolean);

        return partes.join(' ');
    }

    function normalizarObjetivo(objetivo) {
        return String(objetivo || 'Outro').replace(/\s/g, '');
    }

    function converterHorarioParaMinutos(horario) {
        if (typeof horario !== 'string' || horario.indexOf(':') === -1) {
            return null;
        }

        const [hora, minuto] = horario.split(':').map(Number);
        if (Number.isNaN(hora) || Number.isNaN(minuto)) {
            return null;
        }

        return (hora * 60) + minuto;
    }

    function resolverCompromissoConcluido(comp, opcoes) {
        if (typeof opcoes.compromissoConcluido === 'boolean') {
            return opcoes.compromissoConcluido;
        }

        if (!(opcoes.dataReferencia instanceof Date) || Number.isNaN(opcoes.dataReferencia.getTime())) {
            return false;
        }

        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const dataReferencia = new Date(
            opcoes.dataReferencia.getFullYear(),
            opcoes.dataReferencia.getMonth(),
            opcoes.dataReferencia.getDate()
        );

        if (dataReferencia < hoje) {
            return true;
        }

        if (dataReferencia.getTime() !== hoje.getTime()) {
            return false;
        }

        const minutosFim = converterHorarioParaMinutos(comp.horarioFim);
        if (minutosFim === null) {
            return false;
        }

        const minutosAgora = (agora.getHours() * 60) + agora.getMinutes();
        return minutosFim < minutosAgora;
    }

    function resolverPeriodo(comp, opcoes, bloqueioDiaInteiro) {
        if (typeof opcoes.periodo === 'string' && opcoes.periodo.trim()) {
            return opcoes.periodo;
        }

        if (bloqueioDiaInteiro) {
            return 'Dia inteiro';
        }

        return `${comp.horarioInicio} - ${comp.horarioFim}`;
    }

    function montarAtributo(nome, valor) {
        return valor ? ` ${nome}="${valor}"` : '';
    }

    // Cartão D (refinamento): chip de status tem âncora única — sempre na
    // linha do título, na posição do wrapper. Antes o chip alternava entre a
    // linha do título e a meta inferior conforme densidade ("modo inline"),
    // o que desalinhava os ícones entre cards de tamanhos diferentes.
    function montarSlotBadgeInline(badgeHtml) {
        return badgeHtml ? `<span class="agenda-card-inline-status">${badgeHtml}</span>` : '';
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.criarCardAgendamento = function(comp, opcoes = {}) {
        if (!comp) {
            return '';
        }

        const tipo = comp.tipo || 'aula';
        const bloqueioDiaInteiro = typeof opcoes.bloqueioDiaInteiro === 'boolean'
            ? opcoes.bloqueioDiaInteiro
            : (typeof window.ehBloqueioDiaInteiroCompromisso === 'function' && tipo === 'bloqueio'
                ? window.ehBloqueioDiaInteiroCompromisso(comp)
                : false);
        const periodo = resolverPeriodo(comp, opcoes, bloqueioDiaInteiro);
        const compromissoConcluido = resolverCompromissoConcluido(comp, opcoes);
        const iconePeriodo = compromissoConcluido ? 'fa-solid fa-check' : 'fa-regular fa-clock';
        const classeTempoConcluido = compromissoConcluido ? ' agenda-semana-card-time--completed' : '';
        const classes = ['agenda-dia-aula', 'agenda-semana-card'];
        const visualContext = opcoes.visualContext === 'calendar-day' ? 'calendar-day' : '';
        // Etapa 5 (2026-09-27, achado 4.12 — formato final, decisão do dono):
        // na visão Dia, banda de 2 simultâneos vira formato OUTLOOK
        // (classe .formato-outlook: só o título no card; a hora se lê pela
        // posição na timeline); banda de 3+ vira uma LINHA dentro do
        // contêiner de banda (classe .formato-linha: hora de início +
        // título + status). Sem banda: formato padrão do dia (o tempo já
        // fica oculto como antes — timeline faz o trabalho).
        const layoutBanda =
            visualContext === 'calendar-day' &&
            (opcoes.layoutBanda === 'outlook' || opcoes.layoutBanda === 'linha')
                ? opcoes.layoutBanda
                : '';
        // Linha de banda: hora COMPRIMIDA (só início) — a identificação que
        // faltava entre eventos iguais no nome dentro da mesma banda.
        // Bloqueio dia inteiro: o texto "Dia inteiro" já é curto e "00:00"
        // seria informação enganosa — mantém o período cheio.
        const periodoExibir =
            layoutBanda === 'linha' && !bloqueioDiaInteiro && Number.isInteger(opcoes.horaBandaMinutos)
                ? `${String(Math.floor(opcoes.horaBandaMinutos / 60)).padStart(2, '0')}:${String(opcoes.horaBandaMinutos % 60).padStart(2, '0')}`
                : periodo;
        const periodoExibirSeguro = escapeHtml(periodoExibir);
        const visualDensity = ['normal', 'compact', 'tight'].includes(opcoes.visualDensity)
            ? opcoes.visualDensity
            : 'normal';
        const visualHideOptionalMobile = visualContext === 'calendar-day' && opcoes.visualHideOptionalMobile === true;

        if (visualContext === 'calendar-day') {
            classes.push('agenda-card-dayview');
            if (visualDensity !== 'normal') {
                classes.push(`agenda-card-density-${visualDensity}`);
            }
            if (visualHideOptionalMobile) {
                classes.push('agenda-card-mobile-overflow');
            }
            if (layoutBanda) {
                classes.push(layoutBanda === 'outlook' ? 'formato-outlook' : 'formato-linha');
            }
        }

        if (opcoes.extraClass) {
            classes.push(opcoes.extraClass);
        }
        if (compromissoConcluido) {
            classes.push('agenda-semana-card--completed');
        }

        if (tipo === 'aula') {
            const aluno = typeof window.getAluno === 'function' ? window.getAluno(comp.alunoId) : null;
            const alunoInativo = typeof window.alunoEstaAtivo === 'function' ? !window.alunoEstaAtivo(aluno) : false;
            const nome = aluno ? aluno.nome : '❓ Aluno Removido';
            const objetivo = aluno ? (aluno.objective || aluno.objetivo || 'Outro') : 'Outro';
            const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';
            const nomeSeguro = escapeHtml(nome);
            const objetivoSeguro = escapeHtml(objetivo);
            const localSeguro = escapeHtml(local);
            const corBordaAula = resolverCorObjetivoAula(aluno);
            const styleCardAula = montarStyleComposto([
                `border-left-color: ${corBordaAula};`,
                alunoInativo ? 'opacity: 0.9;' : '',
                opcoes.style || ''
            ]);
            let tagVisualHtml = '';
            let tagStatusHtml = '';

            classes.push(`objetivo-${normalizarObjetivo(objetivo)}`);

            if (comp.reagendada || comp.isReposicao) {
                // Cartão D (Etapa 4, 2026-09-27): badges viram só-ícone com
                // title/aria-label preservando o texto (decisão do dono, D-1).
                tagStatusHtml = `<span class="badge-tag-tipo badge-tag-tipo--reposicao agenda-card-optional agenda-card-status-badge" role="img" aria-label="Reposição" title="Reposição"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></span>`;
            } else if (comp.frequencia === 'semanal') {
                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" role="img" aria-label="Recorrente" title="Recorrente" style="${BADGE_STYLES.recorrente}"><i class="fa-solid fa-infinity" aria-hidden="true"></i></span>`;
            } else {
                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" role="img" aria-label="Único" title="Único" style="${BADGE_STYLES.unico}"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></span>`;
            }
            tagVisualHtml = '';
            if (alunoInativo) {
                tagVisualHtml += `<span class="badge-tag-tipo agenda-card-optional" role="img" aria-label="Aluno inativo" title="Aluno inativo" style="background: rgba(255, 138, 128, 0.15); color: #FF8A80; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-user-slash" aria-hidden="true"></i></span>`;
            }
            // Semana (sem visualContext): o chip de aula fica no rodapé (meta,
            // canto inferior direito por margin-left:auto da
            // .agenda-card-inline-status) — no Dia o mesmo wrapper fica
            // oculto aqui e visível só na linha do título (regra do
            // #agendaGridHomeHome). O wrapper garante o mesmo visual 20x20.
            const tagStatusRodapeHtml = visualContext ? '' : montarSlotBadgeInline(tagStatusHtml);

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', styleCardAula)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i><span class="agenda-dia-aula-nome-texto">${nomeSeguro}</span></span>
                                ${montarSlotBadgeInline(tagStatusHtml)}
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoExibirSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${localSeguro}</span>
                            <div class="agenda-semana-card-meta">
                                ${objetivo === 'Consultoria Online' ? `<span class="agenda-dia-aula-detalhes">${objetivoSeguro}</span>` : ''}
                                ${tagVisualHtml}
                                ${tagStatusRodapeHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tipo === 'deslocamento') {
            classes.push('slot-deslocamento');
            // Cartão D (refinamento): sem chip — o carro + a cor do card já
            // identificam o tipo; a descrição de destino é o conteúdo útil.
            const descricaoDeslocamento = escapeHtml(comp.descricao || 'Trânsito');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome" style="color: #51b749;"><i class="fa-solid fa-car-side"></i><span class="agenda-dia-aula-nome-texto">Deslocamento</span></span>
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoExibirSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${descricaoDeslocamento}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tipo === 'bloqueio') {
            // [TAG-GCAL-CARD-EXTERNO] Eventos externos do Google Calendar: card somente leitura, sem onclick
            if (comp.source === 'google_external') {
                classes.push('slot-bloqueado', 'card-bloqueio-externo');
                // Cartão D (refinamento): sem chip — o "G" azul no título +
                // a cor do card já identificam a origem Google.
                const descricaoExterna = String(comp.descricao || 'Evento externo');
                const descricaoExternaSafe = escapeHtml(descricaoExterna);
                const tituloExterno = descricaoExternaSafe;
                return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)} title="${tituloExterno}">
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome card-bloqueio-externo-nome"><i class="fa-brands fa-google" style="color: #4285F4;"></i><span class="agenda-dia-aula-nome-texto">${descricaoExternaSafe}</span></span>
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoExibirSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #ff5c54;">Bloqueado</span>
                        </div>
                    </div>
                </div>
            `;
            }

            classes.push('slot-bloqueado');
            const descricaoBloqueioInterno = escapeHtml(comp.descricao || 'Compromisso');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome agenda-dia-bloqueio-descricao" style="color: #DDD;"><i class="fa-solid fa-lock"></i><span class="agenda-dia-bloqueio-descricao-text">${descricaoBloqueioInterno}</span></span>
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoExibirSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #ff5c54;">${bloqueioDiaInteiro ? 'Dia bloqueado' : 'Bloqueado'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    };
})();
