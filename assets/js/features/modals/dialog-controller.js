// [TAG-DIALOG-CONTROLLER] dialog-controller.js
// Responsabilidade: controlador base para diálogos, com foco inicial, trap de Tab,
// empilhamento e restauração do foco. Sem regra de negócio.

(function () {
    const state = {
        stack: [],
        keydownBound: false
    };

    function getFocusableElements(dialog) {
        if (!dialog) return [];
        const all = [...dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), details, summary'
        )].filter((element) => {
            const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
            if (style && style.display === 'none') return false;
            if (style && style.visibility === 'hidden') return false;
            return !element.hasAttribute('hidden');
        });

        const prioritized = all.filter((element) => {
            const tag = element.tagName && element.tagName.toLowerCase();
            return tag === 'input' || tag === 'select' || tag === 'textarea';
        });

        return prioritized.length > 0 ? prioritized.concat(all.filter((element) => !prioritized.includes(element))) : all;
    }

    function normalizeDialog(dialog) {
        if (!dialog || typeof dialog.setAttribute !== 'function') return null;
        if (!dialog.hasAttribute('role')) {
            dialog.setAttribute('role', 'dialog');
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
        dialog.dataset.dialogUnderlay = isBlocked ? 'true' : 'false';
    }

    function focusFirstInteractive(dialog) {
        const candidates = getFocusableElements(dialog);
        const preferred = dialog.querySelector('[data-dialog-focus]') || candidates[0];
        if (preferred && typeof preferred.focus === 'function') {
            const isField = ['input', 'select', 'textarea'].includes((preferred.tagName || '').toLowerCase());
            if (!isField && candidates.some((candidate) => {
                const tag = (candidate.tagName || '').toLowerCase();
                return ['input', 'select', 'textarea'].includes(tag);
            })) {
                const fieldCandidate = candidates.find((candidate) => {
                    const tag = (candidate.tagName || '').toLowerCase();
                    return ['input', 'select', 'textarea'].includes(tag);
                });
                if (fieldCandidate && typeof fieldCandidate.focus === 'function') {
                    fieldCandidate.focus();
                    return true;
                }
            }
            preferred.focus();
            return true;
        }
        if (typeof dialog.focus === 'function') {
            dialog.focus();
            return true;
        }
        return false;
    }

    function getCurrentTopDialog() {
        return state.stack.length > 0 ? state.stack[state.stack.length - 1].dialog : null;
    }

    function handleKeydown(event) {
        const top = getCurrentTopDialog();
        if (!top || top.style.display === 'none') return;

        if (event.key === 'Escape') {
            event.preventDefault();
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

        state.stack.push({ dialog: target, trigger });
        bindKeydown();
        updateBodyScrollLock();
        setDialogOpen(target, true);
        focusFirstInteractive(target);

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
        focusFirstInteractive
    });
})();
