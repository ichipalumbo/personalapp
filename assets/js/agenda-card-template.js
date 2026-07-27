// [TAG-AGENDA-CARD-TEMPLATE] agenda-card-template.js
// Responsabilidade: Renderização compartilhada do card de agendamento padrão da agenda
// Depende de: alunos-helpers.js (window.getAluno), widget-bloqueio.js (window.ehBloqueioDiaInteiroCompromisso)
// Expõe: window.criarCardAgendamento(comp, opcoes)

(function() {
    const AULA_COR_FALLBACK = '#6B7280';

    const BADGE_STYLES = {
        recorrente: 'background: rgba(255, 215, 0, 0.15); color: #FFD700; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        unico: 'background: rgba(129, 199, 132, 0.15); color: #81C784; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        deslocamento: 'background: rgba(81, 183, 73, 0.15); color: #51b749; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        bloqueio: 'background: rgba(220, 33, 39, 0.15); color: #dc2127; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        googleAgenda: 'background: rgba(66, 133, 244, 0.15); color: #4285F4; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;'
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

    function distribuirBadgeStatusPorModo(badgeHtml, exibirInline) {
        return {
            inline: exibirInline ? badgeHtml : '',
            meta: exibirInline ? '' : badgeHtml,
        };
    }

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
        const periodoSeguro = escapeHtml(periodo);
        const compromissoConcluido = resolverCompromissoConcluido(comp, opcoes);
        const iconePeriodo = compromissoConcluido ? 'fa-solid fa-check' : 'fa-regular fa-clock';
        const classeTempoConcluido = compromissoConcluido ? ' agenda-semana-card-time--completed' : '';
        const classes = ['agenda-dia-aula', 'agenda-semana-card'];
        const visualContext = opcoes.visualContext === 'calendar-day' ? 'calendar-day' : '';
        const visualDensity = ['normal', 'compact', 'tight'].includes(opcoes.visualDensity)
            ? opcoes.visualDensity
            : 'normal';
        const visualHideOptionalMobile = visualContext === 'calendar-day' && opcoes.visualHideOptionalMobile === true;
        const visualInlineStatusBadge = visualContext === 'calendar-day' && opcoes.visualInlineStatusBadge === true;

        if (visualContext === 'calendar-day') {
            classes.push('agenda-card-dayview');
            if (visualDensity !== 'normal') {
                classes.push(`agenda-card-density-${visualDensity}`);
            }
            if (visualHideOptionalMobile) {
                classes.push('agenda-card-mobile-overflow');
            }
            if (visualInlineStatusBadge) {
                classes.push('agenda-card-inline-status-mode');
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
                tagStatusHtml = `<span class="badge-tag-tipo badge-tag-tipo--reposicao agenda-card-optional agenda-card-status-badge"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
            } else if (comp.frequencia === 'semanal') {
                const badgeLabel = comp.serieOrigemId
                    ? `<i class="fa-solid fa-arrow-turn-down-right"></i> Continuação`
                    : `<i class="fa-solid fa-infinity"></i> Recorrente`;
                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.recorrente}">${badgeLabel}</span>`;
            } else {
                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.unico}"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
            }
            const badgeStatusModo = distribuirBadgeStatusPorModo(tagStatusHtml, visualInlineStatusBadge);
            const tagStatusInlineHtml = badgeStatusModo.inline;
            const tagStatusMetaHtml = badgeStatusModo.meta;
            tagVisualHtml = tagStatusMetaHtml;
            if (alunoInativo) {
                tagVisualHtml += `<span class="badge-tag-tipo agenda-card-optional" style="background: rgba(255, 138, 128, 0.15); color: #FF8A80; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-user-slash"></i> Aluno inativo</span>`;
            }

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', styleCardAula)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nomeSeguro}</span>
                                ${montarSlotBadgeInline(tagStatusInlineHtml)}
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${localSeguro}</span>
                            <div class="agenda-semana-card-meta">
                                <span class="agenda-dia-aula-detalhes">${objetivoSeguro}</span>
                                ${tagVisualHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tipo === 'deslocamento') {
            classes.push('slot-deslocamento');
            const tagStatusDeslocamento = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.deslocamento}"><i class="fa-solid fa-car-side"></i> Trânsito</span>`;
            const badgeStatusDeslocamento = distribuirBadgeStatusPorModo(tagStatusDeslocamento, visualInlineStatusBadge);
            const tagStatusDeslocamentoInline = badgeStatusDeslocamento.inline;
            const tagStatusDeslocamentoMeta = badgeStatusDeslocamento.meta;
            const descricaoDeslocamento = escapeHtml(comp.descricao || 'Trânsito');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome" style="color: #51b749;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                                ${montarSlotBadgeInline(tagStatusDeslocamentoInline)}
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${descricaoDeslocamento}</span>
                            <div class="agenda-semana-card-meta">
                                ${tagStatusDeslocamentoMeta}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tipo === 'bloqueio') {
            // [TAG-GCAL-CARD-EXTERNO] Eventos externos do Google Calendar: card somente leitura, sem onclick
            if (comp.source === 'google_external') {
                classes.push('slot-bloqueado', 'card-bloqueio-externo');
                const tagStatusGoogle = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.googleAgenda}"><i class="fa-brands fa-google"></i> Google Agenda</span>`;
                const badgeStatusGoogle = distribuirBadgeStatusPorModo(tagStatusGoogle, visualInlineStatusBadge);
                const tagStatusGoogleInline = badgeStatusGoogle.inline;
                const tagStatusGoogleMeta = badgeStatusGoogle.meta;

                const descricaoExterna = String(comp.descricao || 'Evento externo');
                const descricaoExternaSafe = escapeHtml(descricaoExterna);
                const tituloExterno = descricaoExternaSafe;
                return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)} title="${tituloExterno}">
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome card-bloqueio-externo-nome"><i class="fa-brands fa-google" style="color: #4285F4;"></i> ${descricaoExternaSafe}</span>
                                ${montarSlotBadgeInline(tagStatusGoogleInline)}
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #dc2127;">Bloqueado</span>
                            <div class="agenda-semana-card-meta">
                                ${tagStatusGoogleMeta}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }

            classes.push('slot-bloqueado');
            const tagStatusBloqueio = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.bloqueio}"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? 'Dia inteiro' : 'Bloqueio'}</span>`;
            const badgeStatusBloqueio = distribuirBadgeStatusPorModo(tagStatusBloqueio, visualInlineStatusBadge);
            const tagStatusBloqueioInline = badgeStatusBloqueio.inline;
            const tagStatusBloqueioMeta = badgeStatusBloqueio.meta;
            const descricaoBloqueioInterno = escapeHtml(comp.descricao || 'Compromisso');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome agenda-dia-bloqueio-descricao" style="color: #DDD;"><i class="fa-solid fa-lock"></i><span class="agenda-dia-bloqueio-descricao-text">${descricaoBloqueioInterno}</span></span>
                                ${montarSlotBadgeInline(tagStatusBloqueioInline)}
                            </div>
                            <span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #dc2127;">${bloqueioDiaInteiro ? 'Dia bloqueado' : 'Bloqueado'}</span>
                            <div class="agenda-semana-card-meta">
                                ${tagStatusBloqueioMeta}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    };
})();
