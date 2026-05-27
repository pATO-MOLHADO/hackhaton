/**
 * dashboard.js - Dashboard View Logic
 * Populates recent exams table with mock data.
 */

function initDashboard() {
    const tableBody = document.querySelector('#recent-exams-table tbody');
    if (!tableBody) return;

    // Mock recent exams data
    const recentExams = [
        { name: 'Maria Oliveira', age: 42, date: 'Hoje, 09:30', status: 'normal' },
        { name: 'Carlos Santos', age: 65, date: 'Hoje, 08:15', status: 'atencao' },
        { name: 'Ana Souza', age: 28, date: 'Ontem, 16:40', status: 'normal' },
        { name: 'Roberto Almeida', age: 58, date: 'Ontem, 14:20', status: 'critico' },
        { name: 'Fernanda Lima', age: 35, date: 'Ontem, 10:05', status: 'normal' }
    ];

    // Helper to get status label
    const getStatusLabel = (status) => {
        const labels = {
            'normal': 'Normal',
            'atencao': 'Atenção',
            'critico': 'Crítico'
        };
        return labels[status] || status;
    };

    // Render table rows
    tableBody.innerHTML = recentExams.map(exam => `
        <tr>
            <td class="fw-500">${exam.name}</td>
            <td class="text-muted">${exam.age} anos</td>
            <td class="text-muted">${exam.date}</td>
            <td>
                <span class="status-badge ${exam.status}">
                    ${getStatusLabel(exam.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-text btn-sm">Ver análise</button>
            </td>
        </tr>
    `).join('');
}
