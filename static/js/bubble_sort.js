// Game State
const state = {
    difficulty: 'easy',
    sessionTimeLeft: 420, // 7 minutes
    roundTimeLeft: 15,
    sessionTimerId: null,
    roundTimerId: null,
    currentBubbles: [],
    selectionOrder: [],
    stats: {
        played: 0,
        correct: 0,
        wrong: 0
    },
    isRunning: false
};

// DOM Elements
const screens = {
    instructions: document.getElementById('instructions-screen'),
    gameplay: document.getElementById('gameplay-screen'),
    results: document.getElementById('results-screen')
};

const bubblesContainer = document.getElementById('bubbles-container');
const roundDisplay = document.getElementById('round-display');
const roundTimeText = document.getElementById('round-time-text');
const timerRing = document.getElementById('timer-ring');
const sessionTimerContainer = document.getElementById('session-timer-container');
const sessionProgress = document.getElementById('session-progress');
const sessionTimeDisplay = document.getElementById('session-time-display');

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Difficulty Buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.difficulty = e.target.dataset.level;
        });
    });

    // Start Button
    document.getElementById('start-btn').addEventListener('click', startGame);

    // Stop/Submit Button
    document.getElementById('stop-btn').addEventListener('click', endGame);

    // Play Again Button
    document.getElementById('play-again-btn').addEventListener('click', () => {
        resetGame();
        switchScreen('instructions');
    });

    // Sidebar Logic (Results Screen trigger)
    const sidebar = document.getElementById('global-sidebar');
    const overlay = document.getElementById('global-sidebar-overlay');
    const openBtn = document.getElementById('open-sidebar-btn');
    
    if (openBtn && sidebar && overlay) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });
    }
});

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    
    if (screenName === 'gameplay') {
        sessionTimerContainer.classList.remove('hidden');
    } else {
        sessionTimerContainer.classList.add('hidden');
    }
}

// Game Flow
function startGame() {
    state.stats = { played: 0, correct: 0, wrong: 0 };
    state.sessionTimeLeft = 420;
    state.isRunning = true;
    
    switchScreen('gameplay');
    startSessionTimer();
    startRound();
}

function startRound() {
    if (!state.isRunning) return;

    state.stats.played++;
    roundDisplay.textContent = state.stats.played;
    state.selectionOrder = [];
    
    generateBubbles();
    startRoundTimer();
}

function endGame() {
    state.isRunning = false;
    clearInterval(state.sessionTimerId);
    clearInterval(state.roundTimerId);
    
    updateResults();
    switchScreen('results');
}

function resetGame() {
    clearInterval(state.sessionTimerId);
    clearInterval(state.roundTimerId);
    state.isRunning = false;
    timerRing.style.strokeDashoffset = '0';
    timerRing.classList.remove('warning');
}

// Expression Generation
function generateExpression(targetValue, operators) {
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a, b;

    switch (op) {
        case '+':
            a = Math.floor(Math.random() * (targetValue + 20)) - 10;
            b = targetValue - a;
            return `${a} + ${b}`;
        case '−':
            b = Math.floor(Math.random() * 20) - 10;
            a = targetValue + b;
            return `${a} − ${b}`;
        case '×':
            // Find factors
            const factors = [];
            for (let i = 1; i <= Math.abs(targetValue); i++) {
                if (targetValue % i === 0) factors.push(i);
            }
            if (factors.length === 0 || targetValue === 0) {
                a = 0; b = Math.floor(Math.random() * 10);
                return `${a} × ${b}`;
            }
            a = factors[Math.floor(Math.random() * factors.length)];
            b = targetValue / a;
            // Randomly flip signs if target is positive
            if (targetValue > 0 && Math.random() > 0.5) {
                a = -a; b = -b;
            }
            return `${a} × ${b}`;
        case '÷':
            b = Math.floor(Math.random() * 9) + 1; // 1 to 9
            if (Math.random() > 0.5) b = -b;
            a = targetValue * b;
            return `${a} ÷ ${b}`;
    }
}

