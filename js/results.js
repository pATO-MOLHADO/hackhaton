/**
 * results.js - Results View Logic
 * Renders the AI analysis response dynamically.
 */

function renderResults(data) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    // Ensure feather icons are re-initialized after rendering
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 10);

    // Map status to visual properties
    const statusProps = {
        'normal': { icon: 'check-circle', color: 'text-green', label: 'Normal' },
        'atencao': { icon: 'alert-triangle', color: 'text-yellow', label: 'Atenção' },
        'critico': { icon: 'alert-octagon', color: 'text-red', label: 'Crítico' }
    };

    const level = data.nivel_atencao ? data.nivel_atencao.toLowerCase() : 'normal';
    const props = statusProps[level] || statusProps['normal'];

    // Build Altered Values List
    let alteredValuesHTML = '';
    if (data.valores_alterados && data.valores_alterados.length > 0) {
        alteredValuesHTML = `
            <div class="results-section">
                <h4>Valores Alterados Identificados</h4>
                <ul class="altered-values-list">
                    ${data.valores_alterados.map(val => `<li>${val}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        alteredValuesHTML = `
            <div class="results-section">
                <h4>Valores Alterados Identificados</h4>
                <p class="text-muted">Nenhum valor alterado significativo encontrado.</p>
            </div>
        `;
    }

    // Build HTML
    resultsContent.innerHTML = `
        <div class="results-header">
            <h3>Resultado da Análise IA</h3>
            <span class="status-badge ${level}">
                <i data-feather="${props.icon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                ${props.label}
            </span>
        </div>

        <div class="results-section">
            <h4>Resumo Clínico</h4>
            <div class="summary-box">
                ${data.resumo || 'Nenhum resumo disponível.'}
            </div>
        </div>

        ${alteredValuesHTML}

        <div class="results-section">
            <h4>Recomendações e Próximos Passos</h4>
            <div class="recommendations-box">
                ${data.recomendacoes || 'Nenhuma recomendação específica.'}
            </div>
        </div>
        
        <div style="margin-top: 32px; display: flex; gap: 16px;">
            <button class="btn btn-primary w-100">
                <i data-feather="download"></i> Exportar Laudo (PDF)
            </button>
            <button class="btn btn-text" onclick="resetAnalysis()">
                Nova Análise
            </button>
        </div>
    `;
}

// Global helper to reset the form
window.resetAnalysis = function() {
    document.getElementById('analysis-form').reset();
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('results-empty').classList.remove('hidden');
    
    // Scroll back to form
    document.querySelector('.analysis-form-card').scrollIntoView({ behavior: 'smooth' });
};
