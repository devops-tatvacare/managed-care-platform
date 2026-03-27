// Diabetes Analytics Dashboard JavaScript

// Application state
const dashboardState = {
    filters: {
        state: 'all',
        risk: 'all',
        trimester: 'all'
    },
    data: {
        diabetesTypes: [
            {"type": "Type 1", "percentage": 5.0, "cases_millions": 0.94, "color": "#1FB8CD"},
            {"type": "Type 2", "percentage": 90.0, "cases_millions": 80.8, "color": "#FFC185"},
            {"type": "Prediabetes", "percentage": 15.3, "cases_millions": 127.3, "color": "#B4413C"},
            {"type": "Gestational", "percentage": 26.1, "cases_millions": 6.27, "color": "#ECEBD5"},
            {"type": "Undiagnosed", "percentage": 43.0, "cases_millions": 38.6, "color": "#5D878F"}
        ],
        trimesterData: [
            {"trimester": "First", "gdm_percentage": 11.4, "at_risk_patients": 2850, "screening": "High Risk Only"},
            {"trimester": "Second", "gdm_percentage": 60.0, "at_risk_patients": 15000, "screening": "Universal Screening"},
            {"trimester": "Third", "gdm_percentage": 28.6, "at_risk_patients": 7150, "screening": "Follow-up Only"}
        ],
        riskLevels: [
            {"level": "Low Risk", "diabetes_prev": 5.2, "gdm_risk": 8.5, "patient_count": 12500, "factors": "Age <25, Normal BMI, No Family History"},
            {"level": "Medium Risk", "diabetes_prev": 12.8, "gdm_risk": 18.3, "patient_count": 15800, "factors": "Age 25-30, BMI 25-30, Some Risk Factors"},
            {"level": "High Risk", "diabetes_prev": 24.5, "gdm_risk": 35.7, "patient_count": 8200, "factors": "Age >30, BMI >30, Family History"},
            {"level": "Very High Risk", "diabetes_prev": 45.2, "gdm_risk": 52.1, "patient_count": 3500, "factors": "Previous GDM, Multiple Risk Factors"}
        ],
        progressionData: [
            {"cohort": "Gestational Diabetes", "baseline": 25000, "progression_rate": 30.5, "time_years": 5, "complications": 12.0},
            {"cohort": "Prediabetes", "baseline": 45000, "progression_rate": 58.2, "time_years": 3, "complications": 25.5},
            {"cohort": "Type 2 Early", "baseline": 35000, "progression_rate": 100.0, "time_years": 0, "complications": 45.8},
            {"cohort": "Type 2 Advanced", "baseline": 15000, "progression_rate": 100.0, "time_years": 0, "complications": 78.3}
        ],
        stateData: [
            {"state": "Tamil Nadu", "aspr": 8299.55, "daly": 1893.11, "growth": 0.78},
            {"state": "Goa", "aspr": 6675.33, "daly": 1650.0, "growth": 1.12},
            {"state": "Karnataka", "aspr": 6663.54, "daly": 1580.0, "growth": 0.95},
            {"state": "Punjab", "aspr": 5800.0, "daly": 1450.0, "growth": 1.05},
            {"state": "Haryana", "aspr": 5650.0, "daly": 1380.0, "growth": 1.09},
            {"state": "Uttar Pradesh", "aspr": 5200.0, "daly": 1250.0, "growth": 0.65},
            {"state": "Kerala", "aspr": 4850.0, "daly": 1150.0, "growth": 0.32},
            {"state": "Bihar", "aspr": 3200.0, "daly": 950.0, "growth": 0.51}
        ],
        trends: [
            {"year": 2000, "population": 32.7, "prevalence": 7.1},
            {"year": 2011, "population": 61.3, "prevalence": 9.0},
            {"year": 2024, "population": 89.8, "prevalence": 10.5},
            {"year": 2050, "population": 156.7, "prevalence": 12.8}
        ]
    },
    charts: {}
};

// DOM Elements
const elements = {
    stateFilter: null,
    riskFilter: null,
    trimesterFilter: null,
    resetFilters: null,
    exportData: null,
    sections: null,
    riskItems: null,
    chartImages: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    bindEvents();
    initializeCharts();
    initializeInteractions();
    updateDashboard();
    console.log('Diabetes Analytics Dashboard initialized successfully');
});

// Initialize DOM elements
function initializeElements() {
    elements.stateFilter = document.getElementById('stateFilter');
    elements.riskFilter = document.getElementById('riskFilter');
    elements.trimesterFilter = document.getElementById('trimesterFilter');
    elements.resetFilters = document.getElementById('resetFilters');
    elements.exportData = document.getElementById('exportData');
    elements.sections = document.querySelectorAll('.dashboard-section');
    elements.riskItems = document.querySelectorAll('.risk-level-item');
    elements.chartImages = document.querySelectorAll('.chart-image');
}

