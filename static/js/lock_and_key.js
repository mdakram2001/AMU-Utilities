/**
 * Lock & Key Memory Game Engine
 * Directional & Spatial Memory Assessment Simulation
 * Features Procedural Spaced-Barrier Randomization
 */

// Level Profiles
const LEVEL_PROFILES = {
    1: { id: 1, name: "Level 1", size: 3, targetBarriers: 3, minPathLen: 5 },
    2: { id: 2, name: "Level 2", size: 3, targetBarriers: 3, minPathLen: 6 },
    3: { id: 3, name: "Level 3", size: 4, targetBarriers: 4, minPathLen: 8 },
    4: { id: 4, name: "Level 4", size: 4, targetBarriers: 5, minPathLen: 10 },
    5: { id: 5, name: "Level 5", size: 5, targetBarriers: 7, minPathLen: 12 }
};

// Game State
const gameState = {
    currentLevel: 1,
    levelData: null,
    playerPos: { r: 0, c: 0 },
    hasKey: false,
    attempts: 0,
    isShowingSolution: false,
    isLocked: false
};

// DOM Elements Cache
let elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    initEventListeners();
    loadRandomLevel(1);
    window.addEventListener('resize', debounce(repositionBarriers, 100));
});

function cacheDOMElements() {
    elements = {
        grid: document.getElementById('game-grid'),
        barriersOverlay: document.getElementById('barriers-overlay'),
        objectiveTitle: document.getElementById('objective-title'),
        objectiveStatus: document.getElementById('objective-status'),
        attemptCounter: document.getElementById('attempt-counter'),
        levelButtons: document.querySelectorAll('.lvl-btn'),
        resetBtn: document.getElementById('reset-level-btn'),
        randomizeBtn: document.getElementById('randomize-btn'),
        solutionBtn: document.getElementById('solution-btn'),
        dpadButtons: document.querySelectorAll('.dpad-btn')
    };
}

function initEventListeners() {
    // Level Selector Buttons
    elements.levelButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lvl = parseInt(e.currentTarget.dataset.level);
            loadRandomLevel(lvl);
        });
    });

    // Reset Level (resets player to start of CURRENT randomized board)
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            resetCurrentLevel();
            // if (typeof showToast === 'function') {
            //     showToast('Reset to start. Remember the barrier locations!', 'success');
            // }
        });
    }

    // New Board Randomize Button (generates a BRAND NEW random board for current level)
    if (elements.randomizeBtn) {
        elements.randomizeBtn.addEventListener('click', () => {
            loadRandomLevel(gameState.currentLevel);
            // if (typeof showToast === 'function') {
            //     showToast(`🎲 Generated new random Level ${gameState.currentLevel} puzzle!`, 'success');
            // }
        });
    }

    // Solution Path Toggle
    if (elements.solutionBtn) {
        elements.solutionBtn.addEventListener('click', () => {
            toggleSolutionPath();
        });
    }

    // Keyboard Arrow Controls
    window.addEventListener('keydown', handleKeyDown);

    // D-Pad Touch / Click Controls
    elements.dpadButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dir = e.currentTarget.dataset.dir;
            if (dir) movePlayerInDirection(dir);
        });
    });
}

/**
 * Procedural Level Generator with Spaced Barriers:
 * 1. Places Start, Key, and Door with proper spatial separation.
 * 2. Generates barriers that never share a vertex (corner) and never share incident cells (at least 1 block away).
 * 3. Uses BFS to guarantee full solvability and non-trivial path length.
 */
