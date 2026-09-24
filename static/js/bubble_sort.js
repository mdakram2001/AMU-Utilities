/* bubble_sort.js – Game engine for the Bubble Sort practice game */

/* ------------------------------------------------------------
   Configuration – difficulty tiers & round settings
   ------------------------------------------------------------ */
const TOTAL_ROUNDS = 25;          // Total number of rounds per session
const ROUND_TIME_SEC = 15;        // Seconds per round (per spec: 15s per round)
const SESSION_TIME_SEC = 7 * 60; // 7‑minute overall session
const EPSILON = 1e-9;            // Tolerance for numeric comparisons

// Mapping of difficulty tier to allowed operators & value ranges.
// The player's choice on the instructions screen applies for the
// whole session (previously the buttons only changed their own
// visual state and had no effect on gameplay).
const DIFFICULTY_TIER = {
    easy: {
        ops: ['+', '-'],
        min: -10,
        max: 10
    },
    medium: {
        ops: ['+', '-', '×', '÷'],
        min: 10,
        max: 50
    },
    hard: {
        ops: ['+', '-', '×', '÷'],
        min: 50,
        max: 100
    }
};

/* ------------------------------------------------------------
   Game state & DOM cache
   ------------------------------------------------------------ */
const state = {
    round: 1,
    tier: 'easy',
    selectedDifficulty: 'easy',
    bubbles: [],          // [{id, expr, value}]
    selected: [],        // stack of bubble ids (order of taps)
    moveCount: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    isRunning: false,
    roundTimerId: null,
    sessionTimerId: null,
    roundSecondsLeft: ROUND_TIME_SEC,
    sessionSecondsLeft: SESSION_TIME_SEC,
    lastClickTimestamp: 0 // for debouncing rapid clicks
};

const dom = {
    // Screens
    instructionsScreen: document.getElementById('instructions-screen'),
    gameplayScreen: document.getElementById('gameplay-screen'),
    resultsScreen: document.getElementById('results-screen'),
    // Controls
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    diffButtons: document.querySelectorAll('.diff-btn'),
    // Status displays
    roundDisplay: document.getElementById('round-display'),
    tierBadge: document.getElementById('tier-badge'),
    timerRing: document.getElementById('timer-ring'),
    timerText: document.getElementById('round-time-text'),
    moveCounter: document.getElementById('move-counter'),
    streakDisplay: document.getElementById('streak-display'),
    // Session timer UI
    sessionTimerContainer: document.getElementById('session-timer-container'),
    sessionProgress: document.getElementById('session-progress'),
    sessionTimeDisplay: document.getElementById('session-time-display'),
    // Gameplay container
    bubblesContainer: document.getElementById('bubbles-container'),
    // Result stats
    statPlayed: document.getElementById('stat-played'),
    statCorrect: document.getElementById('stat-correct'),
    statWrong: document.getElementById('stat-wrong'),
    statAccuracy: document.getElementById('stat-accuracy'),
    statStreak: document.getElementById('stat-streak')
};

// Countdown ring geometry – computed once from the circle's radius (r=18)
// so the stroke can be animated as a proper depleting ring instead of a
// static circle that only changed color.
const TIMER_RADIUS = 18;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
if (dom.timerRing) {
    dom.timerRing.style.strokeDasharray = `${TIMER_CIRCUMFERENCE}`;
    dom.timerRing.style.strokeDashoffset = '0';
}

/* ------------------------------------------------------------
   Toast fallback – ensures feedback still works even if app.js
   (not shown here) hasn't defined a global showToast helper.
   ------------------------------------------------------------ */
if (typeof window.showToast !== 'function') {
    window.showToast = function (message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 2400);
    };
}

/* ------------------------------------------------------------
   Utility helpers
   ------------------------------------------------------------ */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomOperator(ops) {
    return ops[Math.floor(Math.random() * ops.length)];
}

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildExpression(tierConfig) {
    // Ensure unique values – regenerate if duplicate
    let expr = '';
    let value;
    const maxAttempts = 20;
    let attempts = 0;
    do {
        const a = randomInt(tierConfig.min, tierConfig.max);
        const b = randomInt(tierConfig.min, tierConfig.max);
        const op = randomOperator(tierConfig.ops);
        // Use Unicode symbols for display
        const displayOp = op === '*' ? '×' : op === '/' ? '÷' : op === '^' ? '^' : op;
        expr = `${a} ${displayOp} ${b}`;
        value = evaluateExpression(expr);
        attempts++;
    } while ((isNaN(value) || !isFinite(value)) && attempts < maxAttempts);
    return { expr, value };
}

