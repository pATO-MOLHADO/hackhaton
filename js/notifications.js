/**
 * notifications.js — Central de Alertas Clínicos AIDoc
 * Drawer lateral com notificações reais, geradas a partir dos pacientes analisados.
 */

const NOTIF_KEY = 'aidoc.notifications.v1';

// ── Geração de notificações ────────────────────────────────────────────────────

function _generateNotifications() {
    const stored = _loadNotifications();
    const patients = typeof getAllPatientProfiles === 'function' ? getAllPatientProfiles() : [];

    const generated = [];

    patients.forEach(patient => {
        const latest = patient.exames?.[0];
        if (!latest) return;

        const id = `patient-${patient.id}-${latest.nivel_atencao}`;
        if (stored.find(n => n.id === id)) return; // já existe

        if (latest.nivel_atencao === 'critico') {
            generated.push({
                id,
                type: 'critical',
                icon: 'alert-octagon',
                title: `⚠️ Alerta crítico — ${patient.nome}`,
                body: latest.resumo?.slice(0, 100) || 'Marcadores críticos detectados pela IA.',
                time: latest.dateLabel || 'Agora',
                read: false,
                action: { label: 'Ver perfil', patientId: patient.id }
            });
        } else if (latest.nivel_atencao === 'atencao') {
            generated.push({
                id,
                type: 'warning',
                icon: 'alert-triangle',
                title: `Atenção requerida — ${patient.nome}`,
                body: latest.resumo?.slice(0, 100) || 'Valores alterados identificados.',
                time: latest.dateLabel || 'Agora',
                read: false,
                action: { label: 'Ver perfil', patientId: patient.id }
            });
        }
    });

    const base = [
        {
            id: 'sys-deepseek-online',
            type: 'info',
            icon: 'cpu',
            title: 'IA DeepSeek conectada',
            body: 'Motor de análise clínica operando normalmente.',
            time: 'Hoje',
            read: false,
            action: null
        },
        {
            id: 'sys-tip-upload',
            type: 'tip',
            icon: 'file-plus',
            title: 'Dica: envie PDFs de laudos',
            body: 'Arraste um PDF diretamente na tela de Análise IA para extração automática de texto.',
            time: 'Hoje',
            read: false,
            action: { label: 'Ir para análise', view: 'analysis' }
        },
        {
            id: 'sys-tip-chat',
            type: 'tip',
            icon: 'message-circle',
            title: 'Dica: use o chat do exame',
            body: 'Após analisar um laudo, pergunte à IA sobre condutas, riscos e próximos passos.',
            time: 'Hoje',
            read: false,
            action: null
        }
    ];

    // Mescla: geradas primeiro, depois base que ainda não existem
    const all = [...stored];
    [...generated, ...base].forEach(n => {
        if (!all.find(x => x.id === n.id)) all.unshift(n);
    });

    _saveNotifications(all);
    return all;
}

function _loadNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || []; } catch { return []; }
}

function _saveNotifications(list) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, 40)));
}

function _unreadCount() {
    return _loadNotifications().filter(n => !n.read).length;
}

// ── Badge do sino ──────────────────────────────────────────────────────────────