function generateRandomLevel(levelNum) {
    const profile = LEVEL_PROFILES[levelNum] || LEVEL_PROFILES[1];
    const size = profile.size;

    let bestLevel = null;
    let maxPathFound = -1;

    for (let attempt = 0; attempt < 80; attempt++) {
        // 1. Pick Start, Key, and Door
        const { startPos, keyPos, doorPos } = pickPointsWithSpacing(size);

        // 2. Candidate internal edges
        const candidateEdges = [];

        // Horizontal edges: between (r, c) and (r+1, c)
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size; c++) {
                candidateEdges.push({
                    type: 'H',
                    r,
                    c,
                    from: { r, c },
                    to: { r: r + 1, c },
                    // Grid vertices (endpoints)
                    endpoints: [`${r + 1},${c}`, `${r + 1},${c + 1}`],
                    // Incident cells
                    cells: [`${r},${c}`, `${r + 1},${c}`]
                });
            }
        }

        // Vertical edges: between (r, c) and (r, c+1)
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size - 1; c++) {
                candidateEdges.push({
                    type: 'V',
                    r,
                    c,
                    from: { r, c },
                    to: { r, c: c + 1 },
                    // Grid vertices (endpoints)
                    endpoints: [`${r},${c + 1}`, `${r + 1},${c + 1}`],
                    // Incident cells
                    cells: [`${r},${c}`, `${r},${c + 1}`]
                });
            }
        }

        shuffleArray(candidateEdges);

        const chosenBarriers = [];
        const usedEndpoints = new Set();
        const usedCells = new Set();
        const blockedMoves = new Set();

        for (const edge of candidateEdges) {
            if (chosenBarriers.length >= profile.targetBarriers) break;

            // Check Rule 1: No shared endpoints/vertices (cannot connect at corners)
            const sharesVertex = edge.endpoints.some(ep => usedEndpoints.has(ep));
            if (sharesVertex) continue;

            // Check Rule 2: No shared incident cells (must be one block away, at most 1 barrier per cell)
            const sharesCell = edge.cells.some(cell => usedCells.has(cell));
            if (sharesCell) continue;

            // Temporarily add barrier to test solvability
            const moveFwd = `${edge.from.r},${edge.from.c}->${edge.to.r},${edge.to.c}`;
            const moveRev = `${edge.to.r},${edge.to.c}->${edge.from.r},${edge.from.c}`;
            blockedMoves.add(moveFwd);
            blockedMoves.add(moveRev);

            // Test if paths still exist
            const pathStartToKey = findShortestPath(startPos, keyPos, size, blockedMoves);
            const pathKeyToDoor = findShortestPath(keyPos, doorPos, size, blockedMoves);

            if (pathStartToKey && pathKeyToDoor) {
                // Accept barrier
                chosenBarriers.push({
                    ...edge,
                    key: getBarrierKey(edge.from, edge.to)
                });
                edge.endpoints.forEach(ep => usedEndpoints.add(ep));
                edge.cells.forEach(c => usedCells.add(c));
            } else {
                // Revert
                blockedMoves.delete(moveFwd);
                blockedMoves.delete(moveRev);
            }
        }

        // Validate complete solution path
        const pathStartToKey = findShortestPath(startPos, keyPos, size, blockedMoves);
        const pathKeyToDoor = findShortestPath(keyPos, doorPos, size, blockedMoves);

        if (pathStartToKey && pathKeyToDoor) {
            const combinedSolution = [...pathStartToKey, ...pathKeyToDoor.slice(1)];
            const totalLen = combinedSolution.length;

            const candidateResult = {
                id: levelNum,
                name: profile.name,
                size,
                startPos,
                keyPos,
                doorPos,
                barriersList: chosenBarriers,
                blockedMoves,
                solutionPath: combinedSolution
            };

            if (chosenBarriers.length >= Math.min(2, profile.targetBarriers) && totalLen >= profile.minPathLen) {
                return candidateResult; // Great match found!
            }

            if (totalLen > maxPathFound) {
                maxPathFound = totalLen;
                bestLevel = candidateResult;
            }
        }
    }

    // Return best randomized level found
    if (bestLevel) return bestLevel;

    // Guaranteed random fallback if strict path length wasn't reached
    return generateSimpleRandomLevel(levelNum);
}

