/**
 * analysis.js - Analysis View Logic
 * Handles form submission and loading states.
 */

document.addEventListener('DOMContentLoaded', () => {
    const analysisForm = document.getElementById('analysis-form');
    const uploadArea = document.getElementById('upload-area');
    
    // UI Elements for Results state
    const resultsEmpty = document.getElementById('results-empty');
    const resultsLoading = document.getElementById('results-loading');
    const resultsContent = document.getElementById('results-content');

    if (!analysisForm) return;

    // Drag and Drop Effects (Visual Only for now)
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
        // Usually here we would parse the PDF, but we'll instruct the user to use the text area for the MVP.
        alert('Upload de PDF será processado pelo backend na versão final. Para este teste, cole o texto do exame.');
    });

    // Form Submission
    analysisForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get Data
        const requestData = {
            nome_paciente: document.getElementById('patient-name').value,
            idade: document.getElementById('patient-age').value,
            condicoes: document.getElementById('patient-conditions').value,
            texto: document.getElementById('exam-text').value
        };

        // 2. Show Loading State
        resultsEmpty.classList.add('hidden');
        resultsContent.classList.add('hidden');
        resultsLoading.classList.remove('hidden');

        // Smooth scroll to results on mobile/smaller screens
        if (window.innerWidth < 1024) {
            document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
        }

        // 3. Call API
        const resultData = await analyzeExamText(requestData);

        // 4. Render Results and Hide Loading
        if (typeof renderResults === 'function') {
            renderResults(resultData);
        }

        resultsLoading.classList.add('hidden');
        resultsContent.classList.remove('hidden');
    });
});
