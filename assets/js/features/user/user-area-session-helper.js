(function (global) {
    'use strict';

    function getSessionSnapshot(googleIdentity) {
        if (typeof googleIdentity !== 'object') {
            return {
                isSignedIn: false,
                name: '',
                email: '',
                picture: ''
            };
        }

        const isSignedIn = typeof googleIdentity.isSignedIn === 'function'
            ? googleIdentity.isSignedIn()
            : false;
        const profile = typeof googleIdentity.getProfile === 'function'
            ? googleIdentity.getProfile()
            : null;

        return {
            isSignedIn,
            name: profile && profile.name ? String(profile.name) : '',
            email: profile && profile.email ? String(profile.email) : '',
            picture: profile && profile.picture ? String(profile.picture) : ''
        };
    }

    function renderProfile(session, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const snapshot = session && typeof session === 'object'
            ? session
            : getSessionSnapshot(opts.googleIdentity);

        const avatarEl = document.getElementById(opts.avatarId || 'userProfileAvatar');
        const nameEl = document.getElementById(opts.nameId || 'userProfileName');
        const emailEl = document.getElementById(opts.emailId || 'userProfileEmail');
        const signOutBtn = document.getElementById(opts.signOutButtonId || 'btnUserSignOut');

        if (nameEl) {
            nameEl.textContent = snapshot.isSignedIn && snapshot.name
                ? snapshot.name
                : 'Conta Google';
        }

        if (emailEl) {
            emailEl.textContent = snapshot.isSignedIn && snapshot.email
                ? snapshot.email
                : 'Faça login para ver seu perfil.';
        }

        if (avatarEl) {
            if (snapshot.picture) {
                avatarEl.innerHTML = '<img src="' + snapshot.picture + '" alt="Avatar da conta Google" />';
            } else {
                const source = snapshot.email || snapshot.name || 'G';
                const initial = String(source).trim().charAt(0).toUpperCase() || 'G';
                avatarEl.textContent = initial;
            }
        }

        if (signOutBtn) {
            signOutBtn.disabled = !snapshot.isSignedIn;
        }

        return snapshot;
    }

    global.userAreaSessionHelper = {
        getSessionSnapshot,
        renderProfile
    };
})(window);
