/**
 * app.js - Controlador Principal da Aplicação
 */

const THEME_STORAGE_KEY = 'aidoc.theme.v1';
const TOUR_STORAGE_KEY  = 'aidoc.tour.completed.v1';

let _entryCompleted = false;
const _publicViews  = new Set(['entry', 'login', 'register']);
const _navHistory   = [];

// ── Navbar: mostra itens certos conforme estado de auth ───────────────────────
function updateNavbar(loggedIn) {
    document.querySelectorAll('.nav-auth-only').forEach(el => {
        el.style.display = loggedIn ? 'none' : '';
    });
    document.querySelectorAll('.nav-app-only').forEach(el => {
        el.style.display = loggedIn ? '' : 'none';
    });
}

window.switchView = function(viewId, options = {}) {
    if (!_entryCompleted && !_publicViews.has(viewId)) viewId = 'entry';

    // Registra histórico de navegação
    const current = document.querySelector('.app-content .view.active')?.id?.replace('view-', '');
    if (current && current !== viewId && !options.back) {
        _navHistory.push(current);
        if (_navHistory.length > 20) _navHistory.shift();
    }

    document.querySelectorAll('#navbar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });
    document.querySelectorAll('.app-content .view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewId}`);
    });

    // Mostra/esconde botão voltar
    const backBtn = document.getElementById('btn-nav-back');
    if (backBtn) {
        const showBack = _entryCompleted && _navHistory.length > 0;
        backBtn.style.display = showBack ? 'inline-flex' : 'none';
    }

    if (!options.keepTour) window.closeTour?.();
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof feather !== 'undefined') feather.replace();

    const loginForm       = document.getElementById('login-form');
    const registerForm    = document.getElementById('register-form');
    const loginMessage    = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const currentUserName   = document.getElementById('current-user-name');
    const currentUserRole   = document.getElementById('current-user-role');
    const currentUserAvatar = document.getElementById('current-user-avatar');

    document.body.classList.add('entry-required');
    updateNavbar(false);

    function setAuthMessage(el, msg, isSuccess = false) {
        if (!el) return;
        el.textContent = msg;
        el.classList.toggle('success', isSuccess);
    }

    function getInitials(name) {
        return String(name || 'AIDoc').trim().split(/\s+/)
            .map(p => p[0]).slice(0, 2).join('').toUpperCase();
    }

    function setDemoUser(name, role = 'Equipe clínica') {
        if (currentUserName)   currentUserName.textContent   = name;
        if (currentUserRole)   currentUserRole.textContent   = role;
        if (currentUserAvatar) currentUserAvatar.textContent = getInitials(name);
    }

    function completeEntry() {
        _entryCompleted = true;
        document.body.classList.remove('entry-required');
        updateNavbar(true);
    }

    function doLogout() {
        apiLogout();
        _entryCompleted = false;
        document.body.classList.add('entry-required');
        updateNavbar(false);
        window.switchView('entry');
    }

    // ── Restaura sessão salva ──────────────────────────────────────────────────
    const storedUser = getStoredUser();
    if (storedUser && isLoggedIn()) {
        setDemoUser(storedUser.nome || storedUser.email || 'Médico', 'Equipe clínica');
        completeEntry();
        window.switchView('dashboard');
    }

    // ── Navegação ──────────────────────────────────────────────────────────────
    document.querySelectorAll('#navbar-nav .nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            if (item.dataset.view) window.switchView(item.dataset.view);
        });
    });

    document.querySelectorAll('[data-view-target]').forEach(btn => {
        btn.addEventListener('click', () => window.switchView(btn.dataset.viewTarget));
    });

    document.querySelectorAll('[data-demo-access]').forEach(btn => {
        btn.addEventListener('click', () => {
            setDemoUser('Demo AIDoc', 'Protótipo');
            completeEntry();
            window.switchView('dashboard');
            _autoStartTour();
        });
    });

    document.getElementById('btn-new-analysis')?.addEventListener('click',   () => window.switchView('analysis'));
    document.getElementById('btn-quick-analysis')?.addEventListener('click', () => window.switchView('analysis'));

    // ── Botão Voltar ───────────────────────────────────────────────────────────
    document.getElementById('btn-nav-back')?.addEventListener('click', () => {
        const prev = _navHistory.pop();
        if (prev) window.switchView(prev, { back: true });
    });

    // ── Logout ─────────────────────────────────────────────────────────────────
    document.querySelector('.user-profile')?.addEventListener('click', () => {
        if (!_entryCompleted) return;
        if (!confirm('Deseja sair da sua conta?')) return;
        doLogout();
    });

    // ── Login ──────────────────────────────────────────────────────────────────
    loginForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            setAuthMessage(loginMessage, 'Preencha e-mail e senha para continuar.');
            return;
        }

        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            const data = await apiLogin(email, password);
            const nome = data.user?.nome || email.split('@')[0].replace(/[._-]+/g, ' ');
            setDemoUser(nome, 'Equipe clínica');
            completeEntry();
            setAuthMessage(loginMessage, 'Login realizado! Abrindo workspace...', true);
            setTimeout(() => {
                window.switchView('dashboard');
                _autoStartTour();
            }, 400);
        } catch (err) {
            setAuthMessage(loginMessage, err.message || 'Credenciais inválidas. Tente novamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-feather="log-in"></i> Entrar';
            if (typeof feather !== 'undefined') feather.replace();
        }
    });

    // ── Cadastro ───────────────────────────────────────────────────────────────
    registerForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const name            = document.getElementById('register-name').value.trim();
        const role            = document.getElementById('register-role').value.trim();
        const email           = document.getElementById('register-email').value.trim();
        const password        = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            setAuthMessage(registerMessage, 'As senhas precisam ser iguais.');
            return;
        }

        const btn = registerForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Criando conta...';

        try {
            const data = await apiSignup(email, password, name);
            if (data.email_confirmacao_pendente) {
                setAuthMessage(registerMessage, 'Conta criada! Confirme seu e-mail antes de entrar.', true);
            } else {
                setDemoUser(name, role || 'Equipe clínica');
                completeEntry();
                setAuthMessage(registerMessage, 'Cadastro realizado! Abrindo workspace...', true);
                setTimeout(() => {
                    window.switchView('dashboard');
                    _autoStartTour();
                }, 400);
            }
        } catch (err) {
            setAuthMessage(registerMessage, err.message || 'Erro ao criar conta. Tente novamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-feather="user-plus"></i> Criar cadastro';
            if (typeof feather !== 'undefined') feather.replace();
        }
    });

    // ── Tema ───────────────────────────────────────────────────────────────────
    const btnThemeToggle = document.getElementById('btn-theme-toggle');

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const isDark = theme === 'dark';
        if (btnThemeToggle) {
            btnThemeToggle.innerHTML = `<i data-feather="${isDark ? 'sun' : 'moon'}"></i>`;
            btnThemeToggle.title = isDark ? 'Tema claro' : 'Tema escuro';
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function loadTheme() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    let currentTheme = loadTheme();
    applyTheme(currentTheme);

    btnThemeToggle?.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        applyTheme(currentTheme);
    });

    // ── Tour médico ────────────────────────────────────────────────────────────
    const tourSteps = [
        {
            selector: '.top-navbar',
            title: '👋 Bem-vindo ao AIDoc!',
            text: 'Esta é sua barra de navegação. Acesse o Workspace, a Análise IA e os Perfis de Pacientes a qualquer momento.'
        },
        {
            selector: '[data-tour="header"]',
            title: '⚡ Ações Rápidas',
            text: 'Clique em "Nova Análise" para enviar um laudo imediatamente. Use "Redefinir Layout" para restaurar o painel ao estado original.'
        },
        {
            selector: '#w-critical',
            title: '🚨 Exames Críticos',
            text: 'Aqui aparecem os pacientes com marcadores críticos identificados pela IA. Clique em qualquer card para ver o perfil completo.'
        },
        {
            selector: '#w-quick',
            title: '🧪 Análise Rápida',
            text: 'Clique em "Analisar Novo Laudo" para ir direto à tela de análise. Você pode colar o texto do exame ou fazer upload de um PDF.'
        },
        {
            selector: '#w-insights',
            title: '📊 Visão Geral da IA',
            text: 'Estatísticas consolidadas: total de exames analisados, pacientes acompanhados e casos com piora clínica detectada.'
        },
        {
            selector: '#w-recent',
            title: '👥 Pacientes Recentes',
            text: 'Lista de pacientes em rotina e acompanhamento. Clique em um nome para abrir o histórico clínico completo com linha do tempo.'
        },
        {
            selector: '[data-view="analysis"]',
            title: '🤖 Análise IA',
            text: 'Na aba "Análise IA" você envia laudos por texto ou PDF. A IA DeepSeek identifica valores alterados, classifica urgência e sugere condutas.'
        },
        {
            selector: '[data-view="patients"]',
            title: '📋 Perfil do Paciente',
            text: 'Cada paciente tem um perfil com histórico de exames, evolução clínica e comparação entre laudos anteriores e atuais.'
        },
        {
            selector: '#btn-theme-toggle',
            title: '🌙 Tema Claro / Escuro',
            text: 'Alterne entre modo claro e escuro conforme sua preferência ou ambiente de trabalho.'
        },
        {
            selector: '.user-profile',
            title: '✅ Tudo pronto!',
            text: 'Clique no seu avatar para sair da conta. Agora você já conhece o AIDoc — comece analisando o primeiro laudo!'
        }
    ];

    let activeTour = null;

    function _ensureTourOverlay() {
        let overlay = document.getElementById('tour-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tour-overlay';
            overlay.className = 'tour-overlay hidden';
            overlay.innerHTML = `
                <div class="tour-backdrop"></div>
                <div class="tour-highlight"></div>
                <div class="tour-card">
                    <div class="tour-step-counter"></div>
                    <h3 class="tour-title"></h3>
                    <p class="tour-text"></p>
                    <div class="tour-actions">
                        <button class="btn btn-outline" data-action="skip">Pular tour</button>
                        <button class="btn btn-primary" data-action="next">Próximo →</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', event => {
                if (!activeTour) return;
                const action = event.target.closest('[data-action]')?.dataset.action;
                if (!action) return;
                if (action === 'skip') {
                    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
                    window.closeTour();
                    return;
                }
                const next = activeTour.currentStep + 1;
                if (next >= tourSteps.length) {
                    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
                    window.closeTour();
                    return;
                }
                _showTourStep(next);
            });
        }
        return overlay;
    }

    function _showTourStep(index) {
        if (!activeTour) return;
        const step   = tourSteps[index];
        const target = document.querySelector(step.selector);
        if (!target) { _showTourStep(index + 1); return; }

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            const rect = target.getBoundingClientRect();
            const p = 10;
            const hl = activeTour.overlay.querySelector('.tour-highlight');
            hl.style.top    = `${rect.top    + window.scrollY - p}px`;
            hl.style.left   = `${rect.left   + window.scrollX - p}px`;
            hl.style.width  = `${rect.width  + p * 2}px`;
            hl.style.height = `${rect.height + p * 2}px`;

            // Posiciona o card abaixo ou acima do elemento
            const card = activeTour.overlay.querySelector('.tour-card');
            const cardTop = rect.bottom + window.scrollY + 16;
            const cardLeft = Math.min(Math.max(rect.left + window.scrollX, 16), window.innerWidth - 340);
            card.style.top  = `${cardTop}px`;
            card.style.left = `${cardLeft}px`;

            activeTour.overlay.querySelector('.tour-step-counter').textContent = `Etapa ${index + 1} de ${tourSteps.length}`;
            activeTour.overlay.querySelector('.tour-title').textContent = step.title;
            activeTour.overlay.querySelector('.tour-text').textContent  = step.text;
            activeTour.overlay.querySelector('[data-action="next"]').textContent =
                index === tourSteps.length - 1 ? '✓ Concluir' : 'Próximo →';

            activeTour.currentStep = index;
        }, 200);
    }

    function _startTour() {
        if (!_entryCompleted) return;
        window.switchView('dashboard', { keepTour: true });
        const overlay = _ensureTourOverlay();
        overlay.classList.remove('hidden');
        activeTour = { overlay, currentStep: 0 };
        _showTourStep(0);
    }

    function _autoStartTour() {
        if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
            setTimeout(_startTour, 800);
        }
    }

    window.closeTour = function() {
        if (!activeTour) return;
        activeTour.overlay.classList.add('hidden');
        activeTour = null;
    };

    window.addEventListener('resize', () => { if (activeTour) _showTourStep(activeTour.currentStep); });

    document.getElementById('btn-start-tour')?.addEventListener('click', () => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        _startTour();
    });

    // ── Init ───────────────────────────────────────────────────────────────────
    if (typeof initDashboard === 'function') initDashboard();

    if (location.hash === '#demo') {
        setDemoUser('Demo AIDoc', 'Protótipo');
        completeEntry();
        window.switchView('dashboard');
        _autoStartTour();
    }
});
