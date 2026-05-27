/**
 * analysis.js - Análise de exames e chat contextual
 */

document.addEventListener('DOMContentLoaded', () => {
    const analysisForm     = document.getElementById('analysis-form');
    const uploadArea       = document.getElementById('upload-area');
    const resultsEmpty     = document.getElementById('results-empty');
    const resultsLoading   = document.getElementById('results-loading');
    const resultsContent   = document.getElementById('results-content');
    const submitBtn        = document.getElementById('btn-analyze');
    const examTextarea     = document.getElementById('exam-text');

    if (!analysisForm) return;

    let _lastResult  = null;
    let _chatHistory = [];

    // ── Upload de arquivo ──────────────────────────────────────────────────────
    let _droppedFile = null;

    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        _droppedFile = file;
        uploadArea.querySelector('.upload-title').textContent = `Arquivo: ${file.name}`;
        uploadArea.querySelector('.upload-subtitle').textContent = 'Será enviado ao analisar. Ou cole o texto abaixo.';
    });

    uploadArea.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,image/*,.txt';
        input.onchange = () => {
            const file = input.files[0];
            if (!file) return;
            _droppedFile = file;
            uploadArea.querySelector('.upload-title').textContent = `Arquivo: ${file.name}`;
            uploadArea.querySelector('.upload-subtitle').textContent = 'Será enviado ao analisar.';
        };
        input.click();
    });

    // ── Submit ─────────────────────────────────────────────────────────────────
    analysisForm.addEventListener('submit', async e => {
        e.preventDefault();

        const nome_paciente = document.getElementById('patient-name').value.trim();
        const idade         = parseInt(document.getElementById('patient-age').value) || null;
        const condicoes     = document.getElementById('patient-conditions').value.trim();
        const texto         = examTextarea.value.trim();

        if (!nome_paciente) {
            alert('Informe o nome do paciente.');
            return;
        }

        resultsEmpty.classList.add('hidden');
        resultsContent.classList.add('hidden');
        resultsLoading.classList.remove('hidden');

        const originalBtn = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-feather="loader"></i> Analisando com IA...';
        if (typeof feather !== 'undefined') feather.replace();

        if (window.innerWidth < 1024) {
            document.getElementById('results-container')?.scrollIntoView({ behavior: 'smooth' });
        }

        try {
            let resultData;

            if (_droppedFile && !texto) {
                const fd = new FormData();
                fd.append('arquivo', _droppedFile);
                fd.append('nome_paciente', nome_paciente);
                if (idade) fd.append('idade', idade);
                if (condicoes) fd.append('condicoes', condicoes);
                resultData = await analyzeExamFile(fd);
            } else {
                if (!texto) { alert('Cole o texto do exame ou envie um arquivo.'); return; }
                resultData = await analyzeExamText({ nome_paciente, idade, condicoes, texto });
            }

            _lastResult  = resultData;
            _chatHistory = [];

            saveToHistory({ nome_paciente, idade }, resultData);
            if (typeof savePatientAnalysis === 'function') savePatientAnalysis({ nome_paciente, idade, condicoes, texto }, resultData);
            if (typeof initDashboard === 'function') initDashboard();
            if (typeof renderResults === 'function') renderResults(resultData);

            resultsLoading.classList.add('hidden');
            resultsContent.classList.remove('hidden');
            _renderChat();

        } catch (err) {
            resultsLoading.classList.add('hidden');
            resultsEmpty.classList.remove('hidden');
            const h3 = resultsEmpty.querySelector('h3');
            const p  = resultsEmpty.querySelector('p');
            if (h3) h3.textContent = 'Erro ao analisar exame';
            if (p)  p.textContent  = err.message || 'Verifique sua conexão e tente novamente.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtn;
            if (typeof feather !== 'undefined') feather.replace();
        }
    });

    // ── Chat contextual ────────────────────────────────────────────────────────
    function _renderChat() {
        const container = document.getElementById('results-content');
        if (!container || !_lastResult) return;

        let chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.remove();

        chatSection = document.createElement('div');
        chatSection.id = 'chat-section';
        chatSection.style.cssText = 'margin-top:24px; border-top:1px solid var(--color-border); padding-top:16px;';
        chatSection.innerHTML = `
            <div style="font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <i data-feather="message-circle"></i> Chat sobre este exame
            </div>
            <div id="chat-messages" style="display:flex; flex-direction:column; gap:10px; max-height:320px; overflow-y:auto; margin-bottom:12px;"></div>
            <div style="display:flex; gap:8px;">
                <input id="chat-input" type="text" placeholder="Pergunte sobre este exame..." style="flex:1; padding:10px 14px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); color:var(--color-text); font-size:14px;">
                <button id="chat-send" class="btn btn-primary" style="white-space:nowrap;">
                    <i data-feather="send"></i> Enviar
                </button>
            </div>
        `;
        container.appendChild(chatSection);
        if (typeof feather !== 'undefined') feather.replace();

        document.getElementById('chat-send').addEventListener('click', _sendChat);
        document.getElementById('chat-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') _sendChat();
        });
    }

    async function _sendChat() {
        const input = document.getElementById('chat-input');
        const pergunta = input.value.trim();
        if (!pergunta || !_lastResult) return;

        input.value = '';
        _appendChatMsg('user', pergunta);

        const sendBtn = document.getElementById('chat-send');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i data-feather="loader"></i>';
        if (typeof feather !== 'undefined') feather.replace();

        const contexto = _lastResult.resumo || '';

        try {
            const res = await apiChat(pergunta, contexto, _chatHistory);
            _chatHistory.push({ role: 'user', content: pergunta });
            _chatHistory.push({ role: 'assistant', content: res.resposta });
            if (_chatHistory.length > 16) _chatHistory = _chatHistory.slice(-16);
            _appendChatMsg('assistant', res.resposta);
        } catch (err) {
            _appendChatMsg('assistant', `Erro: ${err.message}`);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i data-feather="send"></i> Enviar';
            if (typeof feather !== 'undefined') feather.replace();
        }
    }

    function _appendChatMsg(role, text) {
        const msgs = document.getElementById('chat-messages');
        if (!msgs) return;
        const isUser = role === 'user';
        const div = document.createElement('div');
        div.style.cssText = `
            align-self: ${isUser ? 'flex-end' : 'flex-start'};
            background: ${isUser ? 'var(--color-primary)' : 'var(--color-surface-alt, var(--color-surface))'};
            color: ${isUser ? '#fff' : 'var(--color-text)'};
            padding: 10px 14px;
            border-radius: ${isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
            max-width: 80%;
            font-size: 14px;
            line-height: 1.5;
            border: ${isUser ? 'none' : '1px solid var(--color-border)'};
        `;
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }
});

function saveToHistory(req, res) {
    const history = JSON.parse(localStorage.getItem('aidoc_history') || '[]');
    history.unshift({
        name:   req.nome_paciente,
        age:    req.idade,
        resumo: res.resumo,
        status: res.nivel_atencao || 'normal',
        date:   new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    });
    if (history.length > 20) history.pop();
    localStorage.setItem('aidoc_history', JSON.stringify(history));
}