function updateNotifBadge() {
    const badge = document.querySelector('.notif-badge');
    const count = _unreadCount();
    if (!badge) return;
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Drawer ─────────────────────────────────────────────────────────────────────

function _ensureDrawer() {
    if (document.getElementById('notif-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'notif-drawer';
    drawer.innerHTML = `
        <div id="notif-backdrop"></div>
        <aside id="notif-panel">
            <div class="notif-header">
                <div class="notif-header-left">
                    <i data-feather="bell"></i>
                    <span>Central de Alertas</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button id="notif-mark-all" class="btn btn-text" style="font-size:12px;padding:4px 10px;">
                        Marcar todas como lidas
                    </button>
                    <button id="notif-close" class="icon-btn" style="width:32px;height:32px;">
                        <i data-feather="x"></i>
                    </button>
                </div>
            </div>
            <div id="notif-list"></div>
        </aside>
    `;
    document.body.appendChild(drawer);

    document.getElementById('notif-backdrop').addEventListener('click', closeNotifDrawer);
    document.getElementById('notif-close').addEventListener('click', closeNotifDrawer);
    document.getElementById('notif-mark-all').addEventListener('click', () => {
        const list = _loadNotifications().map(n => ({ ...n, read: true }));
        _saveNotifications(list);
        updateNotifBadge();
        _renderDrawerList();
    });

    if (typeof feather !== 'undefined') feather.replace();
}

function openNotifDrawer() {
    _ensureDrawer();
    _generateNotifications();
    _renderDrawerList();
    updateNotifBadge();
    document.getElementById('notif-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeNotifDrawer() {
    document.getElementById('notif-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
}

function _renderDrawerList() {
    const container = document.getElementById('notif-list');
    if (!container) return;

    const list = _loadNotifications();

    if (!list.length) {
        container.innerHTML = `
            <div class="notif-empty">
                <i data-feather="check-circle"></i>
                <p>Nenhuma notificação</p>
                <small>Tudo em ordem por aqui.</small>
            </div>`;
        if (typeof feather !== 'undefined') feather.replace();
        return;
    }

    const typeColors = {
        critical: 'var(--color-danger)',
        warning:  'var(--color-warning)',
        info:     'var(--color-primary)',
        tip:      '#8b5cf6'
    };

    container.innerHTML = list.map(n => `
        <div class="notif-item ${n.read ? 'read' : 'unread'} notif-type-${n.type}" data-id="${n.id}">
            <div class="notif-icon-wrap" style="background:${typeColors[n.type]}22; color:${typeColors[n.type]}">
                <i data-feather="${n.icon}"></i>
            </div>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-text">${n.body}</div>
                <div class="notif-footer">
                    <span class="notif-time"><i data-feather="clock"></i>${n.time}</span>
                    ${n.action ? `<button class="btn btn-text notif-action-btn" style="font-size:12px;padding:2px 8px;" data-action='${JSON.stringify(n.action)}'>${n.action.label}</button>` : ''}
                </div>
            </div>
            ${!n.read ? `<div class="notif-dot"></div>` : ''}
        </div>
    `).join('');

    if (typeof feather !== 'undefined') feather.replace();

    // Marcar como lida ao clicar
    container.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const list = _loadNotifications().map(n => n.id === id ? { ...n, read: true } : n);
            _saveNotifications(list);
            item.classList.replace('unread', 'read');
            item.querySelector('.notif-dot')?.remove();
            updateNotifBadge();
        });
    });

    // Botões de ação
    container.querySelectorAll('.notif-action-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const action = JSON.parse(btn.dataset.action);
            closeNotifDrawer();
            if (action.view && typeof window.switchView === 'function') {
                window.switchView(action.view);
            }
            if (action.patientId && typeof openPatientProfile === 'function') {
                window.switchView('patients');
                setTimeout(() => openPatientProfile(action.patientId), 300);
            }
        });
    });
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Substitui o botão de sino existente
    const bellBtn = document.querySelector('.icon-btn .feather-bell, .icon-btn [data-feather="bell"]');
    const bellParent = bellBtn?.closest('.icon-btn');

    if (bellParent) {
        // Troca o badge estático pelo dinâmico
        const staticBadge = bellParent.querySelector('.badge');
        if (staticBadge) staticBadge.remove();

        const badge = document.createElement('span');
        badge.className = 'badge notif-badge';
        badge.style.display = 'none';
        bellParent.appendChild(badge);

        bellParent.addEventListener('click', openNotifDrawer);
    }

    _generateNotifications();
    updateNotifBadge();

    // Atualiza badge quando novos exames são analisados
    window.addEventListener('aidoc:exam-analyzed', () => {
        _generateNotifications();
        updateNotifBadge();
    });
});
