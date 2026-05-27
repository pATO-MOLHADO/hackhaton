/**
 * dashboard.js - Área de trabalho clínica modular.
 */

const DASHBOARD_STORAGE_KEY = 'aidoc.modularDashboard.v2';

function initDashboard() {
    renderDateHeader();
    renderCriticalExams();
    renderAIInsights();
    renderPatientFlow();
    renderRecentPatients();
    renderUpcomingReviews();
    renderFollowups();
    renderNotifications();
    initModularDashboard();
}

function renderDateHeader() {
    const el = document.getElementById('dashboard-date');
    if (!el) return;

    const today = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    el.textContent = `Hoje: ${today}. Prioridades, fluxo e IA organizados para leitura clínica rápida.`;
}

function patientInitials(name) {
    return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function renderTriageList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items.map((item, index) => `
        <div class="triage-item ${item.type}" style="animation: fadeIn 0.35s ease-out ${index * 0.05}s both;"
             ${item.patientId ? `data-patient-id="${item.patientId}" role="button" tabindex="0" title="Ver perfil de ${item.name}"` : ''}>
            <div class="triage-info">
                <div class="triage-avatar">${patientInitials(item.name)}</div>
                <div class="triage-details">
                    <div class="triage-name">${item.name} <span class="patient-id">${item.id}</span></div>
                    <div class="triage-reason">${item.reason}</div>
                    <div class="triage-time"><i data-feather="clock"></i>${item.time}</div>
                </div>
            </div>
            <div class="triage-actions">
                <button class="${item.type === 'critical' ? 'btn btn-primary' : 'icon-btn'}" title="${item.action}">
                    ${item.type === 'critical' ? item.action : '<i data-feather="check"></i>'}
                </button>
            </div>
        </div>
    `).join('');

    // Clique no card abre o perfil do paciente
    container.querySelectorAll('[data-patient-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            if (typeof openPatientProfile === 'function') {
                openPatientProfile(card.dataset.patientId);
            }
        });
    });
}

function renderCriticalExams() {
    const patientItems = getDashboardPatientItems().filter(item => item.type === 'critical' || item.evolution === 'piora').slice(0, 3);
    renderTriageList('triage-critical', patientItems.length ? patientItems : [
        { name: 'Roberto Silva', id: '#P-4592', time: '5 min', reason: 'Troponina elevada com risco cardíaco.', type: 'critical', action: 'Agir agora' },
        { name: 'Helena Duarte', id: '#P-4596', time: '12 min', reason: 'D-dímero alto e dispneia relatada.', type: 'critical', action: 'Priorizar' },
        { name: 'Julia Costa', id: '#P-4590', time: '45 min', reason: 'Glicemia 250 mg/dL aguardando retorno.', type: 'attention', action: 'Revisar' }
    ]);
}

function renderAIInsights() {
    const container = document.getElementById('global-insights');
    if (!container) return;
    const patients = typeof getAllPatientProfiles === 'function' ? getAllPatientProfiles() : [];
    const exams = patients.reduce((total, patient) => total + (patient.exames?.length || 0), 0);
    const worsening = patients.filter(patient => patient.estado_clinico === 'piora').length;

    const stats = [
        { label: 'Exames analisados', value: exams || '1.284', note: exams ? 'memória clínica local' : '+12% na semana', icon: 'activity' },
        { label: 'Pacientes acompanhados', value: patients.length || '4', note: patients.length ? 'perfis com histórico' : 'base demonstrativa', icon: 'users' },
        { label: 'Piora clínica', value: worsening || '2', note: worsening ? 'precisam revisão' : 'precisam de ação', icon: 'alert-triangle' }
    ];

    container.innerHTML = stats.map(stat => `
        <div class="stat-mini">
            <div class="stat-mini-label"><i data-feather="${stat.icon}"></i>${stat.label}</div>
            <div class="stat-mini-val">${stat.value}</div>
            <div class="stat-mini-note">${stat.note}</div>
        </div>
    `).join('');
}

function renderPatientFlow() {
    const container = document.getElementById('bar-chart');
    if (!container) return;

    const data = [
        ['Seg', 35], ['Ter', 42], ['Qua', 28], ['Qui', 50], ['Sex', 38], ['Sáb', 15], ['Dom', 8]
    ];
    const max = 50;

    container.innerHTML = `
        <div class="y-axis"><span>50</span><span>25</span><span>0</span></div>
        ${data.map(([label, value]) => `
            <div class="bar-group">
                <div class="bar" style="height:0%" data-height="${(value / max) * 100}%" title="${value} pacientes"></div>
                <div class="bar-label">${label}</div>
            </div>
        `).join('')}
    `;

    requestAnimationFrame(() => {
        container.querySelectorAll('.bar').forEach(bar => {
            bar.style.height = bar.dataset.height;
        });
    });
}

