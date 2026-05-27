/**
 * app.js - Controlador Principal da Aplicação
 */

const THEME_STORAGE_KEY = 'aidoc.theme.v1';
const TOUR_STORAGE_KEY  = 'aidoc.tour.completed.v1';

// ─── Estado global ────────────────────────────────────────────────────────────
let _entryCompleted = false;
const _publicViews  = new Set(['entry', 'login', 'register']);

// Expõe switchView globalmente para outros módulos (patientStore, etc.)
window.switchView = function(viewId, options = {}) {
    if (!_entryCompleted && !_publicViews.has(viewId)) {
        viewId = 'entry';
    }

    document.querySelectorAll('#navbar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    document.querySelectorAll('.app-content .view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewId}`);
    });

    if (!options.keepTour) window.closeTour?.();
};

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
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

    document.getElementById('btn-new-analysis')?.addEventListener('click',   () => window.switchView('analysis'));
    document.getElementById('btn-quick-analysis')?.addEventListener('click', () => window.switchView('analysis'));

    // ── Login ──────────────────────────────────────────────────────────────────
    loginForm?.addEventListener('submit', e => {
        e.preventDefault();
        const email    = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            setAuthMessage(loginMessage, 'Preencha e-mail e senha para continuar.');
            return;
        }

        const displayName = email.split('@')[0].replace(/[._-]+/g, ' ');
        setDemoUser(displayName || 'Usuário AIDoc');
        completeEntry();
        setAuthMessage(loginMessage, 'Login validado. Abrindo workspace...', true);
        setTimeout(() => window.switchView('dashboard'), 450);
    });

    // ── Cadastro ───────────────────────────────────────────────────────────────
    registerForm?.addEventListener('submit', e => {
        e.preventDefault();
        const name            = document.getElementById('register-name').value.trim();
        const role            = document.getElementById('register-role').value.trim();
        const password        = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            setAuthMessage(registerMessage, 'As senhas precisam ser iguais.');
            return;
        }

        setDemoUser(name, role || 'Equipe clínica');
        completeEntry();
        setAuthMessage(registerMessage, 'Cadastro validado. Abrindo workspace...', true);
        setTimeout(() => window.switchView('dashboard'), 450);
    });

    // ── Tema ───────────────────────────────────────────────────────────────────
    const btnThemeToggle = document.getElementById('btn-theme-toggle');

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const isDark = theme === 'dark';
        if (btnThemeToggle) {
            btnThemeToggle.innerHTML = `<i data-feather="${isDark ? 'sun' : 'moon'}"></i>`;
            btnThemeToggle.title = isDark ? 'Tema claro' : 'Tema escuro';
            btnThemeToggle.setAttribute('aria-label', isDark ? 'Ativar tema claro' : 'Ativar tema escuro');
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
        { selector: '[data-tour="dashboard"]',     title: 'Workspace',         text: 'Este é seu painel principal para monitoramento e triagem em tempo real.' },
        { selector: '[data-tour="header"]',         title: 'Ações Rápidas',     text: 'Aqui você inicia uma nova análise e restaura o layout padrão.' },
        { selector: '[data-tour="widgets"]',        title: 'Widgets Modulares', text: 'Arraste, redimensione e minimize widgets conforme seu fluxo clínico.' },
        { selector: '[data-tour="quick-analysis"]', title: 'Análise Rápida',    text: 'Use este widget para ir direto para a tela de análise inteligente.' },
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
        const rect    = target.getBoundingClientRect();
        const padding = 8;

        const hl = activeTour.overlay.querySelector('.tour-highlight');
        hl.style.top    = `${rect.top    - padding}px`;
        hl.style.left   = `${rect.left   - padding}px`;
        hl.style.width  = `${rect.width  + padding * 2}px`;
        hl.style.height = `${rect.height + padding * 2}px`;

        activeTour.overlay.querySelector('.tour-step-counter').textContent = `Etapa ${index + 1} de ${tourSteps.length}`;
        activeTour.overlay.querySelector('.tour-title').textContent = step.title;
        activeTour.overlay.querySelector('.tour-text').textContent  = step.text;

        const nextBtn = activeTour.overlay.querySelector('[data-action="next"]');
        nextBtn.textContent = index === tourSteps.length - 1 ? 'Concluir' : 'Próximo';
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
