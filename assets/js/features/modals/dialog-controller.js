// [TAG-DIALOG-CONTROLLER] dialog-controller.js
// Responsabilidade: controlador base para diálogos, com foco no contexto, trap de Tab,
// empilhamento e restauração do foco. Sem regra de negócio.

(function () {
    const state = {
        stack: [],
        keydownBound: false
    };

    function isRenderedWithin(element, dialog) {
        let node = element;
        while (node && node !== dialog) {
            if (node.hasAttribute && node.hasAttribute('hidden')) return false;
            const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
            node = node.parentElement;
        }
        return true;
    }

    function getFocusableElements(dialog) {
        if (!dialog) return [];
        return [...dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), summary'
        )].filter((element) => isRenderedWithin(element, dialog));
    }

    function normalizeDialog(dialog) {
        if (!dialog || typeof dialog.setAttribute !== 'function') return null;
        if (!dialog.hasAttribute('role')) {
            dialog.setAttribute('role', 'dialog');
        }
        if (!dialog.hasAttribute('tabindex')) {
            dialog.setAttribute('tabindex', '-1');
        }
        if (!dialog.getAttribute('aria-labelledby')) {
            const titleNode = dialog.querySelector('[data-dialog-title], h1, h2, h3, h4');
            if (titleNode && titleNode.id) {
                dialog.setAttribute('aria-labelledby', titleNode.id);
            }
        }
        if (!dialog.getAttribute('aria-modal')) {
            dialog.setAttribute('aria-modal', 'false');
        }
        return dialog;
    }

    function setDialogOpen(dialog, isOpen) {
        const target = normalizeDialog(dialog);
        if (!target) return;
        target.style.display = isOpen ? 'flex' : 'none';
        target.setAttribute('aria-modal', isOpen ? 'true' : 'false');
        target.dataset.dialogOpen = isOpen ? 'true' : 'false';
    }

    function setUnderlayState(dialog, isBlocked) {
        if (!dialog) return;
        if (typeof dialog.inert === 'boolean') {
            dialog.inert = isBlocked;
        }
        dialog.setAttribute('aria-hidden', isBlocked ? 'true' : 'false');
        dialog.setAttribute('aria-modal', isBlocked ? 'false' : 'true');
        dialog.dataset.dialogUnderlay = isBlocked ? 'true' : 'false';
    }

    function focusDialogContext(dialog) {
        if (!dialog || typeof dialog.focus !== 'function') return false;
        try {
            dialog.focus({ preventScroll: true });
        } catch (_) {
            dialog.focus();
        }
        return true;
    }

    function getCurrentTopDialog() {
        return state.stack.length > 0 ? state.stack[state.stack.length - 1].dialog : null;
    }

    function getCurrentTopEntry() {
        return state.stack.length > 0 ? state.stack[state.stack.length - 1] : null;
    }

    function handleKeydown(event) {
        const top = getCurrentTopDialog();
        if (!top || top.style.display === 'none') return;

        if (event.key === 'Escape') {
            event.preventDefault();
            const entry = getCurrentTopEntry();
            if (entry && typeof entry.onRequestClose === 'function') {
                entry.onRequestClose();
                return;
            }
            window.DialogController.close(top);
            return;
        }

        if (event.key !== 'Tab') return;

        const slot = getFocusableElements(top);
        if (slot.length === 0) {
            event.preventDefault();
            return;
        }

        const first = slot[0];
        const last = slot[slot.length - 1];
        const active = document.activeElement;

        if (active === top || !top.contains(active)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
            return;
        }

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bindKeydown() {
        if (state.keydownBound) return;
        document.addEventListener('keydown', handleKeydown);
        state.keydownBound = true;
    }

    function updateBodyScrollLock() {
        if (state.stack.length > 0) {
            document.body.style.overflow = 'hidden';
            return;
        }
        document.body.style.overflow = '';
    }

    function open(dialog, options = {}) {
        const target = normalizeDialog(dialog);
        if (!target) return null;

        const trigger = options.trigger || document.activeElement || null;
        const top = getCurrentTopDialog();

        if (top && top !== target) {
            setUnderlayState(top, true);
        }

        const existingIndex = state.stack.findIndex((entry) => entry.dialog === target);
        if (existingIndex !== -1) {
            state.stack.splice(existingIndex, 1);
        }

        state.stack.push({ dialog: target, trigger, onRequestClose: options.onRequestClose || null });
        // Etapa 3 (Rodada 2, 2026-09-27): z-index por nível de stack — permite
        // empilhar dois .modal-overlay (ex.: "Configurar Grade Horária" aberto
        // A PARTIR de dentro do modal Área do usuário, seção "Dados"). Sem isso
        // os dois ficariam em z 1000 e o DOM decidiria quem fica em cima (a
        // ordem no markup, não o topo do stack).
        target.style.zIndex = String(1000 + state.stack.length);
        bindKeydown();
        updateBodyScrollLock();
        setDialogOpen(target, true);
        if (window.contextoDados && target.querySelector('form')) window.contextoDados.definirFormulario(target, true);
        focusDialogContext(target);

        return {
            dialog: target,
            trigger
        };
    }

    function close(dialog) {
        const target = normalizeDialog(dialog);
        if (!target) return null;

        const index = state.stack.findIndex((entry) => entry.dialog === target);
        const entry = index !== -1 ? state.stack[index] : null;

        if (index !== -1) {
            state.stack.splice(index, 1);
        }

        setDialogOpen(target, false);
        if (window.contextoDados) window.contextoDados.definirFormulario(target, false);
        target.style.zIndex = '';

        const previous = getCurrentTopDialog();
        if (previous) {
            setUnderlayState(previous, false);
        }

        updateBodyScrollLock();

        if (entry && entry.trigger && typeof entry.trigger.focus === 'function') {
            entry.trigger.focus();
        }

        return entry;
    }

    window.DialogController = Object.freeze({
        open,
        close,
        getStack: () => state.stack.map((entry) => entry.dialog),
        getFocusableElements,
        focusDialogContext
    });
})();
