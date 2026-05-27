/**
 * patientStore.js - Memória clínica local do AIDoc.
 * Mantém perfis, exames, laudos IA e linha do tempo no localStorage.
 */

const AIDOC_PATIENTS_KEY = 'aidoc.patientProfiles.v1';
let selectedPatientKey = null;

// ─── Utilitários ────────────────────────────────────────────────────────────

function normalizePatientKey(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'paciente-sem-nome';
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function patientInitials(name) {
    return String(name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Leitura / Escrita ───────────────────────────────────────────────────────

function readPatientProfiles() {
    try { return JSON.parse(localStorage.getItem(AIDOC_PATIENTS_KEY) || '{}'); }
    catch { return {}; }
}

function writePatientProfiles(profiles) {
    localStorage.setItem(AIDOC_PATIENTS_KEY, JSON.stringify(profiles));
}

function getPatientProfile(name) {
    return readPatientProfiles()[normalizePatientKey(name)] || null;
}

function getAllPatientProfiles() {
    return Object.values(readPatientProfiles())
        .sort((a, b) => String(b.updatedAtISO || '').localeCompare(String(a.updatedAtISO || '')));
}

// ─── Payload contextual para a IA ───────────────────────────────────────────

function buildAIHistory(profile) {
    return (profile?.exames || []).slice(0, 8).map(exam => ({
        data: exam.dateISO,
        resumo: exam.resumo,
        nivel_atencao: exam.nivel_atencao,
        evolucao_clinica: exam.evolucao_clinica,
        comparacao_com_anterior: exam.comparacao_com_anterior,
        valores_alterados: exam.valores_alterados || [],
        recomendacoes: exam.recomendacoes || ''
    }));
}

function buildContextualAnalysisPayload(formData) {
    const profile = getPatientProfile(formData.nome_paciente);
    const history = buildAIHistory(profile);

    return {
        ...formData,
        // Histórico completo dos últimos 8 exames para a IA comparar
        historico: history,
        // Resumo consolidado de toda a trajetória clínica
        resumo_historico_atual: profile?.resumo_historico || '',
        // Última evolução registrada para a IA contextualizar tendência
        ultima_evolucao_clinica: profile?.estado_clinico || 'sem_historico',
        // Condições crônicas acumuladas ao longo dos atendimentos
        condicoes_historicas: profile?.condicoes || formData.condicoes || '',
        // Total de exames anteriores (ajuda a IA calibrar a análise)
        total_exames_anteriores: history.length,
        // Último nível de atenção registrado
        ultimo_nivel_atencao: profile?.exames?.[0]?.nivel_atencao || 'sem_historico'
    };
}

// ─── Salvar análise ──────────────────────────────────────────────────────────

function savePatientAnalysis(requestData, resultData) {
    const profiles = readPatientProfiles();
    const key = normalizePatientKey(requestData.nome_paciente);
    const previous = profiles[key] || {
        id: key,
        nome: requestData.nome_paciente,
        idade: requestData.idade,
        condicoes: requestData.condicoes || '',
        estado_clinico: 'sem_historico',
        resumo_historico: '',
        exames: []
    };

    const entry = {
        id: `exam-${Date.now()}`,
        dateISO: new Date().toISOString().slice(0, 10),
        dateLabel: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        texto: requestData.texto,
        resumo: resultData.resumo || 'Laudo analisado pela IA.',
        nivel_atencao: (resultData.nivel_atencao || 'normal').toLowerCase(),
        evolucao_clinica: (resultData.evolucao_clinica || 'estavel').toLowerCase(),
        resumo_historico: resultData.resumo_historico || resultData.resumo || '',
        comparacao_com_anterior: resultData.comparacao_com_anterior || 'Primeiro exame registrado para este paciente.',
        valores_alterados: resultData.valores_alterados || [],
        recomendacoes: resultData.recomendacoes || ''
    };

    const updated = {
        ...previous,
        nome: requestData.nome_paciente,
        idade: requestData.idade,
        condicoes: requestData.condicoes || previous.condicoes || '',
        estado_clinico: entry.evolucao_clinica,
        resumo_historico: entry.resumo_historico,
        updatedAt: entry.dateLabel,
        updatedAtISO: new Date().toISOString(),
        exames: [entry, ...(previous.exames || [])].slice(0, 30)
    };

    profiles[key] = updated;
    selectedPatientKey = key;
    writePatientProfiles(profiles);
    renderPatientProfiles();
    return updated;
}

// ─── Helpers visuais ─────────────────────────────────────────────────────────

function getEvolutionMeta(evolution) {
    const map = {
        melhora: { label: 'Melhora', icon: 'arrow-up-right', className: 'positive', symbol: '↑' },
        piora:   { label: 'Piora',   icon: 'arrow-down-right', className: 'negative', symbol: '↓' },
        estavel: { label: 'Estável', icon: 'arrow-right',      className: 'stable',   symbol: '→' }
    };
    return map[evolution] || map.estavel;
}

function getAttentionLabel(level) {
    return { normal: 'Normal', atencao: 'Atenção', critico: 'Crítico' }[level] || 'Normal';
}

// ─── Navegar para paciente específico ────────────────────────────────────────

function openPatientProfile(patientId) {
    selectedPatientKey = patientId;
    if (typeof window.switchView === 'function') {
        window.switchView('patients');
    } else {
        document.querySelectorAll('.app-content .view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-patients')?.classList.add('active');
    }
    renderPatientProfiles();
}

// Expõe globalmente para uso no dashboard
window.openPatientProfile = openPatientProfile;

// ─── Renderização da lista de pacientes ──────────────────────────────────────

function renderPatientProfiles() {
    const list = document.getElementById('patient-list');
    const profilePanel = document.getElementById('patient-profile');
    if (!list || !profilePanel) return;

    const patients = getAllPatientProfiles();

    if (!patients.length) {
        list.innerHTML = `
            <div class="patient-empty-list">
                <i data-feather="users"></i>
                <p>Nenhum paciente salvo ainda.</p>
                <small>Analise um exame para criar o perfil automaticamente.</small>
            </div>`;
        profilePanel.innerHTML = `
            <div class="patient-empty-state">
                <i data-feather="user-plus"></i>
                <h3>Nenhum histórico clínico ainda</h3>
                <p>Analise um exame para criar automaticamente o perfil clínico do paciente.</p>
            </div>`;
        refreshIcons();
        return;
    }

    if (!selectedPatientKey || !patients.some(p => p.id === selectedPatientKey)) {
        selectedPatientKey = patients[0].id;
    }

    list.innerHTML = patients.map(patient => {
        const latest = patient.exames?.[0];
        const evolution = getEvolutionMeta(patient.estado_clinico);
        const isActive = patient.id === selectedPatientKey;
        const isCritical = patient.estado_clinico === 'piora' || latest?.nivel_atencao === 'critico';
        return `
            <button class="patient-list-item ${isActive ? 'active' : ''} ${isCritical ? 'is-critical' : ''}"
                    data-patient-id="${patient.id}"
                    title="Ver perfil de ${escapeHTML(patient.nome)}">
                <span class="patient-avatar ${isCritical ? 'avatar-critical' : ''}">${patientInitials(patient.nome)}</span>
                <span class="patient-list-info">
                    <strong>${escapeHTML(patient.nome)}</strong>
                    <small>${escapeHTML(String(patient.idade || '--'))} anos · ${latest ? latest.dateLabel : 'Sem laudos'}</small>
                </span>
                <b class="evolution-pill ${evolution.className}">${evolution.symbol}</b>
            </button>`;
    }).join('');

    list.querySelectorAll('[data-patient-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedPatientKey = btn.dataset.patientId;
            renderPatientProfiles();
        });
    });

    const profile = patients.find(p => p.id === selectedPatientKey);
    if (profile) renderPatientProfileDetail(profilePanel, profile);
    refreshIcons();
}