function evaluateExpression(displayExpr) {
    // Convert display symbols to JS operators
    const jsExpr = displayExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**');
    try {
        // Use Function constructor for isolated evaluation
        // eslint-disable-next-line no-new-func
        return new Function(`return (${jsExpr});`)();
    } catch (e) {
        return NaN;
    }
}

function setRingColor(secondsLeft) {
    const ring = dom.timerRing;
    ring.classList.remove('low', 'mid', 'high', 'pulse-ring');
    if (secondsLeft <= 3) {
        ring.classList.add('low', 'pulse-ring');
    } else if (secondsLeft <= 6) {
        ring.classList.add('mid');
    } else {
        ring.classList.add('high'); // high uses default primary colour
    }
}

function updateRoundTimerDisplay() {
    dom.timerText.textContent = state.roundSecondsLeft;
    setRingColor(state.roundSecondsLeft);
    const offset = TIMER_CIRCUMFERENCE * (1 - state.roundSecondsLeft / ROUND_TIME_SEC);
    dom.timerRing.style.strokeDashoffset = `${offset}`;
}

function updateSessionTimerDisplay() {
    const percent = (state.sessionSecondsLeft / SESSION_TIME_SEC) * 100;
    dom.sessionProgress.style.width = `${percent}%`;
    dom.sessionProgress.classList.toggle('low-time', state.sessionSecondsLeft <= 60);
    dom.sessionTimeDisplay.textContent = formatTime(state.sessionSecondsLeft);
}

function updateMoveCounter() {
    dom.moveCounter.textContent = state.moveCount;
    // Add a brief bounce animation for feedback
    dom.moveCounter.classList.add('counter-bump');
    setTimeout(() => dom.moveCounter.classList.remove('counter-bump'), 300);
}

function updateStreakDisplay() {
    if (!dom.streakDisplay) return;
    dom.streakDisplay.textContent = state.streak;
    const wrap = dom.streakDisplay.closest('.streak-counter');
    if (wrap) {
        wrap.classList.remove('bump');
        void wrap.offsetWidth; // restart the animation
        wrap.classList.add('bump');
    }
}

/* ------------------------------------------------------------
   Timer logic – round & session
   ------------------------------------------------------------ */
function startRoundTimer() {
    clearInterval(state.roundTimerId);
    state.roundSecondsLeft = ROUND_TIME_SEC;
    updateRoundTimerDisplay();
    state.roundTimerId = setInterval(() => {
        state.roundSecondsLeft--;
        if (state.roundSecondsLeft <= 0) {
            clearInterval(state.roundTimerId);
            handleRoundTimeout();
        }
        updateRoundTimerDisplay();
    }, 1000);
}

function stopRoundTimer() {
    clearInterval(state.roundTimerId);
    state.roundTimerId = null;
}

function startSessionTimer() {
    clearInterval(state.sessionTimerId);
    state.sessionSecondsLeft = SESSION_TIME_SEC;
    updateSessionTimerDisplay();
    dom.sessionTimerContainer.classList.remove('hidden');
    state.sessionTimerId = setInterval(() => {
        state.sessionSecondsLeft--;
        if (state.sessionSecondsLeft <= 0) {
            clearInterval(state.sessionTimerId);
            endGame(); // session over
        }
        updateSessionTimerDisplay();
    }, 1000);
}

function stopSessionTimer() {
    clearInterval(state.sessionTimerId);
    state.sessionTimerId = null;
    dom.sessionTimerContainer.classList.add('hidden');
}

/* ------------------------------------------------------------
   Round generation & rendering
   ------------------------------------------------------------ */