function generateBubbles() {
    let min, max, operators;
    
    if (state.difficulty === 'easy') {
        min = -10; max = 10; operators = ['+', '−'];
    } else if (state.difficulty === 'medium') {
        min = 10; max = 50; operators = ['+', '−', '×'];
    } else {
        min = 50; max = 100; operators = ['+', '−', '×', '÷'];
    }

    // Generate 3 unique target values
    const targets = new Set();
    while (targets.size < 3) {
        targets.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    state.currentBubbles = Array.from(targets).map(val => ({
        value: val,
        expression: generateExpression(val, operators),
        id: Math.random().toString(36).substr(2, 9)
    }));

    // Sort to determine correct order, then shuffle for display
    const sortedValues = [...state.currentBubbles].map(b => b.value).sort((a, b) => a - b);
    state.currentBubbles.forEach(b => {
        b.correctRank = sortedValues.indexOf(b.value);
    });

    // Shuffle
    state.currentBubbles.sort(() => Math.random() - 0.5);

    renderBubbles();
}

// UI Rendering
function renderBubbles() {
    bubblesContainer.innerHTML = '';
    
    state.currentBubbles.forEach((bubbleData) => {
        const b = document.createElement('div');
        b.className = 'bubble';
        b.dataset.id = bubbleData.id;
        b.dataset.rank = bubbleData.correctRank;
        
        b.innerHTML = `<span class="expression">${bubbleData.expression}</span>`;
        
        b.addEventListener('click', handleBubbleClick);
        bubblesContainer.appendChild(b);
    });
}

// Interaction
function handleBubbleClick(e) {
    if (!state.isRunning) return;
    
    const bubble = e.currentTarget;
    if (bubble.classList.contains('selected')) return; // Already clicked

    const expectedRank = state.selectionOrder.length;
    const actualRank = parseInt(bubble.dataset.rank);

    if (actualRank === expectedRank) {
        // Correct selection
        bubble.classList.add('selected');
        
        const badge = document.createElement('div');
        badge.className = 'bubble-badge';
        badge.textContent = expectedRank + 1;
        bubble.appendChild(badge);

        state.selectionOrder.push(bubble.dataset.id);

        // Check if round won
        if (state.selectionOrder.length === 3) {
            handleRoundComplete(true);
        }
    } else {
        // Wrong selection
        bubble.classList.add('shake');
        setTimeout(() => bubble.classList.remove('shake'), 500);
        handleRoundComplete(false);
    }
}

function handleRoundComplete(isCorrect) {
    clearInterval(state.roundTimerId);
    
    if (isCorrect) {
        state.stats.correct++;
    } else {
        state.stats.wrong++;
    }

    // Brief pause before next round
    setTimeout(() => {
        startRound();
    }, 800);
}

// Timers
function startSessionTimer() {
    updateSessionDisplay();
    state.sessionTimerId = setInterval(() => {
        state.sessionTimeLeft--;
        updateSessionDisplay();
        
        if (state.sessionTimeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateSessionDisplay() {
    const m = Math.floor(state.sessionTimeLeft / 60).toString().padStart(2, '0');
    const s = (state.sessionTimeLeft % 60).toString().padStart(2, '0');
    sessionTimeDisplay.textContent = `${m}:${s}`;
    
    const percent = (state.sessionTimeLeft / 420) * 100;
    sessionProgress.style.width = `${percent}%`;
    
    if (state.sessionTimeLeft < 60) {
        sessionProgress.style.background = 'var(--error)';
    } else {
        sessionProgress.style.background = 'linear-gradient(90deg, var(--primary), #c084fc)';
    }
}

function startRoundTimer() {
    clearInterval(state.roundTimerId);
    state.roundTimeLeft = 15;
    roundTimeText.textContent = '15';
    timerRing.style.transition = 'none';
    timerRing.style.strokeDashoffset = '0';
    timerRing.classList.remove('warning');
    
    // Force reflow
    void timerRing.offsetWidth;
    
    timerRing.style.transition = 'stroke-dashoffset 1s linear';
    
    state.roundTimerId = setInterval(() => {
        state.roundTimeLeft--;
        roundTimeText.textContent = state.roundTimeLeft;
        
        const offset = 113 - (state.roundTimeLeft / 15) * 113;
        timerRing.style.strokeDashoffset = offset;

        if (state.roundTimeLeft <= 5) {
            timerRing.classList.add('warning');
            roundTimeText.style.color = 'var(--error)';
        } else {
            roundTimeText.style.color = 'var(--text-main)';
        }

        if (state.roundTimeLeft <= 0) {
            // Time up
            handleRoundComplete(false);
        }
    }, 1000);
}

// Results
function updateResults() {
    // Count up animation for stats
    animateValue('stat-played', 0, state.stats.played, 1000);
    animateValue('stat-correct', 0, state.stats.correct, 1000);
    animateValue('stat-wrong', 0, state.stats.wrong, 1000);
    
    let acc = 0;
    if (state.stats.played > 0) {
        acc = (state.stats.correct / state.stats.played) * 100;
    }
    
    const accElement = document.getElementById('stat-accuracy');
    animateValue('stat-accuracy', 0, acc, 1000, true);
}

function animateValue(id, start, end, duration, isPercentage = false) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let current = Math.floor(progress * (end - start) + start);
        if (isPercentage) current = current.toFixed(1);
        obj.innerHTML = current + (isPercentage ? '%' : '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Ensure exact final value
            obj.innerHTML = (isPercentage ? end.toFixed(1) : end) + (isPercentage ? '%' : '');
        }
    };
    window.requestAnimationFrame(step);
}
