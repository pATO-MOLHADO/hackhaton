/**
 * app.js - Main Application Controller
 * Handles view routing (SPA feel) and global initializations.
 */

const THEME_STORAGE_KEY = 'aidoc.theme.v1';
const TOUR_STORAGE_KEY = 'aidoc.tour.completed.v1';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ View Routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');

    function setAuthMessage(element, message, isSuccess = false) {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('success', isSuccess);
    }

    loginForm?.addEventListener('submit', event => {
        event.preventDefault();
        setAuthMessage(loginMessage, 'Tela de login pronta para integração com backend.', true);
    });

    registerForm?.addEventListener('submit', event => {
        event.preventDefault();
        setAuthMessage(registerMessage, 'Tela de cadastro pronta para integração com backend.', true);
    });
    const navItems = document.querySelectorAll('#navbar-nav .nav-item');
    const views = document.querySelectorAll('.app-content .view');

    function switchView(viewId) {
        // Update Nav Items
        navItems.forEach(item => {
            if (item.dataset.view === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Views
        views.forEach(view => {
            if (view.id === `view-${viewId}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        closeTour();
    }

    // Event Listeners for Top Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (viewId) {
                switchView(viewId);
            }
        });
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Global Action Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const btnNewAnalysis = document.getElementById('btn-new-analysis');
    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener('click', () => {
            switchView('analysis');
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Theme System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Product Tour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const btnStartTour = document.getElementById('btn-start-tour');
    let activeTour = null;

    const tourSteps = [
        {
            selector: '[data-tour="dashboard"]',
            title: 'Workspace',
            text: 'Este e seu painel principal para monitoramento e triagem em tempo real.'
        },
        {
            selector: '[data-tour="header"]',
            title: 'Acoes Rapidas',
            text: 'Aqui voce inicia uma nova analise e restaura o layout padrao.'
        },
        {
            selector: '[data-tour="widgets"]',
            title: 'Widgets Modulares',
            text: 'Arraste, redimensione e minimize widgets conforme seu fluxo clinico.'
        },
        {
            selector: '[data-tour="quick-analysis"]',
            title: 'Quick Analysis',
            text: 'Use este widget para ir direto para a tela de analise inteligente.'
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
                        <button class="btn btn-primary" data-action="next">Proximo</button>
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

        activeTour.overlay.querySelector('.tour-step-counter').textContent = `Passo ${index + 1} de ${tourSteps.length}`;
        activeTour.overlay.querySelector('.tour-title').textContent = step.title;
        activeTour.overlay.querySelector('.tour-text').textContent = step.text;

        const nextButton = activeTour.overlay.querySelector('[data-action="next"]');
        nextButton.textContent = index === tourSteps.length - 1 ? 'Concluir' : 'Proximo';
        activeTour.currentStep = index;
    }

    function startTour() {
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

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Initialize Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (typeof initDashboard === 'function') {
        initDashboard();
    }

    if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
        setTimeout(startTour, 600);
    }
});