function pickPointsWithSpacing(size) {
    const minSK = size >= 4 ? 3 : 2;
    const minKD = size >= 4 ? 3 : 2;
    const minSD = size >= 4 ? 2 : 2;

    for (let i = 0; i < 60; i++) {
        const startPos = { r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };
        const keyPos = { r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };
        const doorPos = { r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };

        // Ensure completely distinct cells
        if ((startPos.r === keyPos.r && startPos.c === keyPos.c) ||
            (keyPos.r === doorPos.r && keyPos.c === doorPos.c) ||
            (startPos.r === doorPos.r && startPos.c === doorPos.c)) {
            continue;
        }

        const dSK = manhattanDist(startPos, keyPos);
        const dKD = manhattanDist(keyPos, doorPos);
        const dSD = manhattanDist(startPos, doorPos);

        if (dSK >= minSK && dKD >= minKD && dSD >= minSD) {
            return { startPos, keyPos, doorPos };
        }
    }

    // If spacing condition too tight, pick any 3 distinct random cells
    const allCells = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            allCells.push({ r, c });
        }
    }
    shuffleArray(allCells);
    return {
        startPos: allCells[0],
        keyPos: allCells[1],
        doorPos: allCells[2]
    };
}

function generateSimpleRandomLevel(levelNum) {
    const profile = LEVEL_PROFILES[levelNum] || LEVEL_PROFILES[1];
    const size = profile.size;
    const { startPos, keyPos, doorPos } = pickPointsWithSpacing(size);
    const blockedMoves = new Set();
    const pathSK = findShortestPath(startPos, keyPos, size, blockedMoves) || [startPos, keyPos];
    const pathKD = findShortestPath(keyPos, doorPos, size, blockedMoves) || [keyPos, doorPos];
    return {
        id: levelNum,
        name: profile.name,
        size,
        startPos,
        keyPos,
        doorPos,
        barriersList: [],
        blockedMoves,
        solutionPath: [...pathSK, ...pathKD.slice(1)]
    };
}

function manhattanDist(p1, p2) {
    return Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
}

function getBarrierKey(from, to) {
    const p1 = `${from.r},${from.c}`;
    const p2 = `${to.r},${to.c}`;
    return p1 < p2 ? `${p1}<->${p2}` : `${p2}<->${p1}`;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/**
 * BFS Shortest Path finding avoiding blocked moves
 */
function findShortestPath(start, goal, size, blockedMoves) {
    if (start.r === goal.r && start.c === goal.c) return [start];

    const queue = [[start]];
    const visited = new Set([`${start.r},${start.c}`]);

    const deltas = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
    ];

    while (queue.length > 0) {
        const path = queue.shift();
        const curr = path[path.length - 1];

        if (curr.r === goal.r && curr.c === goal.c) {
            return path;
        }

        for (const { dr, dc } of deltas) {
            const nextR = curr.r + dr;
            const nextC = curr.c + dc;
            const keyStr = `${nextR},${nextC}`;

            // Bounds check
            if (nextR < 0 || nextR >= size || nextC < 0 || nextC >= size) continue;
            if (visited.has(keyStr)) continue;

            // Move block check
            const moveKey = `${curr.r},${curr.c}->${nextR},${nextC}`;
            if (blockedMoves.has(moveKey)) continue;

            visited.add(keyStr);
            queue.push([...path, { r: nextR, c: nextC }]);
        }
    }

    return null; // No path
}


/**
 * Load a fresh randomized level
 */
