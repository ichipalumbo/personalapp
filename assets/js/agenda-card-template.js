// [TAG-AGENDA-CARD-TEMPLATE] agenda-card-template.js
// Responsabilidade: Renderização compartilhada do card de agendamento padrão da agenda
// Depende de: alunos-helpers.js (window.getAluno), widget-bloqueio.js (window.ehBloqueioDiaInteiroCompromisso)
// Expõe: window.criarCardAgendamento(comp, opcoes)

(function() {
    const AULA_COR_FALLBACK = '#6B7280';

    const BADGE_STYLES = {
        recorrente: 'background: rgba(255, 215, 0, 0.15); color: #FFD700; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        unico: 'background: rgba(129, 199, 132, 0.15); color: #81C784; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        deslocamento: 'background: rgba(81, 183, 73, 0.15); color: #51b749; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;',
        bloqueio: 'background: rgba(220, 33, 39, 0.15); color: #dc2127; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;'
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

        if (opcoes.extraClass) {
            classes.push(opcoes.extraClass);
        }
        if (compromissoConcluido) {
            classes.push('agenda-semana-card--completed');
        }

        if (tipo === 'aula') {
            const aluno = typeof window.getAluno === 'function' ? window.getAluno(comp.alunoId) : null;
            const nome = aluno ? aluno.nome : '❓ Aluno Removido';
            const objetivo = aluno ? (aluno.objective || aluno.objetivo || 'Outro') : 'Outro';
            const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';
            const corBordaAula = resolverCorObjetivoAula(aluno);
            const styleCardAula = montarStyleComposto([
                `border-left-color: ${corBordaAula};`,
                opcoes.style || ''
            ]);
            let tagNomeHtml = '';
            let tagVisualHtml = '';

            classes.push(`objetivo-${normalizarObjetivo(objetivo)}`);

            if (comp.reagendada || comp.isReposicao) {
                tagNomeHtml = `<span class="badge-tag-tipo badge-tag-tipo--reposicao"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
            } else if (comp.frequencia === 'semanal') {
                const badgeLabel = comp.serieOrigemId
                    ? `<i class="fa-solid fa-arrow-turn-down-right"></i> Continuação`
                    : `<i class="fa-solid fa-infinity"></i> Recorrente`;
                tagVisualHtml = `<span class="badge-tag-tipo" style="${BADGE_STYLES.recorrente}">${badgeLabel}</span>`;
            } else {
                tagVisualHtml = `<span class="badge-tag-tipo" style="${BADGE_STYLES.unico}"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
            }

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', styleCardAula)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <div class="agenda-semana-card-title-group">
                                <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                                ${tagNomeHtml}
                            </div>
                            <span class="agenda-semana-card-time${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodo}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                            <div class="agenda-semana-card-meta">
                                <span class="agenda-dia-aula-detalhes">${objetivo}</span>
                                ${tagVisualHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (tipo === 'deslocamento') {
            classes.push('slot-deslocamento');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <span class="agenda-dia-aula-nome" style="color: #51b749;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                            <span class="agenda-semana-card-time${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodo}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${comp.descricao || 'Trânsito'}</span>
                            <div class="agenda-semana-card-meta">
                                <span class="badge-tag-tipo" style="${BADGE_STYLES.deslocamento}"><i class="fa-solid fa-car-side"></i> Trânsito</span>
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
                const tituloExterno = (comp.descricao || 'Evento externo').replace(/"/g, '&quot;');
                return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)} title="${tituloExterno}">
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <span class="agenda-dia-aula-nome card-bloqueio-externo-nome"><i class="fa-solid fa-lock"></i> ${comp.descricao || 'Evento externo'}</span>
                            <span class="agenda-semana-card-time${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodo}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local"><i class="fa-brands fa-google" style="color: #4285F4;"></i> Google Calendar</span>
                            <div class="agenda-semana-card-meta">
                                <span class="badge-tag-tipo" style="${BADGE_STYLES.bloqueio}"><i class="fa-solid fa-lock"></i> Externo</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }

            classes.push('slot-bloqueado');

            return `
                <div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>
                    <div class="card-content-wrapper">
                        <div class="agenda-semana-card-top">
                            <span class="agenda-dia-aula-nome" style="color: #dc2127;"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? 'Dia bloqueado' : 'Bloqueado'}</span>
                            <span class="agenda-semana-card-time${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodo}</span>
                        </div>
                        <div class="agenda-semana-card-bottom">
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${comp.descricao || 'Compromisso'}</span>
                            <div class="agenda-semana-card-meta">
                                <span class="badge-tag-tipo" style="${BADGE_STYLES.bloqueio}"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? 'Dia inteiro' : 'Bloqueio'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    };
})();