// Initialize Chart.js fallback charts
function initializeCharts() {
    // Initialize population chart
    createPopulationChart();
    
    // Initialize trends chart
    createTrendsChart();
    
    // Initialize GDM chart
    createGDMChart();
    
    // Initialize risk chart
    createRiskChart();
    
    // Initialize progression chart
    createProgressionChart();
    
    // Initialize geographic chart
    createGeographicChart();
}

function createPopulationChart() {
    const ctx = document.getElementById('populationChart');
    if (!ctx) return;
    
    const data = dashboardState.data.diabetesTypes;
    
    dashboardState.charts.population = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.type),
            datasets: [{
                data: data.map(d => d.cases_millions),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Diabetes Population Distribution (Millions)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return chart.data.labels.map((label, i) => ({
                                text: `${label}: ${datasets[0].data[i]}M (${data[i].percentage}%)`,
                                fillStyle: datasets[0].backgroundColor[i],
                                strokeStyle: datasets[0].backgroundColor[i],
                                lineWidth: 0,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const percentage = data[context.dataIndex].percentage;
                            return `${label}: ${value}M cases (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    const data = dashboardState.data.trends;
    
    dashboardState.charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.year),
            datasets: [{
                label: 'Population (Millions)',
                data: data.map(d => d.population),
                borderColor: '#1FB8CD',
                backgroundColor: 'rgba(31, 184, 205, 0.1)',
                borderWidth: 3,
                fill: true,
                yAxisID: 'y'
            }, {
                label: 'Prevalence (%)',
                data: data.map(d => d.prevalence),
                borderColor: '#FFC185',
                backgroundColor: 'rgba(255, 193, 133, 0.1)',
                borderWidth: 3,
                fill: false,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Diabetes Growth Trends in India (2000-2050)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Population (Millions)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Prevalence (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

function createGDMChart() {
    const ctx = document.getElementById('gdmChart');
    if (!ctx) return;
    
    const data = dashboardState.data.trimesterData;
    
    dashboardState.charts.gdm = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.trimester + ' Trimester'),
            datasets: [{
                label: 'GDM Percentage (%)',
                data: data.map(d => d.gdm_percentage),
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'At-Risk Patients',
                data: data.map(d => d.at_risk_patients),
                type: 'line',
                borderColor: '#FFC185',
                backgroundColor: '#FFC185',
                borderWidth: 3,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'GDM Distribution and At-Risk Patients by Trimester',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'GDM Percentage (%)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'At-Risk Patients'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

function createRiskChart() {
    const ctx = document.getElementById('riskChart');
    if (!ctx) return;
    
    const data = dashboardState.data.riskLevels;
    
    dashboardState.charts.risk = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.level),
            datasets: [{
                label: 'Diabetes Prevalence (%)',
                data: data.map(d => d.diabetes_prev),
                backgroundColor: '#B4413C',
                borderColor: '#B4413C',
                borderWidth: 1
            }, {
                label: 'GDM Risk (%)',
                data: data.map(d => d.gdm_risk),
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 1
            }, {
                label: 'Patient Count (Thousands)',
                data: data.map(d => d.patient_count / 1000),
                backgroundColor: '#FFC185',
                borderColor: '#FFC185',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Risk Stratification Matrix',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Percentage / Thousands'
                    }
                }
            }
        }
    });
}

function createProgressionChart() {
    const ctx = document.getElementById('progressionChart');
    if (!ctx) return;
    
    const data = dashboardState.data.progressionData;
    
    dashboardState.charts.progression = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.cohort),
            datasets: [{
                label: 'Baseline Patients (Thousands)',
                data: data.map(d => d.baseline / 1000),
                backgroundColor: '#ECEBD5',
                borderColor: '#ECEBD5',
                borderWidth: 1
            }, {
                label: 'Progression Rate (%)',
                data: data.map(d => d.progression_rate),
                backgroundColor: '#B4413C',
                borderColor: '#B4413C',
                borderWidth: 1
            }, {
                label: 'Complications (%)',
                data: data.map(d => d.complications),
                backgroundColor: '#5D878F',
                borderColor: '#5D878F',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: 'Diabetes Progression Pathways',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Value (% or Thousands)'
                    }
                }
            }
        }
    });
}

function createGeographicChart() {
    const ctx = document.getElementById('geographicChart');
    if (!ctx) return;
    
    const data = dashboardState.data.stateData;
    
    dashboardState.charts.geographic = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'State Diabetes Burden',
                data: data.map(d => ({
                    x: d.aspr,
                    y: d.daly,
                    state: d.state,
                    growth: d.growth
                })),
                backgroundColor: data.map(d => 
                    d.growth > 1.0 ? '#B4413C' : 
                    d.growth > 0.8 ? '#FFC185' : 
                    d.growth > 0.5 ? '#1FB8CD' : '#5D878F'
                ),
                borderColor: data.map(d => 
                    d.growth > 1.0 ? '#B4413C' : 
                    d.growth > 0.8 ? '#FFC185' : 
                    d.growth > 0.5 ? '#1FB8CD' : '#5D878F'
                ),
                borderWidth: 2,
                pointRadius: data.map(d => Math.sqrt(d.daly) / 10)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'State-wise Diabetes Burden Analysis',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.parsed;
                            const state = context.raw.state;
                            const growth = context.raw.growth;
                            return [
                                `State: ${state}`,
                                `ASPR: ${point.x.toLocaleString()} per 100k`,
                                `DALY: ${point.y.toFixed(1)}`,
                                `Growth: ${growth}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ASPR per 100k'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'DALY per 100k'
                    }
                }
            }
        }
    });
}