function generateRound() {
    const tierKey = state.selectedDifficulty || 'easy';
    state.tier = tierKey;
    const tierCfg = DIFFICULTY_TIER[tierKey];
    const ids = ['bubble_1', 'bubble_2', 'bubble_3'];
    const bubbles = [];
    const usedValues = new Set();
    // Ensure three distinct numeric values
    while (bubbles.length < 3) {
        const { expr, value } = buildExpression(tierCfg);
        // Round to 3 decimals for comparison stability
        const rounded = Math.round(value * 1000) / 1000;
        if (usedValues.has(rounded)) continue;
        usedValues.add(rounded);
        bubbles.push({ id: ids[bubbles.length], expr, value: rounded });
    }
    state.bubbles = bubbles;
    state.selected = [];
    state.moveCount = 0;
    updateMoveCounter();
    renderBubbles();
    startRoundTimer();
    dom.roundDisplay.textContent = state.round;
    if (dom.tierBadge) {
        dom.tierBadge.textContent = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
        dom.tierBadge.className = `tier-badge tier-${tierKey}`;
    }
}

function renderBubbles() {
    dom.bubblesContainer.innerHTML = '';
    state.bubbles.forEach(b => {
        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'bubble';
        bubbleEl.dataset.id = b.id;
        bubbleEl.setAttribute('aria-label', `Expression: ${b.expr}`);
        bubbleEl.setAttribute('tabindex', '0'); // make focusable for keyboard
        bubbleEl.innerHTML = `
            <span class="bubble-expression">${b.expr}</span>
            <span class="bubble-badge"></span>
        `;
        bubbleEl.addEventListener('click', onBubbleClick);
        bubbleEl.addEventListener('keydown', onBubbleKeyDown);
        dom.bubblesContainer.appendChild(bubbleEl);
    });
}

/* ------------------------------------------------------------
   Interaction – bubble click & selection stack
   ------------------------------------------------------------ */
function onBubbleClick(e) {
    if (!state.isRunning) return;
    const now = Date.now();
    if (now - state.lastClickTimestamp < 150) return; // debounce
    state.lastClickTimestamp = now;
    const bubbleEl = e.currentTarget;
    const id = bubbleEl.dataset.id;

    // Undo if clicking the most‑recent selected bubble
    const topId = state.selected[state.selected.length - 1];
    if (id === topId) {
        // Undo
        state.selected.pop();
        bubbleEl.classList.remove('selected');
        hideBadge(bubbleEl);
        return;
    }
    // Ignore clicks on bubbles already selected but not on top
    if (state.selected.includes(id)) return;

    if (state.selected.length < 3) {
        state.selected.push(id);
        bubbleEl.classList.add('selected');
        showBadge(bubbleEl, state.selected.length);
        state.moveCount++;
        updateMoveCounter();
        if (state.selected.length === 3) {
            validateSelection();
        }
    }
}

function onBubbleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onBubbleClick(e);
    }
}

function showBadge(bubbleEl, order) {
    const badge = bubbleEl.querySelector('.bubble-badge');
    badge.textContent = order;
    badge.classList.add('visible');
}

function hideBadge(bubbleEl) {
    const badge = bubbleEl.querySelector('.bubble-badge');
    badge.textContent = '';
    badge.classList.remove('visible');
}

function clearSelection() {
    if (!state.isRunning || state.selected.length === 0) return;
    state.selected.forEach(id => {
        const el = dom.bubblesContainer.querySelector(`.bubble[data-id="${id}"]`);
        if (el) {
            el.classList.remove('selected');
            hideBadge(el);
        }
    });
    state.selected = [];
}

/* ------------------------------------------------------------
   Validation of selected order
   ------------------------------------------------------------ */
function validateSelection() {
    // Retrieve numeric values according to selection order
    const values = state.selected.map(id => {
        const b = state.bubbles.find(bub => bub.id === id);
        return b ? b.value : null;
    });
    const [v1, v2, v3] = values;
    const isAscending = (a, b) => (b - a) > EPSILON;
    const correct = isAscending(v1, v2) && isAscending(v2, v3);

    // Apply visual feedback to the three bubbles
    state.selected.forEach(id => {
        const el = dom.bubblesContainer.querySelector(`.bubble[data-id="${id}"]`);
        if (!el) return;
        el.classList.add(correct ? 'correct-flash' : 'incorrect-flash');
        setTimeout(() => el.classList.remove('correct-flash', 'incorrect-flash'), 800);
    });

    if (correct) {
        state.correct++;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        updateStreakDisplay();
        const message = state.streak >= 3 ? `🔥 ${state.streak} in a row!` : '✅ Correct order!';
        window.showToast(message, 'success');
    } else {
        state.wrong++;
        state.streak = 0;
        updateStreakDisplay();
        // Shake the whole bubble area for added feedback
        dom.bubblesContainer.classList.add('shake');
        setTimeout(() => dom.bubblesContainer.classList.remove('shake'), 500);
        window.showToast('❌ Incorrect order – try again!', 'error');
    }

    // Short pause then advance on correct or clear selection for retry
    setTimeout(() => {
        if (correct) {
            advanceRound();
        } else {
            clearSelection();
        }
    }, 800);
}

