/**
 * app.js - Controlador Principal da Aplicação
 */

const THEME_STORAGE_KEY = 'aidoc.theme.v1';
const TOUR_STORAGE_KEY  = 'aidoc.tour.completed.v1';

let _entryCompleted = false;
const _publicViews  = new Set(['entry', 'login', 'register']);

window.switchView = function(viewId, options = {}) {
    if (!_entryCompleted && !_publicViews.has(viewId)) viewId = 'entry';

    document.querySelectorAll('#navbar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });
    document.querySelectorAll('.app-content .view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewId}`);
    });

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
        });
    });

    document.getElementById('btn-new-analysis')?.addEventListener('click', () => window.switchView('analysis'));
    document.getElementById('btn-quick-analysis')?.addEventListener('click', () => window.switchView('analysis'));

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
            setTimeout(() => window.switchView('dashboard'), 400);
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
                setTimeout(() => window.switchView('dashboard'), 400);
            }
        } catch (err) {
            setAuthMessage(registerMessage, err.message || 'Erro ao criar conta. Tente novamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-feather="user-plus"></i> Criar cadastro';
            if (typeof feather !== 'undefined') feather.replace();
        }
    });

    // ── Logout (clique no avatar) ──────────────────────────────────────────────
    document.querySelector('.user-profile')?.addEventListener('click', () => {
        if (!_entryCompleted) return;
        if (!confirm('Deseja sair da sua conta?')) return;
        apiLogout();
        _entryCompleted = false;
        document.body.classList.add('entry-required');
        window.switchView('entry');
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

    // ── Tour ───────────────────────────────────────────────────────────────────
    const btnStartTour = document.getElementById('btn-start-tour');
    let activeTour = null;

    const tourSteps = [
        { selector: '[data-tour="dashboard"]',     title: 'Workspace',         text: 'Painel principal para monitoramento e triagem em tempo real.' },
        { selector: '[data-tour="header"]',         title: 'Ações Rápidas',     text: 'Inicie uma nova análise ou restaure o layout padrão.' },
        { selector: '[data-tour="widgets"]',        title: 'Widgets Modulares', text: 'Arraste, redimensione e minimize widgets conforme seu fluxo.' },
        { selector: '[data-tour="quick-analysis"]', title: 'Análise Rápida',    text: 'Acesso direto à análise inteligente de exames.' },
        { selector: '#btn-theme-toggle',            title: 'Tema Claro/Escuro', text: 'Troque entre modo claro e escuro com um clique.' }
    ];

    function ensureTourElements() {
        let overlay = document.getElementById('tour-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tour-overlay';
            overlay.className = 'tour-overlay hidden';
            overlay.innerHTML = `
                <div class="tour-highlight"></div>
                <div class="tour-card">
                    <div class="tour-step-counter"></div>
                    <h3 class="tour-title"></h3>
                    <p class="tour-text"></p>
                    <div class="tour-actions">
                        <button class="btn btn-outline" data-action="skip">Pular</button>
                        <button class="btn btn-primary" data-action="next">Próximo</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    window.closeTour = function() {
        if (!activeTour) return;
        activeTour.overlay.classList.add('hidden');
        activeTour = null;
    };

    function showTourStep(index) {
        if (!activeTour) return;
        const step   = tourSteps[index];
        const target = document.querySelector(step.selector);
        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = target.getBoundingClientRect();
        const p = 8;
        const hl = activeTour.overlay.querySelector('.tour-highlight');
        hl.style.top    = `${rect.top - p}px`;
        hl.style.left   = `${rect.left - p}px`;
        hl.style.width  = `${rect.width + p * 2}px`;
        hl.style.height = `${rect.height + p * 2}px`;

        activeTour.overlay.querySelector('.tour-step-counter').textContent = `Etapa ${index + 1} de ${tourSteps.length}`;
        activeTour.overlay.querySelector('.tour-title').textContent = step.title;
        activeTour.overlay.querySelector('.tour-text').textContent  = step.text;
        activeTour.overlay.querySelector('[data-action="next"]').textContent = index === tourSteps.length - 1 ? 'Concluir' : 'Próximo';
        activeTour.currentStep = index;
    }

    function startTour() {
        if (!_entryCompleted) { window.switchView('entry'); return; }
        window.switchView('dashboard');
        const overlay = ensureTourElements();
        overlay.classList.remove('hidden');
        activeTour = { overlay, currentStep: 0 };
        showTourStep(0);
    }

    const tourOverlay = ensureTourElements();
    tourOverlay.addEventListener('click', event => {
        if (!activeTour) return;
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        if (action === 'skip') { localStorage.setItem(TOUR_STORAGE_KEY, 'true'); window.closeTour(); return; }
        const next = activeTour.currentStep + 1;
        if (next >= tourSteps.length) { localStorage.setItem(TOUR_STORAGE_KEY, 'true'); window.closeTour(); return; }
        showTourStep(next);
    });

    window.addEventListener('resize', () => { if (activeTour) showTourStep(activeTour.currentStep); });
    btnStartTour?.addEventListener('click', startTour);

    // ── Init ───────────────────────────────────────────────────────────────────
    if (typeof initDashboard === 'function') initDashboard();

    if (location.hash === '#demo') {
        setDemoUser('Demo AIDoc', 'Protótipo');
        completeEntry();
        window.switchView('dashboard');
    }
});
