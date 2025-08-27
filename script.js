// Configuration
let config = {};

// DOM Elements
const elements = {
    aSlider: null,
    aInput: null,
    bSlider: null,
    bInput: null,
    cSlider: null,
    cInput: null,
    equationDisplay: null,
    vertexInfo: null,
    axisInfo: null,
    deltaInfo: null,
    solutionsInfo: null,
    solutionSteps: null,
    darkToggle: null,
    exportBtn: null,
    shareBtn: null,
    resetBtn: null,
    presetBtns: null,
    ctx: null
};

// App State
let chart;
let history = [];
let historyIndex = -1;

// Initialize app
async function init() {
    await loadConfig();
    initElements();
    setupEventListeners();
    loadFromURL();
    addToHistoryState();
    drawChart();
}

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        config = await response.json();
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback config
        config = {
            app: { defaultValues: { a: 1, b: -5, c: 6 } },
            presets: [],
            parameters: {
                a: { min: -5, max: 5, step: 0.1, color: "#ef4444" },
                b: { min: -10, max: 10, step: 0.1, color: "#22c55e" },
                c: { min: -10, max: 10, step: 0.1, color: "#3b82f6" }
            }
        };
    }
}

// Initialize DOM elements
function initElements() {
    elements.aSlider = document.getElementById('a-slider');
    elements.aInput = document.getElementById('a-input');
    elements.bSlider = document.getElementById('b-slider');
    elements.bInput = document.getElementById('b-input');
    elements.cSlider = document.getElementById('c-slider');
    elements.cInput = document.getElementById('c-input');
    elements.equationDisplay = document.getElementById('equation-display');
    elements.vertexInfo = document.getElementById('vertex-info');
    elements.axisInfo = document.getElementById('axis-info');
    elements.deltaInfo = document.getElementById('delta-info');
    elements.solutionsInfo = document.getElementById('solutions-info');
    elements.solutionSteps = document.getElementById('solution-steps');
    elements.darkToggle = document.getElementById('dark-toggle');
    elements.exportBtn = document.getElementById('export-btn');
    elements.shareBtn = document.getElementById('share-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.ctx = document.getElementById('parabolaChart').getContext('2d');
}

// Setup event listeners
function setupEventListeners() {
    // Dark mode toggle
    elements.darkToggle.addEventListener('click', toggleDarkMode);
    
    // Export functionality
    elements.exportBtn.addEventListener('click', exportChart);
    
    // Share functionality
    elements.shareBtn.addEventListener('click', shareURL);
    
    // Reset functionality
    elements.resetBtn.addEventListener('click', resetToDefaults);
    
    // Preset functionality
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const [a, b, c] = btn.dataset.preset.split(',').map(Number);
            setValues(a, b, c);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Input synchronization
    syncInputs(elements.aSlider, elements.aInput);
    syncInputs(elements.bSlider, elements.bInput);
    syncInputs(elements.cSlider, elements.cInput);
}

// Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    elements.darkToggle.textContent = isDark ? config.ui?.buttons?.darkModeActive || '☀️' : config.ui?.buttons?.darkMode || '🌙';
}

// Export chart
function exportChart() {
    const link = document.createElement('a');
    link.download = 'parabola.png';
    link.href = chart.toBase64Image();
    link.click();
}

// Share URL
function shareURL() {
    const a = parseFloat(elements.aInput.value);
    const b = parseFloat(elements.bInput.value);
    const c = parseFloat(elements.cInput.value);
    const url = `${window.location.origin}${window.location.pathname}?a=${a}&b=${b}&c=${c}`;
    navigator.clipboard.writeText(url).then(() => {
        elements.shareBtn.textContent = config.ui?.buttons?.shareSuccess || '✓';
        setTimeout(() => elements.shareBtn.textContent = config.ui?.buttons?.share || '🔗', 2000);
    });
}

// Reset to defaults
function resetToDefaults() {
    const defaults = config.app?.defaultValues || { a: 1, b: -5, c: 6 };
    setValues(defaults.a, defaults.b, defaults.c);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && historyIndex > 0) {
            e.preventDefault();
            historyIndex--;
            const state = history[historyIndex];
            setValues(state.a, state.b, state.c, false);
        } else if (e.key === 'y' && historyIndex < history.length - 1) {
            e.preventDefault();
            historyIndex++;
            const state = history[historyIndex];
            setValues(state.a, state.b, state.c, false);
        }
    }
}

// Set parameter values
function setValues(a, b, c, addToHistory = true) {
    elements.aSlider.value = elements.aInput.value = a;
    elements.bSlider.value = elements.bInput.value = b;
    elements.cSlider.value = elements.cInput.value = c;
    if (addToHistory) addToHistoryState();
    drawChart();
}

// Add state to history
function addToHistoryState() {
    const state = { 
        a: parseFloat(elements.aInput.value), 
        b: parseFloat(elements.bInput.value), 
        c: parseFloat(elements.cInput.value) 
    };
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    historyIndex = history.length - 1;
    if (history.length > 50) {
        history.shift();
        historyIndex--;
    }
}

// Synchronize inputs
function syncInputs(slider, input) {
    slider.addEventListener('input', (e) => {
        input.value = e.target.value;
        addToHistoryState();
        drawChart();
    });
    input.addEventListener('input', (e) => {
        let value = parseFloat(e.target.value);
        if (isNaN(value) || e.target.value === '') return;
        slider.value = value;
        addToHistoryState();
        drawChart();
    });
}

