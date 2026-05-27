/**
 * results.js - Results View Logic
 * Renders the AI analysis response dynamically as a Structured Clinical Card.
 */

function renderResults(data) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    // Map status to visual properties for the TL;DR
    const statusProps = {
        'normal': { colorClass: 'routine', label: 'Rotina / Normal' },
        'atencao': { colorClass: 'warning', label: 'Atenção Requerida' },
        'critico': { colorClass: 'danger', label: 'Risco Clínico Crítico' }
    };

    const level = data.nivel_atencao ? data.nivel_atencao.toLowerCase() : 'normal';
    const props = statusProps[level] || statusProps['normal'];
    const evolutionProps = {
        melhora: { label: 'Melhora', icon: 'arrow-up-right', className: 'positive' },
        piora: { label: 'Piora', icon: 'arrow-down-right', className: 'negative' },
        estavel: { label: 'Estável', icon: 'arrow-right', className: 'stable' }
    };
    const evolution = String(data.evolucao_clinica || 'estavel').toLowerCase();
    const evolutionMeta = evolutionProps[evolution] || evolutionProps.estavel;

    // Build TL;DR Text (Simulated if not provided)
    const tldrText = data.resumo || "Resumo não disponível. Exame com alterações pendentes de revisão médica.";

    // Build Altered Values Grid
    let alteredValuesHTML = '';
    if (data.valores_alterados && data.valores_alterados.length > 0) {
        alteredValuesHTML = `
            <div class="clinical-section">
                <div class="clinical-section-title">Valores Alterados Identificados</div>
                <div class="altered-list">
                    ${data.valores_alterados.map(val => {
                        // Very naive split for mocking purposes (e.g. "Glicose: 150 mg/dL")
                        const parts = val.split(':');
                        const name = parts[0] ? parts[0].trim() : 'Marcador';
                        const value = parts[1] ? parts[1].trim() : val;
                        // Simulating High or Low just for the mock (if it contains 'Alto' or similar)
                        const isHigh = value.toLowerCase().includes('alto') || value.toLowerCase().includes('acima');
                        const valClass = isHigh ? 'val-high' : 'val-low';
                        const icon = isHigh ? 'arrow-up-right' : 'arrow-down-right';
                        
                        return `
                            <div class="altered-item">
                                <span class="altered-item-name">${name}</span>
                                <span class="altered-item-val ${valClass}">
                                    ${value}
                                    <i data-feather="${icon}" style="width: 14px; height: 14px;"></i>
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        alteredValuesHTML = `
            <div class="clinical-section">
                <div class="clinical-section-title">Valores Alterados Identificados</div>
                <p class="text-muted" style="font-size: 14px;">Nenhuma alteração crítica identificada no laudo.</p>
            </div>
        `;
    }

    // Recommended Questions (Simulated)
    const questionsHTML = `
        <div class="clinical-section">
            <div class="clinical-section-title">Sugestão de Anamnese Direcionada</div>
            <div class="clinical-questions">
                <ul>
                    <li>O paciente apresentou febre nas últimas 48h?</li>
                    <li>Há histórico familiar recente relacionado aos marcadores alterados?</li>
                    <li>O paciente está em uso contínuo de algum medicamento não relatado?</li>
                </ul>
            </div>
        </div>
    `;

    // Smart Actions (Simulated)
    const actionsHTML = `
        <div class="clinical-actions">
            <button class="btn btn-primary">
                <i data-feather="check-circle"></i> Aprovar Conduta
            </button>
            <button class="btn btn-outline" style="border-color: var(--color-danger); color: var(--color-danger);">
                <i data-feather="alert-triangle"></i> Solicitar Retorno Urgente
            </button>
            <button class="btn btn-outline">
                <i data-feather="message-circle"></i> WhatsApp (Paciente)
            </button>
        </div>
    `;

    // Build Final HTML
    resultsContent.innerHTML = `
        <div class="clinical-card">
            
            <div class="clinical-card-header">
                <h3>Análise Estruturada AIDoc</h3>
                <span class="status-badge ${level}">${props.label}</span>
            </div>

            <div class="clinical-tldr ${props.colorClass}">
                ${tldrText}
            </div>

            <div class="clinical-context-grid">
                <div class="context-card ${evolutionMeta.className}">
                    <span>Evolução clínica</span>
                    <strong><i data-feather="${evolutionMeta.icon}"></i>${evolutionMeta.label}</strong>
                </div>
                <div class="context-card">
                    <span>Comparação com anterior</span>
                    <p>${data.comparacao_com_anterior || 'Sem exame anterior salvo para comparação.'}</p>
                </div>
                <div class="context-card">
                    <span>Resumo histórico</span>
                    <p>${data.resumo_historico || 'Histórico clínico iniciado a partir desta análise.'}</p>
                </div>
            </div>

            ${alteredValuesHTML}
            ${questionsHTML}

            <hr style="border: 0; border-top: 1px solid var(--color-border); margin: 8px 0;" />
            
            ${actionsHTML}

            <div style="margin-top: 16px; text-align: right;">
                <button class="btn btn-text" onclick="resetAnalysis()" style="font-size: 13px;">
                    <i data-feather="refresh-ccw"></i> Nova Análise
                </button>
            </div>

        </div>
    `;

    // Initialize Feather Icons in the new HTML
    setTimeout(() => {
        if (typeof feather !== 'undefined') feather.replace();
    }, 10);
}

// Global helper to reset the form
window.resetAnalysis = function() {
    document.getElementById('analysis-form').reset();
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('results-empty').classList.remove('hidden');
    
    // Scroll back to form
    const formCard = document.querySelector('.analysis-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
};