// Bind event listeners
function bindEvents() {
    // Filter change events
    if (elements.stateFilter) {
        elements.stateFilter.addEventListener('change', handleStateFilter);
    }
    
    if (elements.riskFilter) {
        elements.riskFilter.addEventListener('change', handleRiskFilter);
    }
    
    if (elements.trimesterFilter) {
        elements.trimesterFilter.addEventListener('change', handleTrimesterFilter);
    }
    
    // Button events
    if (elements.resetFilters) {
        elements.resetFilters.addEventListener('click', handleResetFilters);
    }
    
    if (elements.exportData) {
        elements.exportData.addEventListener('click', handleExportData);
    }
    
    // Section interaction events
    elements.sections.forEach(section => {
        section.addEventListener('click', handleSectionClick);
    });
    
    // Risk item hover events
    elements.riskItems.forEach(item => {
        item.addEventListener('mouseenter', handleRiskItemHover);
        item.addEventListener('mouseleave', handleRiskItemLeave);
    });
}

// Initialize interactive features
function initializeInteractions() {
    // Add smooth scrolling for section navigation
    addSmoothScrolling();
    
    // Initialize tooltips and interactive elements
    initializeTooltips();
    
    // Add keyboard navigation support
    addKeyboardNavigation();
}

// Filter event handlers
function handleStateFilter(event) {
    dashboardState.filters.state = event.target.value;
    updateDashboard();
    logFilterChange('state', event.target.value);
}

function handleRiskFilter(event) {
    dashboardState.filters.risk = event.target.value;
    updateDashboard();
    logFilterChange('risk', event.target.value);
}

function handleTrimesterFilter(event) {
    dashboardState.filters.trimester = event.target.value;
    updateDashboard();
    logFilterChange('trimester', event.target.value);
}

function handleResetFilters() {
    // Reset all filters to default
    dashboardState.filters = {
        state: 'all',
        risk: 'all',
        trimester: 'all'
    };
    
    // Update UI
    if (elements.stateFilter) elements.stateFilter.value = 'all';
    if (elements.riskFilter) elements.riskFilter.value = 'all';
    if (elements.trimesterFilter) elements.trimesterFilter.value = 'all';
    
    // Update dashboard
    updateDashboard();
    
    // Show feedback
    showNotification('Filters reset successfully', 'success');
    console.log('Filters reset to default values');
}

function handleExportData() {
    // Generate export data based on current filters
    const exportData = generateExportData();
    
    // Create and download CSV file
    const csvContent = convertToCSV(exportData);
    downloadCSV(csvContent, 'diabetes_analytics_export.csv');
    
    // Show feedback
    showNotification('Data exported successfully', 'success');
    console.log('Data export completed');
}

// Section interaction handlers
function handleSectionClick(event) {
    const section = event.currentTarget;
    const sectionId = section.id;
    
    // Add visual feedback
    section.style.transform = 'scale(1.002)';
    setTimeout(() => {
        section.style.transform = '';
    }, 150);
    
    console.log(`Section clicked: ${sectionId}`);
}

function handleRiskItemHover(event) {
    const item = event.currentTarget;
    const riskLevel = item.dataset.risk;
    
    // Add hover class for additional styling
    item.classList.add('risk-item-hovered');
}

function handleRiskItemLeave(event) {
    const item = event.currentTarget;
    
    // Remove hover class
    item.classList.remove('risk-item-hovered');
}

// Dashboard update functions
function updateDashboard() {
    updateFilteredStatistics();
    updateVisualIndicators();
    updateSectionVisibility();
    console.log('Dashboard updated with current filters:', dashboardState.filters);
}

function updateFilteredStatistics() {
    updateRiskItemVisibility();
    updateGeographicDisplay();
}

function updateVisualIndicators() {
    elements.sections.forEach(section => {
        const header = section.querySelector('.section-header');
        if (header) {
            updateSectionFilterIndicator(header, section.id);
        }
    });
}

