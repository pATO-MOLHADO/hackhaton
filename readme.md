🧠 CONTEXT PACK — AIDoc (Hackathon IA)
🏆 Visão geral do projeto
 
O AIDoc é um sistema web de assistência médica com IA que analisa exames laboratoriais e gera:
 
resumo clínico
detecção de valores alterados
nível de urgência
recomendações médicas
chat contextual sobre o exame
 
📌 Objetivo do hackathon:
Criar um MVP visualmente convincente que simula um sistema hospitalar moderno com IA integrada.
 
👥 Usuário principal
Médico (único tipo de usuário)
Interage com dashboard e análise de exames
⚙️ Arquitetura
Backend (já pronto pelo parceiro)
 
Stack:
 
Python
FastAPI
IA abstrata via chamar_ia()
Endpoints disponíveis:
1. Análise de texto
POST /analisar-texto
 
Request:
 
{
  "texto": "Leucócitos: 12000...",
  "nome_paciente": "João",
  "idade": "58",
  "condicoes": "diabetes"
}
 
Response:
 
{
  "resumo": "string",
  "valores_alterados": ["string"],
  "recomendacoes": "string",
  "nivel_atencao": "normal | atencao | critico"
}
2. Análise de arquivo
POST /analisar
Upload PDF ou imagem
retorna mesmo JSON da análise
3. Chat sobre exame
POST /chat
 
Request:
 
{
  "pergunta": "isso é grave?",
  "contexto_exame": "resumo da IA",
  "historico": []
}
 
Response:
 
{
  "resposta": "string"
}
🎨 FRONT-END (HTML + CSS + JS puro)
Stack obrigatória:
HTML
CSS
JavaScript (fetch API)
sem frameworks
🖥️ Páginas do sistema
1. Dashboard (principal)
 
Funções:
 
listar exames recentes (mock ou real)
botão “Novo exame”
indicadores:
exames normais
atenção
críticos
2. Tela de Upload / Análise
 
Componentes:
 
input file OU textarea
botão: “Analisar com IA”
loading state
 
Fluxo:
 
envia dados para /analisar-texto
recebe JSON
redireciona para resultado
3. Tela de Resultado (CRÍTICA)
 
Exibir:
 
🧾 Resumo
 
Texto da IA
 
⚠️ Valores alterados
 
Lista destacada
 
💡 Recomendações
 
Texto clínico
 
🚨 Nível de atenção
 
Mapeamento visual:
 
normal → verde
atencao → amarelo
critico → vermelho piscante
4. (Opcional) Chat do exame
input de pergunta
histórico simples
resposta IA em tempo real
💥 FEATURES DIFERENCIAIS
Obrigatórias para MVP
upload ou texto
análise IA funcionando
resultado estruturado
UI funcional
Se sobrar tempo (alto impacto)
1. Histórico de exames
armazenar resultados em array/dicionário JS
comparar evolução
2. Alertas visuais fortes
crítico com animação
som opcional
3. Exportar PDF
gerar laudo com jsPDF ou backend
4. Perguntas sugeridas pela IA
IA retorna 3 perguntas médicas relevantes
Apenas para pitch (não implementar obrigatório)
integração com prontuário eletrônico
app mobile
modelo treinado em dados brasileiros
análise preditiva avançada
🎨 UI/UX DIREÇÃO
Estilo visual:
hospital SaaS moderno
cores: azul, branco, cinza
cards limpos
layout de dashboard profissional
Referência mental:
sistema de hospital privado
software médico corporativo caro
🧠 Lógica do frontend
Fluxo principal:
usuário envia exame
JS chama API
recebe JSON
renderiza:
resumo
alertas
recomendações
nível de urgência
Exemplo fetch:
fetch("http://localhost:8000/analisar-texto", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    texto: "...",
    nome_paciente: "João",
    idade: "58",
    condicoes: "diabetes"
  })
})
.then(res => res.json())
.then(data => console.log(data));
📊 Estrutura de dados no frontend
exame = {
  resumo: "",
  valores_alterados: [],
  recomendacoes: "",
  nivel_atencao: ""
}
⚡ Regras importantes do projeto
simplicidade > complexidade
UI bonita vale mais que lógica avançada
IA deve ser o “centro da demo”
fluxo deve funcionar sem bugs
tudo deve ser demonstrável em 2 minutos
🧨 O QUE GANHA O HACKATHON
sistema funcionando sem travar
UI profissional
IA integrada visivelmente
storytelling forte
problema claro (saúde + eficiência médica)
🧾 RESUMO FINAL
 
AIDoc =
 
dashboard médico + upload de exame + IA que gera laudo estruturado + UI hospitalar convincente