// Update equation display
function updateEquation(a, b, c) {
    let eq = 'y = ';
    if (a !== 1) eq += a === -1 ? '-' : a;
    eq += 'x²';
    if (b !== 0) eq += (b > 0 ? ' + ' : ' - ') + Math.abs(b) + 'x';
    if (c !== 0) eq += (c > 0 ? ' + ' : ' - ') + Math.abs(c);
    elements.equationDisplay.textContent = eq;
}

// Draw chart
function drawChart() {
    const a = parseFloat(elements.aInput.value);
    const b = parseFloat(elements.bInput.value);
    const c = parseFloat(elements.cInput.value);

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
        if(chart) chart.clear();
        return;
    }

    updateEquation(a, b, c);

    if (a === 0) {
        if(chart) chart.clear();
        elements.deltaInfo.textContent = config.ui?.messages?.zeroParameter || "Parameter 'a' cannot be zero.";
        return;
    }

    // Calculate vertex
    const vertexX = -b / (2 * a);
    const vertexY = a * vertexX * vertexX + b * vertexX + c;
    
    const chartConfig = config.chart || {};
    const colors = chartConfig.colors || {};
    const xRange = chartConfig.xRange || { min: -15, max: 15, step: 0.2 };
    
    const data = {
        labels: [],
        datasets: [{
            label: 'Parabola',
            data: [],
            borderColor: colors.parabola || '#3b82f6',
            borderWidth: chartConfig.options?.borderWidth || 3,
            tension: 0.1,
            pointRadius: 0,
            fill: false
        }, {
            label: 'Vertex',
            data: [{x: vertexX, y: vertexY}],
            backgroundColor: colors.vertex || '#8b5cf6',
            pointRadius: chartConfig.options?.pointRadius?.vertex || 8,
            pointHoverRadius: 10,
            type: 'scatter'
        }, {
            label: 'Solutions',
            data: [],
            backgroundColor: colors.solutions || '#ef4444',
            pointRadius: chartConfig.options?.pointRadius?.solutions || 6,
            pointHoverRadius: 8,
            type: 'scatter'
        }]
    };

    for (let x = xRange.min; x <= xRange.max; x += xRange.step) {
        data.labels.push(x.toFixed(2));
        data.datasets[0].data.push(a * x * x + b * x + c);
    }

    const delta = b * b - 4 * a * c;
    const solutions = [];
    
    // Update info displays
    elements.vertexInfo.textContent = `Vertex: (${vertexX.toFixed(2)}, ${vertexY.toFixed(2)})`;
    elements.axisInfo.textContent = `Axis of symmetry: x = ${vertexX.toFixed(2)}`;
    elements.deltaInfo.textContent = `Discriminant Δ = ${delta.toFixed(2)}`;
    
    // Solution steps
    let steps = [`Given: y = ${a}x² + ${b}x + ${c}`];
    steps.push(`Discriminant: Δ = b² - 4ac = ${b}² - 4(${a})(${c}) = ${delta.toFixed(2)}`);

    if (delta > 0) {
        const x1 = (-b - Math.sqrt(delta)) / (2 * a);
        const x2 = (-b + Math.sqrt(delta)) / (2 * a);
        solutions.push({x: x1, y: 0}, {x: x2, y: 0});
        elements.solutionsInfo.textContent = `Two solutions: x₁ = ${x1.toFixed(2)}, x₂ = ${x2.toFixed(2)}`;
        steps.push(`x₁ = (-${b} - √${delta.toFixed(2)}) / ${2*a} = ${x1.toFixed(2)}`);
        steps.push(`x₂ = (-${b} + √${delta.toFixed(2)}) / ${2*a} = ${x2.toFixed(2)}`);
    } else if (delta === 0) {
        const x0 = -b / (2 * a);
        solutions.push({x: x0, y: 0});
        elements.solutionsInfo.textContent = `One solution: x₀ = ${x0.toFixed(2)}`;
        steps.push(`x₀ = -${b} / ${2*a} = ${x0.toFixed(2)}`);
    } else {
        elements.solutionsInfo.textContent = config.ui?.messages?.noSolutions || "No real solutions";
        steps.push("No real solutions (Δ < 0)");
    }
    
    elements.solutionSteps.innerHTML = steps.map(step => `<div>${step}</div>`).join('');
    data.datasets[2].data = solutions;

    if (chart) chart.destroy();

    chart = new Chart(elements.ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `x = ${context[0].parsed.x}`;
                        },
                        label: function(context) {
                            return `y = ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: colors.grid || '#e5e7eb' },
                    title: { display: true, text: 'y' }
                },
                x: {
                    grid: { color: colors.grid || '#e5e7eb' },
                    title: { display: true, text: 'x' },
                    ticks: { maxTicksLimit: chartConfig.options?.maxTicks || 15 }
                }
            }
        }
    });
}

// Load from URL parameters
function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('a') && urlParams.has('b') && urlParams.has('c')) {
        setValues(
            parseFloat(urlParams.get('a')),
            parseFloat(urlParams.get('b')),
            parseFloat(urlParams.get('c'))
        );
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);