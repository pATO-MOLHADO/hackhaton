/**
 * analysis.js - Lógica da View de Análise
 * Gerencia envio do formulário e estados de carregamento.
 */

document.addEventListener('DOMContentLoaded', () => {
    const analysisForm = document.getElementById('analysis-form');
    const uploadArea = document.getElementById('upload-area');

    const resultsEmpty = document.getElementById('results-empty');
    const resultsLoading = document.getElementById('results-loading');
    const resultsContent = document.getElementById('results-content');
    const submitBtn = document.getElementById('btn-analyze');

    if (!analysisForm) return;

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const uploadMsg = document.getElementById('upload-message');
        if (uploadMsg) {
            uploadMsg.textContent = 'Upload de PDF será processado pelo backend na versão final. Para este teste, cole o texto do exame.';
        }
    });

    analysisForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            nome_paciente: document.getElementById('patient-name').value,
            idade: document.getElementById('patient-age').value,
            condicoes: document.getElementById('patient-conditions').value,
            texto: document.getElementById('exam-text').value
        };
        const requestData = typeof buildContextualAnalysisPayload === 'function'
            ? buildContextualAnalysisPayload(formData)
            : formData;

        resultsEmpty.classList.add('hidden');
        resultsContent.classList.add('hidden');
        resultsLoading.classList.remove('hidden');

        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader" class="spin-icon"></i> Analisando exame com IA...';
        if (typeof feather !== 'undefined') feather.replace();

        if (window.innerWidth < 1024) {
            document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
        }

        let success = false;
        try {
            const resultData = await analyzeExamText(requestData);

            saveToHistory(requestData, resultData);
            if (typeof savePatientAnalysis === 'function') {
                savePatientAnalysis(requestData, resultData);
            }
            if (typeof initDashboard === 'function') {
                initDashboard();
            }
            if (typeof renderResults === 'function') {
                renderResults(resultData);
            }
            success = true;
        } catch (error) {
            console.error(error);
            // Restaura estado de erro visível
            const h3 = resultsEmpty.querySelector('h3');
            const p = resultsEmpty.querySelector('p');
            if (h3) h3.textContent = 'Erro ao analisar exame';
            if (p) p.textContent = 'Não foi possível processar o laudo. Verifique sua conexão e tente novamente.';
        } finally {
            resultsLoading.classList.add('hidden');
            if (success) {
                resultsContent.classList.remove('hidden');
            } else {
                resultsEmpty.classList.remove('hidden');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
            if (typeof feather !== 'undefined') feather.replace();
        }
    });
});

function saveToHistory(req, res) {
    const history = JSON.parse(localStorage.getItem('aidoc_history') || '[]');

    history.unshift({
        name: req.nome_paciente,
        age: req.idade,
        resumo: res.resumo,
        status: res.nivel_atencao || 'normal',
        date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    });

    if (history.length > 10) history.pop();

    localStorage.setItem('aidoc_history', JSON.stringify(history));
}
