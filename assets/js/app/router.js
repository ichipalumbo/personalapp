(function (global) {
    const VIEW_INITIALIZERS = {
        'tela-home': () => global.inicializarHome,
        'tela-financas': () => global.inicializarFinancas,
        'tela-alunos': () => global.inicializarAlunos
    };

    const TELA_PADRAO = 'tela-home';

    function getInitializer(targetId) {
        const resolver = VIEW_INITIALIZERS[targetId];
        return typeof resolver === 'function' ? resolver() : null;
    }

    function telaValida(targetId) {
        return typeof targetId === 'string' && Object.prototype.hasOwnProperty.call(VIEW_INITIALIZERS, targetId)
            ? targetId
            : null;
    }

    // Etapa 7 (Cartão D — achado 4.17.6): a tela ativa é refletida na URL pelo
    // fragmento (#tela-financas). A escolha por hash e não por caminho é
    // deliberada: caminho exigiria rewrite no servidor local e no deploy
    // estático do Vercel, senão recarregar devolveria 404. A hash não passa
    // pelo servidor, então reload e Voltar/Avançar funcionam sem config nova.
    function lerTelaDaHash() {
        const hash = (global.location && global.location.hash) || '';
        if (hash.length < 2) {
            return null;
        }
        try {
            return telaValida(decodeURIComponent(hash.slice(1)));
        } catch (_erro) {
            // Hash malformada (ex.: '%' solto) — não derruba o app por isso.
            return null;
        }
    }

    function createRouter() {
        const afterNavigateCallbacks = [];
        let currentViewId = null;
        // A primeira escrita na URL substitui a entrada atual em vez de
        // empilhar: a tela escolhida no boot (ou restaurada da hash) não é uma
        // navegação do usuário, e Voltar deve sair do app, não voltar para uma
        // tela que a pessoa não visitou.
        let jaEscreveuNaUrl = false;

        async function initializeView(targetId) {
            const initializer = getInitializer(targetId);
            if (typeof initializer === 'function') {
                await initializer();
            }
            // Etapa 3 (Rodada 2): o FAB dinâmico da Home (#fabNovoHome, criado
            // por view-home.js) existe SOMENTE com o Home em tela — nas demais
            // telas ele conflita com o FAB da tela (ex.: "Novo aluno" em
            // Alunos) e intercepta o toque. Aqui a tela alvo já está com o
            // display definitivo (setado antes do init), então a verificação
            // por visibilidade está correta; é idempotente no Home (o próprio
            // init também a chama, sem efeito colateral).
            if (typeof global.trocarFABNovoHome === 'function') {
                global.trocarFABNovoHome();
            }
        }

        // Escrever na URL nunca pode impedir a navegação: se a History API
        // falhar (ambiente sem suporte, ou URL rejeitada), a troca de tela
        // segue valendo e apenas o estado da URL fica defasado.
        // A comparação com a hash atual é o que também guarda a navegação
        // disparada pela própria URL (Voltar/Avançar): nesse caminho a hash já
        // é a da tela de destino, então não há o que escrever — sem isso, o
        // Voltar do navegador criaria uma entrada a cada uso.
        function registrarTelaNaUrl(targetId, substituir) {
            const history = global.history;
            if (!history || !global.location) {
                return;
            }
            // A flag marca "o boot já passou", NÃO "a URL foi escrita". Num deep
            // link — ou numa recarga já em #tela-financas, que é o mesmo caminho
            // e o caso que o item 4.17.6 existe para resolver — a hash já é a da
            // tela, então não há o que escrever. Marcá-la só depois de uma
            // escrita bem-sucedida deixava a PRIMEIRA navegação do usuário
            // usando replaceState em vez de pushState: a entrada não era
            // criada, e o Voltar pulava uma tela.
            jaEscreveuNaUrl = true;
            const novaHash = '#' + targetId;
            if (global.location.hash === novaHash) {
                return;
            }
            const metodo = substituir ? 'replaceState' : 'pushState';
            if (typeof history[metodo] !== 'function') {
                return;
            }
            try {
                history[metodo].call(history, null, '', novaHash);
            } catch (_erro) {
                // Ignorado de propósito — ver comentário acima.
            }
        }

        // Chamado quando a URL muda por fora da navegação (Voltar/Avançar do
        // navegador, ou edição manual da barra de endereços).
        function sincronizarComUrl() {
            if (!currentViewId) {
                // Boot ainda não escolheu a tela; getTelaInicial cuida disso.
                return;
            }
            const tela = lerTelaDaHash();
            if (!tela) {
                // Hash inválida ou apagada: realinha a URL com a tela que está
                // em exibição, sem criar entrada nova (não houve navegação).
                registrarTelaNaUrl(currentViewId, true);
                return;
            }
            if (tela === currentViewId) {
                return;
            }
            void navigateTo(tela);
        }

        async function navigateTo(targetId) {
            const tela = telaValida(targetId);
            if (!tela) {
                return;
            }

            const navLinks = document.querySelectorAll('.nav-inferior .nav-link-inferior');
            const views = document.querySelectorAll('.view-section');
            const activeView = document.getElementById(tela);
            currentViewId = tela;

            registrarTelaNaUrl(tela, !jaEscreveuNaUrl);

            navLinks.forEach(link => {
                const isActive = link.getAttribute('data-target') === tela;
                link.classList.toggle('ativo', isActive);
                // Etapa 3 (Cartão E): estado ativo também semântico para leitores de tela.
                if (isActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });

            views.forEach(view => {
                view.style.display = view.id === tela ? 'block' : 'none';
            });

            if (activeView) {
                activeView.style.display = 'block';
            }

            // Remove o FAB da Home assim que ela sai de tela — ANTES do init da
            // tela alvo. Se ficasse só no initializeView (depois do await da
            // navegação), o FAB persistiria durante todo o carregamento da
            // tela de destino (sintoma: Home → Finanças, FAB visível até o
            // fetch terminar; Home → Alunos, mesmo conflito com o FAB "Novo
            // aluno"). A chamada idempotente no initializeView é mantida.
            if (typeof global.trocarFABNovoHome === 'function') {
                global.trocarFABNovoHome();
            }

            await initializeView(tela);
            global.scrollTo({ top: 0, behavior: 'smooth' });

            afterNavigateCallbacks.forEach(callback => callback(tela));
        }

        function bindNavigation() {
            const navLinks = document.querySelectorAll('.nav-inferior .nav-link-inferior');

            navLinks.forEach(link => {
                link.addEventListener('click', async event => {
                    event.preventDefault();
                    const targetId = link.getAttribute('data-target');
                    await navigateTo(targetId);
                });
            });

            // Entradas de histórico que diferem apenas no fragmento disparam
            // 'hashchange' de forma garantida (é o nosso caso, pois só criamos
            // entradas assim), então 'popstate' seria um segundo listener para
            // o mesmo evento.
            global.addEventListener('hashchange', sincronizarComUrl);
        }

        function onAfterNavigate(callback) {
            if (typeof callback === 'function') {
                afterNavigateCallbacks.push(callback);
            }
        }

        async function refreshCurrentView() {
            if (!currentViewId) {
                return;
            }

            await initializeView(currentViewId);
            afterNavigateCallbacks.forEach(callback => callback(currentViewId));
        }

        return {
            bindNavigation,
            navigateTo,
            onAfterNavigate,
            refreshCurrentView,
            getCurrentViewId: function () {
                return currentViewId;
            },
            // Tela a abrir no boot: a da URL, se for uma tela conhecida;
            // senão a padrão. Mantém o router como dono da decisão, sem o
            // bootstrap precisar interpretar a hash.
            getTelaInicial: function () {
                return lerTelaDaHash() || TELA_PADRAO;
            }
        };
    }

    global.__appRouter = {
        createRouter
    };
})(window);