function renderRecentPatients() {
    const patientItems = getDashboardPatientItems().filter(item => item.type !== 'critical').slice(0, 4);
    renderTriageList('triage-routine', patientItems.length ? patientItems : [
        { name: 'Ricardo Mendes', id: '#P-4589', time: '2h', reason: 'Hemograma sem alterações relevantes.', type: 'routine', action: 'Aprovar' },
        { name: 'Fernanda Lima', id: '#P-4591', time: '3h', reason: 'Colesterol acima da meta individual.', type: 'attention', action: 'Revisar' },
        { name: 'Mariana Torres', id: '#P-4586', time: 'Ontem', reason: 'Retorno pós-consulta registrado.', type: 'routine', action: 'Aprovar' }
    ]);
}

function getDashboardPatientItems() {
    if (typeof getAllPatientProfiles !== 'function') return [];
    return getAllPatientProfiles().map(patient => {
        const latest = patient.exames?.[0] || {};
        const status = latest.nivel_atencao === 'critico' ? 'critical' : latest.nivel_atencao === 'atencao' ? 'attention' : 'routine';
        return {
            name: patient.nome,
            id: `#${patient.id.slice(0, 8).toUpperCase()}`,
            patientId: patient.id,
            time: latest.dateLabel || patient.updatedAt || 'Agora',
            reason: latest.comparacao_com_anterior || latest.resumo || 'Histórico clínico atualizado.',
            type: patient.estado_clinico === 'piora' ? 'critical' : status,
            action: patient.estado_clinico === 'piora' ? 'Priorizar' : 'Revisar',
            evolution: patient.estado_clinico
        };
    });
}

function renderUpcomingReviews() {
    const container = document.getElementById('upcoming-appointments');
    if (!container) return;

    const reviews = [
        ['14:30', 'Roberto Silva', 'Cardiologia urgente'],
        ['15:00', 'Dra. Marina Rocha', 'Discussão de caso'],
        ['16:15', 'Helena Duarte', 'Revisão de imagem']
    ];

    container.innerHTML = reviews.map(([time, name, context]) => `
        <div class="appointment-card">
            <div class="appt-icon"><i data-feather="calendar"></i></div>
            <div class="appt-info">
                <div class="appt-doc">${name}</div>
                <div class="appt-spec">${context}</div>
            </div>
            <div class="appt-time">${time}</div>
        </div>
    `).join('');
}

function renderFollowups() {
    const container = document.getElementById('followups-list');
    if (!container) return;

    container.innerHTML = [
        ['Maria Oliveira', 'Retorno de HbA1c em 7 dias'],
        ['Paulo Nunes', 'Confirmar adesão medicamentosa'],
        ['Livia Andrade', 'Enviar orientação pós-exame']
    ].map(([name, task]) => `
        <div class="compact-row">
            <span><strong>${name}</strong><small>${task}</small></span>
            <button class="icon-btn" title="Enviar"><i data-feather="send"></i></button>
        </div>
    `).join('');
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    container.innerHTML = [
        ['Novo laudo pronto', '3 exames foram classificados pela IA.'],
        ['Equipe de enfermagem', 'Solicitou revisão para leito 204.'],
        ['Sistema', 'Layout salvo automaticamente.']
    ].map(([title, body]) => `
        <div class="notification-row">
            <i data-feather="bell"></i>
            <span><strong>${title}</strong><small>${body}</small></span>
        </div>
    `).join('');
}

