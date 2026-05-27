/**
 * api.js - Integração com o backend FastAPI.
 */

// Garante que refreshIcons existe globalmente mesmo antes do dashboard.js carregar
if (typeof window.refreshIcons === 'undefined') {
    window.refreshIcons = function() {
        if (typeof feather !== 'undefined') feather.replace();
    };
}

// Garante que patientInitials existe globalmente
if (typeof window.patientInitials === 'undefined') {
    window.patientInitials = function(name) {
        return String(name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    };
}

const API_URL = 'http://localhost:8000/analisar-texto';

async function analyzeExamText(patientData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(patientData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('API connection failed. Falling back to mock data for demonstration.', error);
        return await getMockAnalysisResult(patientData);
    }
}

// Fallback Mock for demonstration/hackathon if API is offline.
function getMockAnalysisResult(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const text = String(data.texto || '').toLowerCase();
            const isCritical = text.includes('crítico') || text.includes('critico') || text.includes('urgente');
            const hasPrevious = Array.isArray(data.historico) && data.historico.length > 0;
            const indicatesImprovement = text.includes('melhora') || text.includes('redução') || text.includes('reducao') || text.includes('normalizou');
            const indicatesWorse = isCritical || text.includes('piora') || text.includes('aumento') || text.includes('elevado');
            const evolution = !hasPrevious ? 'estavel' : indicatesImprovement ? 'melhora' : indicatesWorse ? 'piora' : 'estavel';
            const previousSummary = hasPrevious ? data.historico[0].resumo : '';

            resolve({
                resumo: `O paciente ${data.nome_paciente}, ${data.idade} anos, apresenta alterações relevantes nos marcadores analisados, considerando o contexto clínico informado: ${data.condicoes || 'sem condições registradas'}.`,
                valores_alterados: [
                    'Leucócitos: 14.500 /uL (Referência: 4.500 a 11.000)',
                    'Glicemia de jejum: 125 mg/dL (Referência: 70 a 99)',
                    'Colesterol Total: 240 mg/dL (Referência: < 190)'
                ],
                recomendacoes: 'Avaliar possível quadro infeccioso devido à leucocitose. Repetir glicemia e solicitar hemoglobina glicada para investigação metabólica.',
                nivel_atencao: isCritical ? 'critico' : 'atencao',
                evolucao_clinica: evolution,
                resumo_historico: hasPrevious
                    ? `Histórico consolidado: ${previousSummary} No exame atual, a IA classifica a evolução como ${evolution}.`
                    : `Primeiro registro clínico de ${data.nome_paciente}. Perfil iniciado com atenção aos marcadores alterados e às condições informadas.`,
                comparacao_com_anterior: hasPrevious
                    ? `Comparado ao último exame, há padrão de ${evolution} clínica com necessidade de correlação médica.`
                    : 'Sem exame anterior salvo; este laudo passa a ser a linha de base do acompanhamento.'
            });
        }, 1200);
    });
}