function handleRoundTimeout() {
    // Timeout before a correct selection – treat as wrong and move on
    state.wrong++;
    state.streak = 0;
    updateStreakDisplay();
    window.showToast('⏰ Time out! Moving to next round.', 'error');
    advanceRound();
}

/* ------------------------------------------------------------
   Advance round / end game
   ------------------------------------------------------------ */
function advanceRound() {
    stopRoundTimer();
    if (state.round >= TOTAL_ROUNDS) {
        endGame();
        return;
    }
    state.round++;
    generateRound();
}

function animateCountUp(el, target, suffix = '') {
    if (!el) return;
    if (prefersReducedMotion()) {
        el.textContent = `${target}${suffix}`;
        return;
    }
    const duration = 600;
    const start = performance.now();
    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.round(target * progress);
        el.textContent = `${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function launchConfetti() {
    const colors = ['#6366f1', '#c084fc', '#10b981', '#fb923c'];
    const count = 24;
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
        piece.style.animationDelay = `${Math.random() * 0.3}s`;
        document.body.appendChild(piece);
        piece.addEventListener('animationend', () => piece.remove());
    }
}

function endGame() {
    state.isRunning = false;
    stopRoundTimer();
    stopSessionTimer();
    // Populate result modal
    const totalFinished = state.correct + state.wrong;
    dom.statPlayed.textContent = Math.max(totalFinished, state.round);
    animateCountUp(dom.statCorrect, state.correct);
    animateCountUp(dom.statWrong, state.wrong);
    animateCountUp(dom.statStreak, state.bestStreak);
    const accuracy = totalFinished > 0 ? Math.round((state.correct / totalFinished) * 100) : 0;
    animateCountUp(dom.statAccuracy, accuracy, '%');

    // Switch screens
    dom.gameplayScreen.classList.add('hidden');
    dom.resultsScreen.classList.remove('hidden');

    if (accuracy >= 80 && !prefersReducedMotion()) {
        launchConfetti();
    }
}

/* ------------------------------------------------------------
   Event bindings & initialization
   ------------------------------------------------------------ */
function initEvents() {
    dom.startBtn.addEventListener('click', () => {
        // Hide instructions, show gameplay, start session
        dom.instructionsScreen.classList.add('hidden');
        dom.gameplayScreen.classList.remove('hidden');
        state.isRunning = true;
        startSessionTimer();
        state.round = 1;
        generateRound();
    });

    dom.stopBtn.addEventListener('click', endGame);
    dom.playAgainBtn.addEventListener('click', () => {
        // Reset all state and return to instructions screen
        state.correct = 0;
        state.wrong = 0;
        state.round = 1;
        state.streak = 0;
        state.bestStreak = 0;
        updateStreakDisplay();
        state.isRunning = false;
        dom.resultsScreen.classList.add('hidden');
        dom.instructionsScreen.classList.remove('hidden');
    });

    // Difficulty selection buttons – this now actually drives the
    // number range/operators used for the whole session, not just
    // the button's own highlighted state.
    dom.diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.diffButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedDifficulty = btn.dataset.level;
        });
    });

    // Esc clears the current picks for the round without waiting for
    // the timer or a wrong submission.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') clearSelection();
    });

    // The results screen's "Explore More" button opens the same
    // sidebar as the main menu toggle.
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('global-sidebar');
            const overlay = document.getElementById('global-sidebar-overlay');
            if (sidebar) sidebar.classList.add('open');
            if (overlay) overlay.classList.add('show');
        });
    }
}

// Kick off when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
});