function loadRandomLevel(levelNum) {
    gameState.currentLevel = levelNum;
    gameState.levelData = generateRandomLevel(levelNum);
    const config = gameState.levelData;

    gameState.playerPos = { ...config.startPos };
    gameState.hasKey = false;
    gameState.attempts = 0;
    gameState.isShowingSolution = false;
    gameState.isLocked = false;

    // Update Level Buttons active state
    elements.levelButtons.forEach(btn => {
        if (parseInt(btn.dataset.level) === levelNum) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (elements.solutionBtn) {
        elements.solutionBtn.classList.remove('active');
    }

    // Update UI Texts
    updateObjectiveUI();
    if (elements.attemptCounter) {
        elements.attemptCounter.textContent = gameState.attempts;
    }

    // Update Grid Classes
    elements.grid.className = `game-grid grid-${config.size}x${config.size}`;

    // Render Board & Barriers
    renderGrid();
    renderBarriers();
}

/**
 * Reset player to start of CURRENT board (preserves barriers so player can test memory)
 */
function resetCurrentLevel() {
    if (!gameState.levelData) return;
    const config = gameState.levelData;

    gameState.playerPos = { ...config.startPos };
    gameState.hasKey = false;
    gameState.isShowingSolution = false;
    gameState.isLocked = false;

    if (elements.solutionBtn) {
        elements.solutionBtn.classList.remove('active');
    }

    updateObjectiveUI();
    renderGrid();
    renderBarriers();
}

function renderGrid() {
    const config = gameState.levelData;
    if (!config) return;

    elements.grid.innerHTML = '';

    for (let r = 0; r < config.size; r++) {
        for (let c = 0; c < config.size; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            const isPlayer = (r === gameState.playerPos.r && c === gameState.playerPos.c);
            const isStart = (r === config.startPos.r && c === config.startPos.c);
            const isKey = (r === config.keyPos.r && c === config.keyPos.c && !gameState.hasKey);
            const isDoor = (r === config.doorPos.r && c === config.doorPos.c);

            if (isStart) {
                cell.classList.add('start-marker');
            }

            if (isPlayer) {
                cell.classList.add('player-cell');
                cell.innerHTML = '<span class="cell-icon player-icon">👤</span>';
            } else if (isKey) {
                cell.innerHTML = '<span class="cell-icon key-icon">🔑</span>';
            } else if (isDoor) {
                cell.innerHTML = '<span class="cell-icon door-icon">🚪</span>';
            }

            // Click cell to move (if adjacent)
            cell.addEventListener('click', () => {
                handleCellClick(r, c);
            });

            elements.grid.appendChild(cell);
        }
    }

    if (gameState.isShowingSolution) {
        highlightSolutionPath();
    }
}

/**
 * Render barrier lines in gaps between adjacent cells
 */
function renderBarriers() {
    if (!elements.barriersOverlay || !gameState.levelData) return;

    elements.barriersOverlay.innerHTML = '';
    const barriers = gameState.levelData.barriersList;

    // Small timeout ensures DOM layout and offsets are completely resolved
    requestAnimationFrame(() => {
        repositionBarriers();
    });
}

function repositionBarriers() {
    if (!elements.barriersOverlay || !gameState.levelData) return;

    elements.barriersOverlay.innerHTML = '';
    const barriers = gameState.levelData.barriersList;

    barriers.forEach(barrier => {
        const cellFrom = elements.grid.querySelector(`.grid-cell[data-row="${barrier.from.r}"][data-col="${barrier.from.c}"]`);
        const cellTo = elements.grid.querySelector(`.grid-cell[data-row="${barrier.to.r}"][data-col="${barrier.to.c}"]`);

        if (!cellFrom || !cellTo) return;

        const barrierDiv = document.createElement('div');
        barrierDiv.className = 'barrier-line';
        barrierDiv.dataset.barrierKey = barrier.key;

        if (barrier.type === 'H') {
            // Horizontal barrier sitting between row r and r+1
            const cellTop = barrier.from.r < barrier.to.r ? cellFrom : cellTo;
            const cellBottom = barrier.from.r < barrier.to.r ? cellTo : cellFrom;

            const top = cellTop.offsetTop + cellTop.offsetHeight;
            const height = Math.max(4, cellBottom.offsetTop - top);
            const left = cellTop.offsetLeft;
            const width = cellTop.offsetWidth;

            barrierDiv.style.left = `${left}px`;
            barrierDiv.style.top = `${top}px`;
            barrierDiv.style.width = `${width}px`;
            barrierDiv.style.height = `${height}px`;
        } else {
            // Vertical barrier sitting between col c and c+1
            const cellLeft = barrier.from.c < barrier.to.c ? cellFrom : cellTo;
            const cellRight = barrier.from.c < barrier.to.c ? cellTo : cellFrom;

            const left = cellLeft.offsetLeft + cellLeft.offsetWidth;
            const width = Math.max(4, cellRight.offsetLeft - left);
            const top = cellLeft.offsetTop;
            const height = cellLeft.offsetHeight;

            barrierDiv.style.left = `${left}px`;
            barrierDiv.style.top = `${top}px`;
            barrierDiv.style.width = `${width}px`;
            barrierDiv.style.height = `${height}px`;
        }

        if (gameState.isShowingSolution) {
            barrierDiv.classList.add('visible');
        }

        elements.barriersOverlay.appendChild(barrierDiv);
    });
}

function handleCellClick(targetR, targetC) {
    if (gameState.isLocked) return;

    const dr = targetR - gameState.playerPos.r;
    const dc = targetC - gameState.playerPos.c;

    // Must be orthogonal neighbor (Manhattan distance == 1)
    if (Math.abs(dr) + Math.abs(dc) === 1) {
        attemptMove(targetR, targetC);
    }
}

function handleKeyDown(e) {
    if (gameState.isLocked) return;

    let dir = null;
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            dir = 'up';
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            dir = 'down';
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            dir = 'left';
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            dir = 'right';
            break;
    }

    if (dir) {
        e.preventDefault();
        movePlayerInDirection(dir);
    }
}

function movePlayerInDirection(dir) {
    if (gameState.isLocked || !gameState.levelData) return;

    let { r, c } = gameState.playerPos;
    if (dir === 'up') r--;
    else if (dir === 'down') r++;
    else if (dir === 'left') c--;
    else if (dir === 'right') c++;

    const config = gameState.levelData;
    // Check bounds
    if (r >= 0 && r < config.size && c >= 0 && c < config.size) {
        attemptMove(r, c);
    }
}

function attemptMove(targetR, targetC) {
    const config = gameState.levelData;
    const fromR = gameState.playerPos.r;
    const fromC = gameState.playerPos.c;
    const moveKey = `${fromR},${fromC}->${targetR},${targetC}`;
    const barrierKey = getBarrierKey({ r: fromR, c: fromC }, { r: targetR, c: targetC });

    // Check if move is blocked by invisible barrier
    if (config.blockedMoves.has(moveKey)) {
        triggerBarrierBump(barrierKey, targetR, targetC);
        return;
    }

    // Check if moving to Door without key
    if (targetR === config.doorPos.r && targetC === config.doorPos.c && !gameState.hasKey) {
        triggerDoorBump(targetR, targetC);
        return;
    }

    // Move is valid
    gameState.playerPos = { r: targetR, c: targetC };

    // Check Key collection
    if (targetR === config.keyPos.r && targetC === config.keyPos.c && !gameState.hasKey) {
        gameState.hasKey = true;
        updateObjectiveUI();
        // if (typeof showToast === 'function') {
        //     showToast('🔑 Key Collected! Now reach the exit door.', 'success');
        // }
    }

    // Check Door reach with key
    if (targetR === config.doorPos.r && targetC === config.doorPos.c && gameState.hasKey) {
        handleLevelWin();
        return;
    }

    renderGrid();
}

function triggerBarrierBump(barrierKey, targetR, targetC) {
    gameState.isLocked = true;
    gameState.attempts++;
    if (elements.attemptCounter) {
        elements.attemptCounter.textContent = gameState.attempts;
    }

    const config = gameState.levelData;

    // if (typeof showToast === 'function') {
    //     showToast('🔒 Blocked! Invisible barrier hit! Bouncing to start!', 'error');
    // }

    // Highlight target cell bump
    const cells = elements.grid.querySelectorAll('.grid-cell');
    cells.forEach(c => {
        if (parseInt(c.dataset.row) === targetR && parseInt(c.dataset.col) === targetC) {
            c.classList.add('locked-bump');
        }
    });

    // Flash the specific barrier line in bright red!
    const barrierEl = elements.barriersOverlay ? elements.barriersOverlay.querySelector(`[data-barrier-key="${barrierKey}"]`) : null;
    if (barrierEl) {
        barrierEl.classList.add('bump-flash');
        setTimeout(() => {
            if (!gameState.isShowingSolution) {
                barrierEl.classList.remove('bump-flash');
            }
        }, 750);
    }

    setTimeout(() => {
        // Reset player to starting position
        gameState.playerPos = { ...config.startPos };
        gameState.hasKey = false;
        gameState.isLocked = false;
        updateObjectiveUI();
        renderGrid();
    }, 600);
}

function triggerDoorBump(targetR, targetC) {
    gameState.isLocked = true;
    gameState.attempts++;
    if (elements.attemptCounter) {
        elements.attemptCounter.textContent = gameState.attempts;
    }

    const config = gameState.levelData;

    if (typeof showToast === 'function') {
        showToast('🚪 Door is locked! You must collect the key 🔑 first!', 'error');
    }

    const cells = elements.grid.querySelectorAll('.grid-cell');
    cells.forEach(c => {
        if (parseInt(c.dataset.row) === targetR && parseInt(c.dataset.col) === targetC) {
            c.classList.add('locked-bump');
        }
    });

    setTimeout(() => {
        gameState.playerPos = { ...config.startPos };
        gameState.isLocked = false;
        updateObjectiveUI();
        renderGrid();
    }, 600);
}

function handleLevelWin() {
    renderGrid();
    gameState.isLocked = true;

    elements.grid.classList.add('level-win-anim');

    if (typeof showToast === 'function') {
        showToast(`🎉 Level ${gameState.currentLevel} Completed in ${gameState.attempts} bumps!`, 'success');
    }

    setTimeout(() => {
        elements.grid.classList.remove('level-win-anim');
        gameState.isLocked = false;

        // Auto advance to next level with randomized puzzle
        const totalLevels = Object.keys(LEVEL_PROFILES).length;
        if (gameState.currentLevel < totalLevels) {
            loadRandomLevel(gameState.currentLevel + 1);
        } else {
            if (typeof showToast === 'function') {
                showToast('🏆 Mastered all 5 levels! Click "🎲 New Board" to keep practicing!', 'success');
            }
        }
    }, 1400);
}

function toggleSolutionPath() {
    gameState.isShowingSolution = !gameState.isShowingSolution;
    if (elements.solutionBtn) {
        elements.solutionBtn.classList.toggle('active', gameState.isShowingSolution);
    }

    // Toggle barrier visibility to match reference diagram
    const barrierLines = elements.barriersOverlay ? elements.barriersOverlay.querySelectorAll('.barrier-line') : [];
    barrierLines.forEach(line => {
        line.classList.toggle('visible', gameState.isShowingSolution);
    });

    if (gameState.isShowingSolution) {
        highlightSolutionPath();
        // if (typeof showToast === 'function') {
        //     showToast('Showing solution path (Green) and barrier walls (Red).', 'success');
        // }
    } else {
        renderGrid();
    }
}

function highlightSolutionPath() {
    if (!gameState.levelData) return;
    const path = gameState.levelData.solutionPath;
    const cells = elements.grid.querySelectorAll('.grid-cell');

    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);

        const inPath = path.some(p => p.r === r && p.c === c);
        if (inPath) {
            cell.classList.add('path-highlight');
        }
    });
}

function updateObjectiveUI() {
    if (!gameState.levelData || !elements.objectiveTitle) return;
    const config = gameState.levelData;
    const sizeStr = `${config.size}x${config.size}`;

    if (!gameState.hasKey) {
        elements.objectiveTitle.innerHTML = `Level ${gameState.currentLevel} (${sizeStr}) - <span class="highlight-objective" id="objective-status">Find Key!</span>`;
    } else {
        elements.objectiveTitle.innerHTML = `Level ${gameState.currentLevel} (${sizeStr}) - <span class="highlight-objective door-phase" id="objective-status">Go to Exit Door!</span>`;
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