function initModularDashboard() {
    const grid = document.getElementById('modular-dashboard');
    if (!grid) return;

    const widgets = Array.from(grid.querySelectorAll('.widget'));
    let draggedWidget = null;

    applySavedLayout(grid, widgets);
    syncResizeControls(widgets);

    widgets.forEach(widget => {
        const header = widget.querySelector('.widget-header');
        header.setAttribute('draggable', 'true');

        header.addEventListener('dragstart', () => {
            draggedWidget = widget;
            widget.classList.add('dragging');
        });

        header.addEventListener('dragend', () => {
            widget.classList.remove('dragging');
            draggedWidget = null;
            saveDashboardLayout(grid);
        });

        widget.addEventListener('dragover', event => {
            event.preventDefault();
            if (!draggedWidget || draggedWidget === widget) return;
            widget.classList.add('drag-over');
        });

        widget.addEventListener('dragleave', () => widget.classList.remove('drag-over'));

        widget.addEventListener('drop', event => {
            event.preventDefault();
            widget.classList.remove('drag-over');
            if (!draggedWidget || draggedWidget === widget) return;

            const widgetsNow = Array.from(grid.querySelectorAll('.widget'));
            const targetIndex = widgetsNow.indexOf(widget);
            const draggedIndex = widgetsNow.indexOf(draggedWidget);
            grid.insertBefore(draggedWidget, draggedIndex < targetIndex ? widget.nextSibling : widget);
            saveDashboardLayout(grid);
        });

        widget.querySelectorAll('.resize-btn').forEach(button => {
            button.addEventListener('click', () => {
                setWidgetSize(widget, Number(button.dataset.size));
                syncResizeControls([widget]);
                saveDashboardLayout(grid);
            });
        });

        widget.querySelector('.minimize-btn')?.addEventListener('click', () => {
            widget.classList.toggle('minimized');
            const icon = widget.classList.contains('minimized') ? 'plus' : 'minus';
            widget.querySelector('.minimize-btn').innerHTML = `<i data-feather="${icon}"></i>`;
            refreshIcons();
            saveDashboardLayout(grid);
        });

        widget.querySelector('.expand-btn')?.addEventListener('click', () => {
            widget.classList.toggle('expanded');
            const icon = widget.classList.contains('expanded') ? 'minimize-2' : 'maximize-2';
            widget.querySelector('.expand-btn').innerHTML = `<i data-feather="${icon}"></i>`;
            setWidgetSize(widget, widget.classList.contains('expanded') ? 12 : Number(widget.dataset.col || widget.dataset.defaultCol || 6));
            syncResizeControls([widget]);
            refreshIcons();
            saveDashboardLayout(grid);
        });
    });

    document.getElementById('btn-reset-layout')?.addEventListener('click', () => {
        localStorage.removeItem(DASHBOARD_STORAGE_KEY);
        widgets
            .sort((a, b) => Number(a.dataset.defaultOrder) - Number(b.dataset.defaultOrder))
            .forEach(widget => {
                widget.classList.remove('minimized', 'expanded');
                setWidgetSize(widget, Number(widget.dataset.defaultCol || 6));
                grid.appendChild(widget);
            });
        syncResizeControls(widgets);
        refreshIcons();
    });

    refreshIcons();
}

function setWidgetSize(widget, size) {
    widget.dataset.col = String(size);
    widget.style.gridColumn = `span ${size}`;
}

function applySavedLayout(grid, widgets) {
    const saved = readSavedLayout();
    const byId = new Map(widgets.map(widget => [widget.id, widget]));
    const orderedIds = saved?.order || widgets.sort((a, b) => Number(a.dataset.defaultOrder) - Number(b.dataset.defaultOrder)).map(w => w.id);

    orderedIds.forEach(id => {
        const widget = byId.get(id);
        if (widget) grid.appendChild(widget);
    });

    widgets.forEach(widget => {
        if (!grid.contains(widget)) grid.appendChild(widget);

        const state = saved?.widgets?.[widget.id] || {};
        setWidgetSize(widget, Number(state.col || widget.dataset.defaultCol || 6));
        widget.classList.toggle('minimized', Boolean(state.minimized));
        widget.classList.toggle('expanded', Boolean(state.expanded));
    });
}

function saveDashboardLayout(grid) {
    const widgets = Array.from(grid.querySelectorAll('.widget'));
    const payload = {
        order: widgets.map(widget => widget.id),
        widgets: widgets.reduce((acc, widget) => {
            acc[widget.id] = {
                col: Number(widget.dataset.col || widget.dataset.defaultCol || 6),
                minimized: widget.classList.contains('minimized'),
                expanded: widget.classList.contains('expanded')
            };
            return acc;
        }, {})
    };

    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
}

function readSavedLayout() {
    try {
        return JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY));
    } catch (error) {
        return null;
    }
}

function syncResizeControls(widgets) {
    widgets.forEach(widget => {
        const col = Number(widget.dataset.col || widget.dataset.defaultCol || 6);
        widget.querySelectorAll('.resize-btn').forEach(button => {
            button.classList.toggle('active', Number(button.dataset.size) === col);
        });
    });
}

function refreshIcons() {
    if (typeof feather !== 'undefined') feather.replace();
}
