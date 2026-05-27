// Product Tour para AIDoc - premium, minimalista, fluido
// Inspirado em Linear, Notion, Stripe

const tourSteps = [
  {
    title: 'Boas-vindas ao AIDoc',
    description: 'Descubra uma nova experiência em diagnóstico assistido por IA. Vamos apresentar as principais funcionalidades do AIDoc.',
    selector: 'body',
  },
  {
    title: 'Dashboard inteligente',
    description: 'Visualize rapidamente os principais indicadores e alertas do seu dia.',
    selector: '#dashboard',
  },
  {
    title: 'Upload de exames',
    description: 'Faça upload de exames de forma simples e segura.',
    selector: '#upload',
  },
  {
    title: 'Análise por IA',
    description: 'A IA analisa exames e sugere diagnósticos com precisão.',
    selector: '#analysis',
  },
  {
    title: 'Alertas críticos',
    description: 'Receba alertas automáticos para casos críticos.',
    selector: '#alerts',
  },
  {
    title: 'Dashboard modular',
    description: 'Personalize seu dashboard conforme sua rotina.',
    selector: '#modular-dashboard',
  },
  {
    title: 'Histórico do paciente',
    description: 'Acesse rapidamente o histórico completo do paciente.',
    selector: '#history',
  },
  {
    title: 'Workspace personalizável',
    description: 'Adapte o workspace às suas preferências.',
    selector: '#workspace',
  },
];

let currentStep = 0;
let tourActive = false;

function createTourOverlay() {
  let overlay = document.createElement('div');
  overlay.id = 'aidoc-tour-overlay';
  overlay.innerHTML = `
    <div class="aidoc-tour-spotlight"></div>
    <div class="aidoc-tour-modal">
      <div class="aidoc-tour-progress"></div>
      <h2 class="aidoc-tour-title"></h2>
      <p class="aidoc-tour-desc"></p>
      <div class="aidoc-tour-actions">
        <button class="aidoc-tour-skip">Pular tour</button>
        <button class="aidoc-tour-back">Voltar</button>
        <button class="aidoc-tour-next">Próximo</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateTourStep(stepIdx) {
  const step = tourSteps[stepIdx];
  const modal = document.querySelector('.aidoc-tour-modal');
  const title = modal.querySelector('.aidoc-tour-title');
  const desc = modal.querySelector('.aidoc-tour-desc');
  const progress = modal.querySelector('.aidoc-tour-progress');
  title.textContent = step.title;
  desc.textContent = step.description;
  progress.innerHTML = `<span>${stepIdx + 1}</span> / ${tourSteps.length}`;

  // Spotlight
  const spotlight = document.querySelector('.aidoc-tour-spotlight');
  const target = document.querySelector(step.selector);
  if (target) {
    const rect = target.getBoundingClientRect();
    spotlight.style.display = 'block';
    spotlight.style.top = rect.top + window.scrollY + 'px';
    spotlight.style.left = rect.left + window.scrollX + 'px';
    spotlight.style.width = rect.width + 'px';
    spotlight.style.height = rect.height + 'px';
  } else {
    spotlight.style.display = 'none';
  }

  // Modal position
  modal.style.top = '10vh';
  modal.style.left = '50%';
  modal.style.transform = 'translateX(-50%)';
}

function startTour() {
  if (tourActive) return;
  tourActive = true;
  createTourOverlay();
  updateTourStep(0);
  document.body.classList.add('aidoc-tour-blur');

  // Event listeners
  document.querySelector('.aidoc-tour-next').onclick = () => {
    if (currentStep < tourSteps.length - 1) {
      currentStep++;
      updateTourStep(currentStep);
    } else {
      endTour();
    }
  };
  document.querySelector('.aidoc-tour-back').onclick = () => {
    if (currentStep > 0) {
      currentStep--;
      updateTourStep(currentStep);
    }
  };
  document.querySelector('.aidoc-tour-skip').onclick = endTour;
}

function endTour() {
  tourActive = false;
  currentStep = 0;
  document.body.classList.remove('aidoc-tour-blur');
  const overlay = document.getElementById('aidoc-tour-overlay');
  if (overlay) overlay.remove();
}

// Expor para uso global
window.startAidocTour = startTour;

// Opcional: iniciar tour automaticamente na primeira visita
// window.addEventListener('DOMContentLoaded', () => {
//   startAidocTour();
// });
