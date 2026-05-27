/**
 * patientStore.js - Local clinical memory for AIDoc.
 * Keeps patient profiles, exams, AI reports, timelines and trends in localStorage.
 */

const AIDOC_PATIENTS_KEY = 'aidoc.patientProfiles.v1';
let selectedPatientKey = null;

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
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function readPatientProfiles() {
    try {
        return JSON.parse(localStorage.getItem(AIDOC_PATIENTS_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function writePatientProfiles(profiles) {
    localStorage.setItem(AIDOC_PATIENTS_KEY, JSON.stringify(profiles));
}

function getPatientProfile(name) {
    const profiles = readPatientProfiles();
    return profiles[normalizePatientKey(name)] || null;
}

function buildAIHistory(profile) {
    return (profile?.exames || []).slice(0, 8).map(exam => ({
        data: exam.dateISO,
        resumo: exam.resumo,
        nivel_atencao: exam.nivel_atencao,
        evolucao_clinica: exam.evolucao_clinica,
        comparacao_com_anterior: exam.comparacao_com_anterior
    }));
}

function buildContextualAnalysisPayload(formData) {
    const profile = getPatientProfile(formData.nome_paciente);

    return {
        ...formData,
        historico: buildAIHistory(profile),
        resumo_historico_atual: profile?.resumo_historico || '',
        ultima_evolucao_clinica: profile?.estado_clinico || 'sem_historico'
    };
}

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

function getAllPatientProfiles() {
    return Object.values(readPatientProfiles())
        .sort((a, b) => String(b.updatedAtISO || '').localeCompare(String(a.updatedAtISO || '')));
}

function getEvolutionMeta(evolution) {
    const map = {
        melhora: { label: 'Melhora', icon: 'arrow-up-right', className: 'positive', symbol: '↑' },
        piora: { label: 'Piora', icon: 'arrow-down-right', className: 'negative', symbol: '↓' },
        estavel: { label: 'Estável', icon: 'arrow-right', className: 'stable', symbol: '→' }
    };
    return map[evolution] || map.estavel;
}

function getAttentionLabel(level) {
    const map = { normal: 'Normal', atencao: 'Atenção', critico: 'Crítico' };
    return map[level] || 'Normal';
}

function renderPatientProfiles() {
    const list = document.getElementById('patient-list');
    const profilePanel = document.getElementById('patient-profile');
    if (!list || !profilePanel) return;

    const patients = getAllPatientProfiles();
    if (!patients.length) {
        list.innerHTML = '<p class="text-muted">Nenhum paciente salvo.</p>';
        profilePanel.innerHTML = `
            <div class="patient-empty-state">
                <i data-feather="user-plus"></i>
                <h3>Nenhum histórico clínico ainda</h3>
                <p>Analise um exame para criar automaticamente o perfil clínico do paciente.</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    if (!selectedPatientKey || !patients.some(patient => patient.id === selectedPatientKey)) {
        selectedPatientKey = patients[0].id;
    }

    list.innerHTML = patients.map(patient => {
        const latest = patient.exames?.[0];
        const evolution = getEvolutionMeta(patient.estado_clinico);
        return `
            <button class="patient-list-item ${patient.id === selectedPatientKey ? 'active' : ''}" data-patient-id="${patient.id}">
                <span class="patient-avatar">${patientInitials(patient.nome)}</span>
                <span>
                    <strong>${escapeHTML(patient.nome)}</strong>
                    <small>${latest ? latest.dateLabel : 'Sem laudos'}</small>
                </span>
                <b class="evolution-pill ${evolution.className}">${evolution.symbol}</b>
            </button>
        `;
    }).join('');

    list.querySelectorAll('[data-patient-id]').forEach(button => {
        button.addEventListener('click', () => {
            selectedPatientKey = button.dataset.patientId;
            renderPatientProfiles();
        });
    });

    const profile = patients.find(patient => patient.id === selectedPatientKey);
    renderPatientProfileDetail(profilePanel, profile);
    refreshIcons();
}

function renderPatientProfileDetail(container, profile) {
    const latest = profile.exames?.[0];
    const evolution = getEvolutionMeta(profile.estado_clinico);
    const examCount = profile.exames?.length || 0;

    container.innerHTML = `
        <div class="profile-summary-card ${latest?.nivel_atencao === 'critico' || profile.estado_clinico === 'piora' ? 'is-alert' : ''}">
            <div>
                <div class="profile-eyebrow">Perfil clínico ativo</div>
                <h2>${escapeHTML(profile.nome)}</h2>
                <p>${escapeHTML(profile.idade || '--')} anos · ${escapeHTML(profile.condicoes || 'Condições não informadas')}</p>
            </div>
            <div class="profile-status">
                <span class="evolution-pill ${evolution.className}"><i data-feather="${evolution.icon}"></i>${evolution.label}</span>
                <span class="status-badge ${latest?.nivel_atencao || 'normal'}">${getAttentionLabel(latest?.nivel_atencao)}</span>
            </div>
        </div>

        <div class="profile-metrics">
            <div><strong>${examCount}</strong><span>exames no histórico</span></div>
            <div><strong>${latest?.dateLabel || '--'}</strong><span>última análise</span></div>
            <div><strong>${getAttentionLabel(latest?.nivel_atencao)}</strong><span>atenção atual</span></div>
        </div>

        <div class="clinical-section">
            <div class="clinical-section-title">Resumo histórico contínuo</div>
            <div class="clinical-history-summary">${escapeHTML(profile.resumo_historico || 'Aguardando consolidação do histórico pela IA.')}</div>
        </div>

        <div class="patient-detail-grid">
            <div class="clinical-section">
                <div class="clinical-section-title">Linha do tempo clínica</div>
                <div class="clinical-timeline">
                    ${(profile.exames || []).map(exam => {
                        const examEvolution = getEvolutionMeta(exam.evolucao_clinica);
                        return `
                            <article class="timeline-item ${exam.nivel_atencao === 'critico' || exam.evolucao_clinica === 'piora' ? 'is-alert' : ''}">
                                <div class="timeline-marker ${examEvolution.className}">${examEvolution.symbol}</div>
                                <div>
                                    <div class="timeline-topline">
                                        <strong>${escapeHTML(exam.dateLabel)}</strong>
                                        <span class="status-badge ${exam.nivel_atencao}">${getAttentionLabel(exam.nivel_atencao)}</span>
                                    </div>
                                    <p>${escapeHTML(exam.resumo)}</p>
                                    <small>${escapeHTML(exam.comparacao_com_anterior)}</small>
                                </div>
                            </article>
                        `;
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
                        </article>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

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
