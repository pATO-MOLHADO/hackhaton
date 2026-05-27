/**
 * app.js - Main Application Controller
 * Handles view routing (SPA feel) and global initializations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // View Routing Logic
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const views = document.querySelectorAll('.views-container .view');

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
    }

    // Event Listeners for Sidebar Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (viewId) {
                switchView(viewId);
            }
        });
    });

    // Global Action Buttons
    const btnNewAnalysis = document.getElementById('btn-new-analysis');
    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener('click', () => {
            switchView('analysis');
        });
    }

    // Initialize Dashboard
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
});