// ─── Renderização do perfil detalhado ────────────────────────────────────────

function renderPatientProfileDetail(container, profile) {
    const latest = profile.exames?.[0];
    const evolution = getEvolutionMeta(profile.estado_clinico);
    const examCount = profile.exames?.length || 0;
    const isCritical = latest?.nivel_atencao === 'critico' || profile.estado_clinico === 'piora';

    // Tendência: últimos 3 exames
    const trend = (profile.exames || []).slice(0, 3).map(e => {
        const m = getEvolutionMeta(e.evolucao_clinica);
        return `<span class="trend-dot ${m.className}" title="${e.dateLabel}: ${m.label}">${m.symbol}</span>`;
    }).join('');

    // Valores alterados do último exame
    const alteredHTML = latest?.valores_alterados?.length
        ? latest.valores_alterados.map(v => {
            const parts = v.split(':');
            const name = parts[0]?.trim() || v;
            const val = parts[1]?.trim() || '';
            const isHigh = val.toLowerCase().includes('alto') || val.toLowerCase().includes('acima') || val.toLowerCase().includes('elevad');
            const isLow = val.toLowerCase().includes('baixo') || val.toLowerCase().includes('abaixo');
            const cls = isHigh ? 'val-high' : isLow ? 'val-low' : '';
            return `<div class="altered-item">
                <span class="altered-item-name">${escapeHTML(name)}</span>
                <span class="altered-item-val ${cls}">${escapeHTML(val)}</span>
            </div>`;
        }).join('')
        : `<p class="text-muted" style="font-size:13px;">Nenhum valor alterado no último exame.</p>`;

    container.innerHTML = `
        <!-- Cabeçalho do perfil -->
        <div class="profile-summary-card ${isCritical ? 'is-alert' : ''}">
            <div class="profile-header-left">
                <div class="profile-avatar-large ${isCritical ? 'avatar-critical' : ''}">${patientInitials(profile.nome)}</div>
                <div>
                    <div class="profile-eyebrow">Perfil clínico ativo</div>
                    <h2>${escapeHTML(profile.nome)}</h2>
                    <p>${escapeHTML(String(profile.idade || '--'))} anos · ${escapeHTML(profile.condicoes || 'Condições não informadas')}</p>
                    <div class="profile-trend">
                        <span class="trend-label">Tendência:</span>
                        ${trend || '<span class="text-muted">—</span>'}
                    </div>
                </div>
            </div>
            <div class="profile-status">
                <span class="evolution-pill ${evolution.className}">
                    <i data-feather="${evolution.icon}"></i>${evolution.label}
                </span>
                <span class="status-badge ${latest?.nivel_atencao || 'normal'}">${getAttentionLabel(latest?.nivel_atencao)}</span>
                <button class="btn btn-primary btn-sm" id="btn-new-exam-for-patient"
                        data-patient-name="${escapeHTML(profile.nome)}"
                        data-patient-age="${escapeHTML(String(profile.idade || ''))}"
                        data-patient-conditions="${escapeHTML(profile.condicoes || '')}">
                    <i data-feather="plus"></i> Novo Exame
                </button>
            </div>
        </div>

        <!-- Métricas rápidas -->
        <div class="profile-metrics">
            <div>
                <strong>${examCount}</strong>
                <span>exames no histórico</span>
            </div>
            <div>
                <strong>${latest?.dateLabel || '--'}</strong>
                <span>última análise</span>
            </div>
            <div>
                <strong>${getAttentionLabel(latest?.nivel_atencao)}</strong>
                <span>atenção atual</span>
            </div>
            <div>
                <strong>${escapeHTML(String(profile.idade || '--'))}</strong>
                <span>anos</span>
            </div>
        </div>

        <!-- Resumo histórico da IA -->
        <div class="clinical-section">
            <div class="clinical-section-title">
                <i data-feather="cpu" style="width:13px;height:13px;"></i>
                Resumo histórico gerado pela IA
            </div>
            <div class="clinical-history-summary">
                ${escapeHTML(profile.resumo_historico || 'Aguardando consolidação do histórico pela IA.')}
            </div>
        </div>

        <!-- Último laudo: valores alterados -->
        <div class="clinical-section">
            <div class="clinical-section-title">Valores alterados no último exame</div>
            <div class="altered-list">${alteredHTML}</div>
        </div>

        <!-- Recomendações do último exame -->
        ${latest?.recomendacoes ? `
        <div class="clinical-section">
            <div class="clinical-section-title">Recomendações do último laudo</div>
            <div class="clinical-history-summary">${escapeHTML(latest.recomendacoes)}</div>
        </div>` : ''}

        <!-- Linha do tempo + laudos -->
        <div class="patient-detail-grid">
            <div class="clinical-section">
                <div class="clinical-section-title">Linha do tempo clínica</div>
                <div class="clinical-timeline">
                    ${(profile.exames || []).map(exam => {
                        const em = getEvolutionMeta(exam.evolucao_clinica);
                        return `
                        <article class="timeline-item ${exam.nivel_atencao === 'critico' || exam.evolucao_clinica === 'piora' ? 'is-alert' : ''}">
                            <div class="timeline-marker ${em.className}">${em.symbol}</div>
                            <div>
                                <div class="timeline-topline">
                                    <strong>${escapeHTML(exam.dateLabel)}</strong>
                                    <span class="status-badge ${exam.nivel_atencao}">${getAttentionLabel(exam.nivel_atencao)}</span>
                                </div>
                                <p>${escapeHTML(exam.resumo)}</p>
                                <small>${escapeHTML(exam.comparacao_com_anterior)}</small>
                            </div>
                        </article>`;
                    }).join('')}
                </div>
            </div>

            <div class="clinical-section">
                <div class="clinical-section-title">Últimos laudos IA</div>
                <div class="exam-card-list">
                    ${(profile.exames || []).slice(0, 5).map(exam => `
                        <article class="exam-history-card">
                            <div>
                                <strong>${escapeHTML(exam.dateLabel)}</strong>
                                <span class="status-badge ${exam.nivel_atencao}">${getAttentionLabel(exam.nivel_atencao)}</span>
                            </div>
                            <p>${escapeHTML(exam.resumo)}</p>
                            ${exam.recomendacoes ? `<small style="color:var(--color-text-muted);margin-top:6px;display:block;">${escapeHTML(exam.recomendacoes)}</small>` : ''}
                        </article>`).join('')}
                </div>
            </div>
        </div>
    `;

    // Botão "Novo Exame" preenche o formulário de análise com dados do paciente
    container.querySelector('#btn-new-exam-for-patient')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        if (typeof window.switchView === 'function') window.switchView('analysis');

        setTimeout(() => {
            const nameField = document.getElementById('patient-name');
            const ageField  = document.getElementById('patient-age');
            const condField = document.getElementById('patient-conditions');
            if (nameField) nameField.value = btn.dataset.patientName;
            if (ageField)  ageField.value  = btn.dataset.patientAge;
            if (condField) condField.value = btn.dataset.patientConditions;
            // Limpa resultado anterior
            document.getElementById('results-content')?.classList.add('hidden');
            document.getElementById('results-empty')?.classList.remove('hidden');
            document.getElementById('exam-text')?.focus();
        }, 150);
    });

    refreshIcons();
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    renderPatientProfiles();

    document.getElementById('btn-clear-patient-history')?.addEventListener('click', () => {
        if (!confirm('Limpar todo o histórico clínico salvo neste navegador?')) return;
        localStorage.removeItem(AIDOC_PATIENTS_KEY);
        localStorage.removeItem('aidoc_history');
        selectedPatientKey = null;
        renderPatientProfiles();
        if (typeof initDashboard === 'function') initDashboard();
    });
});