function updateSectionVisibility() {
    elements.sections.forEach(section => {
        const shouldShow = shouldShowSection(section.id);
        section.style.display = shouldShow ? 'block' : 'none';
    });
}

// Helper functions
function shouldShowSection(sectionId) {
    return true; // Show all sections for now
}

function updateRiskItemVisibility() {
    const riskItems = document.querySelectorAll('.risk-level-item');
    
    riskItems.forEach(item => {
        const riskLevel = item.dataset.risk;
        const shouldShow = dashboardState.filters.risk === 'all' || 
                          dashboardState.filters.risk.toLowerCase().replace(' ', '-') === riskLevel;
        
        item.style.display = shouldShow ? 'block' : 'none';
    });
}

function updateGeographicDisplay() {
    const stateRankings = document.querySelectorAll('.ranking-item');
    
    stateRankings.forEach(item => {
        const stateName = item.querySelector('h5').textContent;
        const shouldShow = dashboardState.filters.state === 'all' || 
                          dashboardState.filters.state === stateName;
        
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

function updateSectionFilterIndicator(header, sectionId) {
    let indicator = header.querySelector('.filter-indicator');
    
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'filter-indicator';
        header.appendChild(indicator);
    }
    
    const activeFilters = getActiveFiltersForSection(sectionId);
    
    if (activeFilters.length > 0) {
        indicator.textContent = ` (Filtered: ${activeFilters.join(', ')})`;
        indicator.style.color = 'var(--color-primary)';
    } else {
        indicator.textContent = '';
    }
}

function getActiveFiltersForSection(sectionId) {
    const activeFilters = [];
    const filters = dashboardState.filters;
    
    if (filters.state !== 'all') activeFilters.push(`State: ${filters.state}`);
    if (filters.risk !== 'all') activeFilters.push(`Risk: ${filters.risk}`);
    if (filters.trimester !== 'all') activeFilters.push(`Trimester: ${filters.trimester}`);
    
    return activeFilters;
}

// Interactive feature functions
function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function addKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'r':
                    event.preventDefault();
                    handleResetFilters();
                    break;
                case 'e':
                    event.preventDefault();
                    handleExportData();
                    break;
            }
        }
    });
}

// Export functionality
function generateExportData() {
    const filteredData = getFilteredData();
    const exportData = {
        filters: dashboardState.filters,
        timestamp: new Date().toISOString(),
        data: filteredData
    };
    
    return exportData;
}

function getFilteredData() {
    let filteredData = { ...dashboardState.data };
    
    if (dashboardState.filters.state !== 'all') {
        filteredData.stateData = filteredData.stateData.filter(
            state => state.state === dashboardState.filters.state
        );
    }
    
    if (dashboardState.filters.risk !== 'all') {
        filteredData.riskLevels = filteredData.riskLevels.filter(
            risk => risk.level === dashboardState.filters.risk
        );
    }
    
    if (dashboardState.filters.trimester !== 'all') {
        filteredData.trimesterData = filteredData.trimesterData.filter(
            trimester => trimester.trimester === dashboardState.filters.trimester
        );
    }
    
    return filteredData;
}

function convertToCSV(data) {
    let csv = 'Section,Metric,Value,Details\n';
    
    data.data.diabetesTypes.forEach(type => {
        csv += `Population,${type.type},${type.cases_millions}M,${type.percentage}%\n`;
    });
    
    data.data.trimesterData.forEach(trimester => {
        csv += `GDM,${trimester.trimester},${trimester.gdm_percentage}%,${trimester.at_risk_patients} at risk\n`;
    });
    
    data.data.riskLevels.forEach(risk => {
        csv += `Risk,${risk.level},${risk.patient_count},Diabetes: ${risk.diabetes_prev}% GDM: ${risk.gdm_risk}%\n`;
    });
    
    data.data.stateData.forEach(state => {
        csv += `Geographic,${state.state},${state.aspr},DALY: ${state.daly} Growth: ${state.growth}%\n`;
    });
    
    return csv;
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Utility functions
function showTooltip(event) {
    console.log('Showing tooltip');
}

function hideTooltip(event) {
    console.log('Hiding tooltip');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '1000';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    
    switch(type) {
        case 'success':
            notification.style.backgroundColor = 'var(--color-success)';
            break;
        case 'error':
            notification.style.backgroundColor = 'var(--color-error)';
            break;
        case 'warning':
            notification.style.backgroundColor = 'var(--color-warning)';
            break;
        default:
            notification.style.backgroundColor = 'var(--color-info)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

function logFilterChange(filterType, value) {
    console.log(`Filter changed - ${filterType}: ${value}`);
}

// Export functions for external use
window.DiabetesDashboard = {
    updateDashboard,
    exportData: handleExportData,
    resetFilters: handleResetFilters,
    getState: () => dashboardState
};