/**
 * api.js - API Service Integration
 * Handles requests to the FastAPI backend.
 */

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

        const data = await response.json();
        return data;
    } catch (error) {
        console.warn('API connection failed. Falling back to mock data for demonstration.', error);
        return await getMockAnalysisResult(patientData);
    }
}

// Fallback Mock for demonstration/hackathon if API is offline
function getMockAnalysisResult(data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Determine level based on keywords in text or randomly
            const isCritical = data.texto.toLowerCase().includes('crítico') || data.texto.toLowerCase().includes('urgente');
            
            resolve({
                resumo: `O paciente ${data.nome_paciente}, ${data.idade} anos, apresenta quadro com alterações significativas nos marcadores hematológicos.`,
                valores_alterados: [
                    "Leucócitos: 14.500 /uL (Referência: 4.500 a 11.000)",
                    "Glicemia de jejum: 125 mg/dL (Referência: 70 a 99)",
                    "Colesterol Total: 240 mg/dL (Referência: < 190)"
                ],
                recomendacoes: "Avaliar possível quadro infeccioso devido à leucocitose. Repetir glicemia e solicitar hemoglobina glicada para investigação de pré-diabetes.",
                nivel_atencao: isCritical ? "critico" : "atencao"
            });
        }, 2000); // Simulate network delay
    });
}
