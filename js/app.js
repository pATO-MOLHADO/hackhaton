/**
 * app.js - Controlador Principal da Aplicação
 * Gerencia roteamento de views (SPA) e inicializações globais.
 */

const THEME_STORAGE_KEY = 'aidoc.theme.v1';
const TOUR_STORAGE_KEY = 'aidoc.tour.completed.v1';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const currentUserName = document.getElementById('current-user-name');
    const currentUserRole = document.getElementById('current-user-role');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    let entryCompleted = false;
    const publicViews = new Set(['entry', 'login', 'register']);

    document.body.classList.add('entry-required');

    function setAuthMessage(element, message, isSuccess = false) {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('success', isSuccess);
    }

    function getInitials(name) {
        return String(name || 'AIDoc')
            .trim()
            .split(/\s+/)
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    function setDemoUser(name, role = 'Equipe clínica') {
        if (currentUserName) currentUserName.textContent = name;
        if (currentUserRole) currentUserRole.textContent = role;
        if (currentUserAvatar) currentUserAvatar.textContent = getInitials(name);
    }

    function completeEntry() {
        entryCompleted = true;
        document.body.classList.remove('entry-required');
    }

    const navItems = document.querySelectorAll('#navbar-nav .nav-item');
    const views = document.querySelectorAll('.app-content .view');

    function switchView(viewId, options = {}) {
        if (!entryCompleted && !publicViews.has(viewId)) {
            setAuthMessage(loginMessage, '');
            setAuthMessage(registerMessage, '');
            viewId = 'entry';
        }

        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        views.forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewId}`);
        });

        if (!options.keepTour) closeTour();
    }

    loginForm?.addEventListener('submit', event => {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            setAuthMessage(loginMessage, 'Preencha e-mail e senha para continuar.');
            return;
        }

        const displayName = email.split('@')[0].replace(/[._-]+/g, ' ');
        setDemoUser(displayName || 'Usuário AIDoc');
        completeEntry();
        setAuthMessage(loginMessage, 'Login validado. Abrindo workspace...', true);
        setTimeout(() => switchView('dashboard'), 450);
    });

    registerForm?.addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const role = document.getElementById('register-role').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            setAuthMessage(registerMessage, 'As senhas precisam ser iguais.');
            return;
        }

        setDemoUser(name, role || 'Equipe clínica');
        completeEntry();
        setAuthMessage(registerMessage, 'Cadastro validado. Abrindo workspace...', true);
        setTimeout(() => switchView('dashboard'), 450);
    });

    document.querySelectorAll('[data-view-target]').forEach(button => {
        button.addEventListener('click', () => switchView(button.dataset.viewTarget));
    });

    document.querySelectorAll('[data-demo-access]').forEach(button => {
        button.addEventListener('click', () => {
            setDemoUser('Demo AIDoc', 'Protótipo');
            completeEntry();
            switchView('dashboard');
        });
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (viewId) switchView(viewId);
        });
    });

    // Botões de ação global
    document.getElementById('btn-new-analysis')?.addEventListener('click', () => switchView('analysis'));
    document.getElementById('btn-quick-analysis')?.addEventListener('click', () => switchView('analysis'));

    // Sistema de Tema
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const body = document.body;

    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        const isDark = theme === 'dark';
        if (btnThemeToggle) {
            btnThemeToggle.innerHTML = `<i data-feather="${isDark ? 'sun' : 'moon'}"></i>`;
            btnThemeToggle.title = isDark ? 'Tema claro' : 'Tema escuro';
            btnThemeToggle.setAttribute('aria-label', isDark ? 'Ativar tema claro' : 'Ativar tema escuro');
        }
        if (typeof feather !== 'undefined') feather.replace();
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    let currentTheme = loadTheme();
    applyTheme(currentTheme);

    btnThemeToggle?.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        applyTheme(currentTheme);
    });

    // Tour do Produto
    const btnStartTour = document.getElementById('btn-start-tour');
    let activeTour = null;

    const tourSteps = [
        {
            selector: '[data-tour="dashboard"]',
            title: 'Workspace',
            text: 'Este é seu painel principal para monitoramento e triagem em tempo real.'
        },
        {
            selector: '[data-tour="header"]',
            title: 'Ações Rápidas',
            text: 'Aqui você inicia uma nova análise e restaura o layout padrão.'
        },
        {
            selector: '[data-tour="widgets"]',
            title: 'Widgets Modulares',
            text: 'Arraste, redimensione e minimize widgets conforme seu fluxo clínico.'
        },
        {
            selector: '[data-tour="quick-analysis"]',
            title: 'Análise Rápida',
            text: 'Use este widget para ir direto para a tela de análise inteligente.'
        },
        {
            selector: '#btn-theme-toggle',
            title: 'Tema Claro e Escuro',
            text: 'Troque entre modo claro e escuro com um clique.'
        }
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
                </div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function closeTour() {
        if (!activeTour) return;
        activeTour.overlay.classList.add('hidden');
        activeTour = null;
    }

    function showTourStep(index) {
        if (!activeTour) return;
        const step = tourSteps[index];
        const target = document.querySelector(step.selector);
        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = target.getBoundingClientRect();
        const padding = 8;

        const highlight = activeTour.overlay.querySelector('.tour-highlight');
        highlight.style.top = `${rect.top - padding}px`;
        highlight.style.left = `${rect.left - padding}px`;
        highlight.style.width = `${rect.width + padding * 2}px`;
        highlight.style.height = `${rect.height + padding * 2}px`;

        activeTour.overlay.querySelector('.tour-step-counter').textContent = `Etapa ${index + 1} de ${tourSteps.length}`;
        activeTour.overlay.querySelector('.tour-title').textContent = step.title;
        activeTour.overlay.querySelector('.tour-text').textContent = step.text;

        const nextButton = activeTour.overlay.querySelector('[data-action="next"]');
        nextButton.textContent = index === tourSteps.length - 1 ? 'Concluir' : 'Próximo';
        activeTour.currentStep = index;
    }

    function startTour() {
        if (!entryCompleted) {
            switchView('entry');
            return;
        }

        switchView('dashboard');
        const overlay = ensureTourElements();
        overlay.classList.remove('hidden');
        activeTour = { overlay, currentStep: 0 };
        showTourStep(0);
    }

    const tourOverlay = ensureTourElements();
    tourOverlay.addEventListener('click', (event) => {
        if (!activeTour) return;
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        if (action === 'skip') {
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
            closeTour();
            return;
        }

        const nextIndex = activeTour.currentStep + 1;
        if (nextIndex >= tourSteps.length) {
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
            closeTour();
            return;
        }

        showTourStep(nextIndex);
    });

    window.addEventListener('resize', () => {
        if (activeTour) showTourStep(activeTour.currentStep);
    });

    btnStartTour?.addEventListener('click', startTour);

    if (typeof initDashboard === 'function') {
        initDashboard();
    }

    if (location.hash === '#demo') {
        setDemoUser('Demo AIDoc', 'Protótipo');
        completeEntry();
        switchView('dashboard');
    }
});
