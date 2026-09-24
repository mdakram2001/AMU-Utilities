/**
 * 3x3 Grid Path Builder Game Engine
 * Accenture Assessment Simulation
 *
 * Core Mechanics:
 * - Click any cell in a 3x3 subgrid to select that 3x3 block.
 * - Black cells = active path slots (contain directional arrows or track dots '•').
 * - White cells = inactive slots.
 * - Change Layout (↔): Cycles through 6 predefined tile configurations where the fixed white
 *   cells stay constant and the contents of the black cells cycle through 6 states.
 * - Rotate (90° 🔄): Rotates the ENTIRE 3x3 block (both black/white cell positions and arrow directions).
 * - Directional Flow (✅): Validates continuous vector connection from Rocket (🚀) to Planet (🪐).
 */

// Arrow symbols & transformations
const ARROW_SYMBOLS = {
    'N': '↑',
    'E': '→',
    'S': '↓',
    'W': '←',
    'NE': '↗',
    'NW': '↖',
    'SE': '↘',
    'SW': '↙'
};

const ROTATE_CW = {
    'N': 'E',
    'E': 'S',
    'S': 'W',
    'W': 'N',
    'NE': 'SE',
    'SE': 'SW',
    'SW': 'NW',
    'NW': 'NE'
};

// Next step vector flow logic
// In this assessment game, an arrow defines the exit vector for that cell.
// Flow can turn 90 degrees into an arrow (e.g. from West into South ↓, or North into East →).
// Flow is only rejected if it enters backwards (180° reverse, against the arrow direction).
function getNextFlowStep(arrowType, entrySide) {
    switch (arrowType) {
        case 'E': // → (exits East; can enter from W, N, S; cannot enter from E backwards)
            if (entrySide === 'E') return null;
            return { dr: 0, dc: 1, nextEntry: 'W' };
        case 'W': // ← (exits West; can enter from E, N, S; cannot enter from W backwards)
            if (entrySide === 'W') return null;
            return { dr: 0, dc: -1, nextEntry: 'E' };
        case 'N': // ↑ (exits North; can enter from S, W, E; cannot enter from N backwards)
            if (entrySide === 'N') return null;
            return { dr: -1, dc: 0, nextEntry: 'S' };
        case 'S': // ↓ (exits South; can enter from N, W, E; cannot enter from S backwards)
            if (entrySide === 'S') return null;
            return { dr: 1, dc: 0, nextEntry: 'N' };

        // Diagonal turn arrows (if used)
        case 'NE': // ↗
            if (entrySide === 'W') return { dr: -1, dc: 0, nextEntry: 'S' };
            if (entrySide === 'S') return { dr: 0, dc: 1, nextEntry: 'W' };
            return null;
        case 'NW': // ↖
            if (entrySide === 'E') return { dr: -1, dc: 0, nextEntry: 'S' };
            if (entrySide === 'S') return { dr: 0, dc: -1, nextEntry: 'E' };
            return null;
        case 'SE': // ↘
            if (entrySide === 'W') return { dr: 1, dc: 0, nextEntry: 'N' };
            if (entrySide === 'N') return { dr: 0, dc: 1, nextEntry: 'W' };
            return null;
        case 'SW': // ↙
            if (entrySide === 'E') return { dr: 1, dc: 0, nextEntry: 'N' };
            if (entrySide === 'N') return { dr: 0, dc: -1, nextEntry: 'E' };
            return null;

        default:
            return null;
    }
}

// -------------------------------------------------------------
// Level Configurations (Layouts dynamically matching black tile count)
// -------------------------------------------------------------
// Each layout is a 9-element array (indices 0..8, row-major):
//   0: (0,0)  1: (0,1)  2: (0,2)
//   3: (1,0)  4: (1,1)  5: (1,2)
//   6: (2,0)  7: (2,1)  8: (2,2)
// -------------------------------------------------------------

const LEVELS = {
    1: {
        id: 1,
        name: "Level 1",
        size: 6,
        start: { r: 1, c: 0, entrySide: 'W' },
        end: { r: 3, c: 5, targetExit: 'E' },
        parMoves: 4,
        blocks: [
            // Block (0, 0) - Top-Left: 6 Black cells -> 6 Layouts (Layout 1/6)
            // Fixed white cells: (0,0)=0, (0,1)=1, (2,1)=7
            // 6 Black cells: (0,2)=2, (1,0)=3, (1,1)=4, (1,2)=5, (2,0)=6, (2,2)=8
            {
                br: 0, bc: 0,
                currentLayout: 0,
                rotation: 0,
                layouts: [
                    // Layout 1/6 (Initial)
                    [
                        null, null, '•',
                        'E',  'E',  'S',
                        '•',  null, 'S'
                    ],
                    // Layout 2/6
                    [
                        null, null, 'E',
                        'E',  'S',  '•',
                        'S',  null, '•'
                    ],
                    // Layout 3/6
                    [
                        null, null, 'E',
                        'S',  '•',  'S',
                        '•',  null, 'E'
                    ],
                    // Layout 4/6
                    [
                        null, null, 'S',
                        '•',  'S',  '•',
                        'E',  null, 'E'
                    ],
                    // Layout 5/6
                    [
                        null, null, '•',
                        'S',  '•',  'E',
                        'E',  null, 'S'
                    ],
                    // Layout 6/6
                    [
                        null, null, 'S',
                        'E',  '•',  'E',
                        'S',  null, '•'
                    ]
                ]
            },
            // Block (0, 1) - Top-Right (Inactive/Empty)
            {
                br: 0, bc: 1,
                currentLayout: 0,
                rotation: 0,
                layouts: [
                    [null, null, null, null, null, null, null, null, null]
                ]
            },
            // Block (1, 0) - Bottom-Left: 7 Black cells -> 7 Layouts (Layout 1/7)
            // Fixed white cells: (2,1)=7, (2,2)=8
            // 7 Black cells: (0,0)=0, (0,1)=1, (0,2)=2, (1,0)=3, (1,1)=4, (1,2)=5, (2,0)=6
            {
                br: 1, bc: 0,
                currentLayout: 0,
                rotation: 0,
                layouts: [
                    // Layout 1/7 (Screenshot initial - allows straight E row 3 flow)
                    [
                        'E',  'E',  'E',
                        '•',  'S',  'W',
                        '•',  null, null
                    ],
                    // Layout 2/7 (Cyclical shift 1)
                    [
                        '•',  'E',  'E',
                        '•',  'S',  'E',
                        'S',  null, null
                    ],
                    // Layout 3/7 (Cyclical shift 2)
                    [
                        'S',  '•',  'E',
                        'E',  'S',  '•',
                        'E',  null, null
                    ],
                    // Layout 4/7 (Cyclical shift 3)
                    [
                        'E',  'S',  '•',
                        'E',  '•',  'S',
                        'E',  null, null
                    ],
                    // Layout 5/7 (Cyclical shift 4)
                    [
                        'E',  'E',  'S',
                        '•',  'E',  '•',
                        'S',  null, null
                    ],
                    // Layout 6/7 (Cyclical shift 5)
                    [
                        '•',  'E',  'S',
                        'S',  'E',  'E',
                        '•',  null, null
                    ],
                    // Layout 7/7 (Cyclical shift 6 - completes 7-state cycle)
                    [
                        'S',  '•',  'E',
                        'E',  '•',  'E',
                        'S',  null, null
                    ]
                ]
            },
            // Block (1, 1) - Bottom-Right: 5 Black cells -> 5 Layouts (Layout 1/5)
            // Fixed white cells: (1,2)=5, (2,0)=6, (2,1)=7, (2,2)=8
            // 5 Black cells: (0,0)=0, (0,1)=1, (0,2)=2, (1,0)=3, (1,1)=4
            {
                br: 1, bc: 1,
                currentLayout: 0,
                rotation: 0,
                layouts: [
                    // Layout 1/5 (Screenshot initial)
                    [
                        'E',  'N',  '•',
                        'E',  'E',  null,
                        null, null, null
                    ],
                    // Layout 2/5 (Direct straight solved flow to Target planet!)
                    [
                        'E',  'E',  'E',
                        '•',  'E',  null,
                        null, null, null
                    ],
                    // Layout 3/5 (Shifted cycle)
                    [
                        '•',  'E',  'E',
                        'E',  'N',  null,
                        null, null, null
                    ],
                    // Layout 4/5 (Shifted cycle)
                    [
                        'E',  '•',  'E',
                        'N',  'E',  null,
                        null, null, null
                    ],
                    // Layout 5/5 (Shifted cycle)
                    [
                        'N',  'E',  '•',
                        'E',  'E',  null,
                        null, null, null
                    ]
                ]
            }
        ]
    },
    2: {
        id: 2,
        name: "Level 2",
        size: 6,
        start: { r: 0, c: 0, entrySide: 'W' },
        end: { r: 5, c: 5, targetExit: 'E' },
        parMoves: 5,
        blocks: [
            // Block (0,0) - Top-Left: 6 black cells -> 6 layouts (Layout 1/6)
            // Fixed white cells: (1,1)=4, (2,0)=6, (2,1)=7
            {
                br: 0, bc: 0,
                currentLayout: 1, // Start slightly shifted for puzzle challenge
                rotation: 0,
                layouts: buildCyclicLayouts(
                    [0, 1, 2, 3, 5, 8],
                    ['E', 'E', 'S', '•', 'S', 'S']
                )
            },
            // Block (0,1) - Top-Right: 5 black cells -> 5 layouts (Layout 1/5)
            // Fixed white cells: (0,0)=0, (1,0)=3, (1,2)=5, (2,0)=6
            {
                br: 0, bc: 1,
                currentLayout: 0,
                rotation: 0,
                layouts: buildCyclicLayouts(
                    [1, 2, 4, 7, 8],
                    ['S', 'S', '•', 'E', 'S']
                )
            },
            // Block (1,0) - Bottom-Left: 6 black cells -> 6 layouts (Layout 1/6)
            // Fixed white cells: (0,0)=0, (1,0)=3, (2,1)=7
            {
                br: 1, bc: 0,
                currentLayout: 1,
                rotation: 0,
                layouts: buildCyclicLayouts(
                    [1, 2, 4, 5, 6, 8],
                    ['E', 'S', '•', 'S', '•', 'E']
                )
            },
            // Block (1,1) - Bottom-Right: 5 black cells -> 5 layouts (Layout 1/5)
            // Fixed white cells: (0,0)=0, (0,2)=2, (1,0)=3, (1,2)=5
            {
                br: 1, bc: 1,
                currentLayout: 1,
                rotation: 0,
                layouts: buildCyclicLayouts(
                    [1, 4, 6, 7, 8],
                    ['S', '•', 'E', 'E', 'E']
                )
            }
        ]
    },
    3: {
        id: 3,
        name: "Level 3",
        size: 9,
        start: { r: 1, c: 0, entrySide: 'W' },
        end: { r: 7, c: 8, targetExit: 'E' },
        parMoves: 6,
        blocks: create9x9Level3Blocks()
    },
    4: {
        id: 4,
        name: "Level 4",
        size: 9,
        start: { r: 0, c: 0, entrySide: 'W' },
        end: { r: 8, c: 8, targetExit: 'E' },
        parMoves: 8,
        blocks: create9x9Level4Blocks()
    }
};

// -------------------------------------------------------------
// Helper: Build Cyclical Layouts for any 3x3 Block
// -------------------------------------------------------------
// Ensures that fixed white cells remain constant across all layouts,
// and the black cells cyclically shift their contents, with the number
// of layouts always dynamically matching the black cell count!
function buildCyclicLayouts(blackIndices, baseContents) {
    const n = blackIndices.length;
    const layouts = [];
    for (let shift = 0; shift < n; shift++) {
        const layout = Array(9).fill(null);
        for (let i = 0; i < n; i++) {
            const contentIdx = (i + shift) % n;
            layout[blackIndices[i]] = baseContents[contentIdx];
        }
        layouts.push(layout);
    }
    return layouts;
}

function create9x9Level3Blocks() {
    return [
        // Row 0
        {
            br: 0, bc: 0, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 1, 3, 4, 5, 8], ['•', 'S', 'E', 'E', 'S', 'S'])
        },
        {
            br: 0, bc: 1, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([1, 2, 4, 7, 8], ['S', 'E', '•', 'S', 'S'])
        },
        {
            br: 0, bc: 2, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([0, 3, 4, 6, 7], ['•', 'S', 'E', '•', 'S'])
        },
        // Row 1
        {
            br: 1, bc: 0, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 2, 4, 5, 7, 8], ['•', 'S', '•', 'S', 'E', 'E'])
        },
        {
            br: 1, bc: 1, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([1, 3, 4, 6, 7, 8], ['•', 'E', 'S', 'E', 'E', 'S'])
        },
        {
            br: 1, bc: 2, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([1, 2, 4, 5, 8], ['S', '•', 'S', 'E', 'S'])
        },
        // Row 2
        {
            br: 2, bc: 0, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([0, 1, 3, 4, 6], ['E', '•', 'E', 'S', '•'])
        },
        {
            br: 2, bc: 1, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 2, 3, 5, 6, 8], ['•', 'S', 'E', 'E', '•', '•'])
        },
        {
            br: 2, bc: 2, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([1, 3, 4, 5, 7, 8], ['S', 'E', 'E', 'E', '•', '•'])
        }
    ];
}

function create9x9Level4Blocks() {
    return [
        // Row 0
        {
            br: 0, bc: 0, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 1, 2, 3, 6, 7], ['E', 'E', 'E', '•', '•', 'S'])
        },
        {
            br: 0, bc: 1, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 1, 4, 6, 7, 8], ['E', 'S', 'S', '•', 'S', '•'])
        },
        {
            br: 0, bc: 2, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([1, 2, 4, 7, 8], ['S', 'S', '•', 'E', 'S'])
        },
        // Row 1
        {
            br: 1, bc: 0, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([0, 1, 3, 4, 6], ['•', 'E', 'S', '•', 'E'])
        },
        {
            br: 1, bc: 1, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([1, 2, 4, 5, 6, 8], ['S', '•', 'E', 'E', '•', 'S'])
        },
        {
            br: 1, bc: 2, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([0, 2, 3, 4, 5, 7], ['•', '•', 'E', 'S', 'E', 'S'])
        },
        // Row 2
        {
            br: 2, bc: 0, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([0, 2, 4, 5, 7], ['E', '•', 'S', 'E', '•'])
        },
        {
            br: 2, bc: 1, currentLayout: 0, rotation: 0,
            layouts: buildCyclicLayouts([1, 3, 4, 6, 7], ['•', 'E', 'S', '•', 'E'])
        },
        {
            br: 2, bc: 2, currentLayout: 1, rotation: 0,
            layouts: buildCyclicLayouts([1, 2, 4, 6, 7, 8], ['S', '•', 'S', '•', 'E', 'E'])
        }
    ];
}

// -------------------------------------------------------------
// Runtime Game State
// -------------------------------------------------------------
const state = {
    currentLevel: 1,
    gridSize: 6,
    grid: [],
    blocks: [],
    selectedBlock: { br: 0, bc: 0 },
    moves: 0,
    isValidating: false
};

// DOM References
const dom = {
    grid: document.getElementById('gpb-grid'),
    levelButtons: document.querySelectorAll('.gpb-lvl-btn'),
    moveCounter: document.getElementById('move-counter'),
    parCounter: document.getElementById('par-counter'),
    selectedBlockLabel: document.getElementById('selected-block-label'),
    blockInfoFooter: document.getElementById('gpb-block-info'),
    rotateBtn: document.getElementById('btn-rotate'),
    changeLayoutBtn: document.getElementById('btn-change-dir'),
    validateBtn: document.getElementById('btn-validate'),
    resetBtn: document.getElementById('btn-reset'),
    startMarker: document.getElementById('start-marker'),
    endMarker: document.getElementById('end-marker'),
    // Modal
    modalOverlay: document.getElementById('gpb-modal'),
    modalStars: document.getElementById('modal-stars'),
    modalMoves: document.getElementById('modal-moves'),
    modalPar: document.getElementById('modal-par'),
    modalEfficiency: document.getElementById('modal-efficiency'),
    modalNextBtn: document.getElementById('modal-next-btn'),
    modalReplayBtn: document.getElementById('modal-replay-btn')
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadLevel(1);
    window.addEventListener('resize', alignMarkers);
});

function initEvents() {
    dom.levelButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lvl = parseInt(e.currentTarget.dataset.level);
            loadLevel(lvl);
        });
    });

    if (dom.rotateBtn) dom.rotateBtn.addEventListener('click', handleRotateClick);
    if (dom.changeLayoutBtn) dom.changeLayoutBtn.addEventListener('click', handleChangeLayoutClick);
    if (dom.validateBtn) dom.validateBtn.addEventListener('click', handleValidateClick);
    if (dom.resetBtn) dom.resetBtn.addEventListener('click', handleResetClick);

    if (dom.modalNextBtn) {
        dom.modalNextBtn.addEventListener('click', () => {
            hideModal();
            if (state.currentLevel < Object.keys(LEVELS).length) {
                loadLevel(state.currentLevel + 1);
            } else {
                loadLevel(1);
            }
        });
    }

    if (dom.modalReplayBtn) {
        dom.modalReplayBtn.addEventListener('click', () => {
            hideModal();
            loadLevel(state.currentLevel);
        });
    }

    window.addEventListener('keydown', (e) => {
        if (state.isValidating) return;
        if (e.key === 'r' || e.key === 'R') {
            handleRotateClick();
        } else if (e.key === 'l' || e.key === 'L' || e.key === 'c' || e.key === 'C') {
            handleChangeLayoutClick();
        } else if (e.key === 'Enter' || e.key === ' ') {
            handleValidateClick();
        }
    });
}

// -------------------------------------------------------------
// Level Loading & Grid Building
// -------------------------------------------------------------
function loadLevel(levelNum) {
    state.currentLevel = levelNum;
    const config = LEVELS[levelNum];
    state.gridSize = config.size;
    state.moves = 0;
    state.isValidating = false;
    state.selectedBlock = { br: 0, bc: 0 };

    state.blocks = config.blocks.map(b => ({
        br: b.br,
        bc: b.bc,
        currentLayout: 0,
        rotation: 0,
        layouts: JSON.parse(JSON.stringify(b.layouts))
    }));

    dom.levelButtons.forEach(btn => {
        if (parseInt(btn.dataset.level) === levelNum) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    dom.moveCounter.textContent = state.moves;
    dom.parCounter.textContent = config.parMoves;

    dom.grid.className = `gpb-grid gpb-grid-${config.size}x${config.size}`;

    rebuildGridMatrix();
    updateBlockStatusDisplay();
    updateControlButtons();
    renderGrid();
    alignMarkers();

    if (typeof showToast === 'function') {
        showToast(`Loaded ${config.name} (${config.size}×${config.size}). Click any 3×3 block to select!`, 'success');
    }
}

// Fixed Row-Aligned Markers (Start 🚀 & Target 🪐)
function alignMarkers() {
    const config = LEVELS[state.currentLevel];
    if (!config) return;

    // In CSS: 6x6 is 48px per cell, 9x9 is 36px per cell (or responsive)
    const isMobile = window.innerWidth <= 640;
    let cellSize = 48;
    if (config.size === 9) {
        cellSize = isMobile ? 28 : 36;
    } else {
        cellSize = isMobile ? 40 : 48;
    }
    const gap = 1;

    // Calculate row center Y coordinate relative to top of grid
    const startY = config.start.r * (cellSize + gap) + (cellSize / 2);
    const endY = config.end.r * (cellSize + gap) + (cellSize / 2);

    if (dom.startMarker) {
        dom.startMarker.style.top = `${startY}px`;
    }
    if (dom.endMarker) {
        dom.endMarker.style.top = `${endY}px`;
    }
}

// -------------------------------------------------------------
// 3x3 Block Rotation & Effective Cells
// -------------------------------------------------------------
function rotate3x3ArrayCW(arr) {
    const rotated = [
        arr[6], arr[3], arr[0],
        arr[7], arr[4], arr[1],
        arr[8], arr[5], arr[2]
    ];
    return rotated.map(val => {
        if (!val || val === '•') return val;
        return ROTATE_CW[val] || val;
    });
}

function getEffectiveBlockCells(block) {
    if (!block.layouts || block.layouts.length === 0) {
        return Array(9).fill(null);
    }
    let cells = [...block.layouts[block.currentLayout]];
    const steps = Math.floor((block.rotation % 360) / 90);
    for (let s = 0; s < steps; s++) {
        cells = rotate3x3ArrayCW(cells);
    }
    return cells;
}

function rebuildGridMatrix() {
    state.grid = [];
    for (let r = 0; r < state.gridSize; r++) {
        state.grid[r] = Array(state.gridSize).fill(null);
    }

    state.blocks.forEach(block => {
        const cells = getEffectiveBlockCells(block);
        for (let i = 0; i < 9; i++) {
            const localR = Math.floor(i / 3);
            const localC = i % 3;
            const globalR = block.br * 3 + localR;
            const globalC = block.bc * 3 + localC;
            if (globalR < state.gridSize && globalC < state.gridSize) {
                state.grid[globalR][globalC] = cells[i];
            }
        }
    });
}

// -------------------------------------------------------------
// Rendering
// -------------------------------------------------------------
function renderGrid() {
    dom.grid.innerHTML = '';

    for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
            const cellVal = state.grid[r][c];
            const br = Math.floor(r / 3);
            const bc = Math.floor(c / 3);

            const cellEl = document.createElement('div');
            cellEl.className = 'gpb-cell';
            cellEl.dataset.row = r;
            cellEl.dataset.col = c;
            cellEl.dataset.blockRow = br;
            cellEl.dataset.blockCol = bc;

            if (cellVal === null) {
                cellEl.classList.add('cell-white');
            } else if (cellVal === '•') {
                cellEl.classList.add('cell-black', 'cell-dot');
                cellEl.innerHTML = '<span class="gpb-dot">•</span>';
            } else {
                cellEl.classList.add('cell-black', 'cell-arrow');
                const sym = ARROW_SYMBOLS[cellVal] || cellVal;
                cellEl.innerHTML = `<span class="gpb-arrow">${sym}</span>`;
            }

            if (state.selectedBlock && state.selectedBlock.br === br && state.selectedBlock.bc === bc) {
                cellEl.classList.add('block-selected');
            }

            cellEl.addEventListener('click', () => handleCellClick(r, c));

            dom.grid.appendChild(cellEl);
        }
    }
}

// -------------------------------------------------------------
// Selection & Status
// -------------------------------------------------------------
function handleCellClick(r, c) {
    if (state.isValidating) return;

    const br = Math.floor(r / 3);
    const bc = Math.floor(c / 3);

    state.selectedBlock = { br, bc };

    updateBlockStatusDisplay();
    updateControlButtons();
    renderGrid();
}

function updateBlockStatusDisplay() {
    if (state.selectedBlock) {
        const { br, bc } = state.selectedBlock;
        const block = state.blocks.find(b => b.br === br && b.bc === bc);
        const rot = block ? block.rotation : 0;
        const layoutNum = block ? block.currentLayout + 1 : 1;
        const totalLayouts = block && block.layouts ? block.layouts.length : 6;

        const infoText = `Block (${br + 1}, ${bc + 1}) · Rotated: ${rot}° · Layout: ${layoutNum}/${totalLayouts}`;

        if (dom.selectedBlockLabel) {
            dom.selectedBlockLabel.textContent = `Block (${br + 1}, ${bc + 1})`;
        }
        if (dom.blockInfoFooter) {
            dom.blockInfoFooter.textContent = infoText;
        }
    } else {
        if (dom.selectedBlockLabel) dom.selectedBlockLabel.textContent = "None";
        if (dom.blockInfoFooter) dom.blockInfoFooter.textContent = "Click a 3×3 block to select";
    }
}

// -------------------------------------------------------------
// Actions: ROTATE & CHANGE LAYOUT
// -------------------------------------------------------------
function handleRotateClick() {
    if (state.isValidating || !state.selectedBlock) return;

    const { br, bc } = state.selectedBlock;
    const block = state.blocks.find(b => b.br === br && b.bc === bc);
    if (!block) return;

    block.rotation = (block.rotation + 90) % 360;

    state.moves++;
    dom.moveCounter.textContent = state.moves;

    rebuildGridMatrix();
    updateBlockStatusDisplay();
    renderGrid();

    if (typeof showToast === 'function') {
        showToast(`Rotated Block (${br + 1}, ${bc + 1}) to ${block.rotation}°`, 'success');
    }
}

function handleChangeLayoutClick() {
    if (state.isValidating || !state.selectedBlock) return;

    const { br, bc } = state.selectedBlock;
    const block = state.blocks.find(b => b.br === br && b.bc === bc);
    if (!block || !block.layouts || block.layouts.length === 0) return;

    block.currentLayout = (block.currentLayout + 1) % block.layouts.length;

    state.moves++;
    dom.moveCounter.textContent = state.moves;

    rebuildGridMatrix();
    updateBlockStatusDisplay();
    renderGrid();

    if (typeof showToast === 'function') {
        showToast(`Changed Block (${br + 1}, ${bc + 1}) to Layout ${block.currentLayout + 1}/${block.layouts.length}`, 'success');
    }
}

function handleResetClick() {
    if (state.isValidating) return;
    loadLevel(state.currentLevel);
    if (typeof showToast === 'function') {
        showToast('Level reset to initial layout.', 'success');
    }
}

// -------------------------------------------------------------
// Tool 3: VALIDATE PATH
// -------------------------------------------------------------
async function handleValidateClick() {
    if (state.isValidating) return;
    state.isValidating = true;
    updateControlButtons();

    const config = LEVELS[state.currentLevel];
    const visited = new Set();
    const pathTrace = [];

    let curR = config.start.r;
    let curC = config.start.c;
    let curEntry = config.start.entrySide || 'W';
    let isSuccess = false;
    let breakReason = "";

    while (true) {
        if (curR < 0 || curR >= state.gridSize || curC < 0 || curC >= state.gridSize) {
            breakReason = "Path exited the grid boundary!";
            break;
        }

        const key = `${curR},${curC}`;
        if (visited.has(key)) {
            pathTrace.push({ r: curR, c: curC });
            breakReason = "Infinite loop detected in flow!";
            break;
        }
        visited.add(key);

        const cellVal = state.grid[curR][curC];

        if (cellVal === null) {
            pathTrace.push({ r: curR, c: curC });
            breakReason = `Flow hit an inactive white cell at (${curR + 1}, ${curC + 1})!`;
            break;
        }

        if (cellVal === '•') {
            pathTrace.push({ r: curR, c: curC });
            breakReason = `Flow hit a track dot (•) at (${curR + 1}, ${curC + 1})! Dot cells do not direct flow.`;
            break;
        }

        const step = getNextFlowStep(cellVal, curEntry);
        if (!step) {
            pathTrace.push({ r: curR, c: curC });
            const sym = ARROW_SYMBOLS[cellVal] || cellVal;
            breakReason = `Flow entered arrow (${sym}) backwards at (${curR + 1}, ${curC + 1})!`;
            break;
        }

        pathTrace.push({ r: curR, c: curC });

        if (curR === config.end.r && curC === config.end.c) {
            if (cellVal === 'E' || (config.end.targetExit && cellVal === config.end.targetExit)) {
                isSuccess = true;
                break;
            } else {
                breakReason = "Target cell must point toward the planet (→)!";
                break;
            }
        }

        curR += step.dr;
        curC += step.dc;
        curEntry = step.nextEntry;
    }

    await animateValidationFlow(pathTrace, isSuccess, breakReason);

    state.isValidating = false;
    updateControlButtons();
}

async function animateValidationFlow(pathTrace, isSuccess, breakReason) {
    for (let i = 0; i < pathTrace.length; i++) {
        const { r, c } = pathTrace[i];
        const cellEl = dom.grid.querySelector(`.gpb-cell[data-row="${r}"][data-col="${c}"]`);
        if (cellEl) {
            cellEl.classList.add('path-flow-valid');
            await delay(120);
        }
    }

    if (isSuccess) {
        if (typeof showToast === 'function') {
            showToast('🎉 Continuous path successfully connected from Start to Target!', 'success');
        }
        await delay(500);
        showSuccessModal();
    } else {
        if (pathTrace.length > 0) {
            const last = pathTrace[pathTrace.length - 1];
            const breakEl = dom.grid.querySelector(`.gpb-cell[data-row="${last.r}"][data-col="${last.c}"]`);
            if (breakEl) {
                breakEl.classList.remove('path-flow-valid');
                breakEl.classList.add('path-flow-break');
            }
        }
        if (typeof showToast === 'function') {
            showToast(`❌ Flow broken! ${breakReason}`, 'error');
        }
        await delay(1500);
        renderGrid();
    }
}

function showSuccessModal() {
    const config = LEVELS[state.currentLevel];
    const actual = state.moves;
    const par = config.parMoves;

    const effPercent = Math.round(Math.min(100, (par / Math.max(1, actual)) * 100));

    let starCount = 1;
    if (actual <= par) {
        starCount = 3;
    } else if (actual <= Math.round(par * 1.5)) {
        starCount = 2;
    } else {
        starCount = 1;
    }

    let starsHtml = '';
    for (let s = 1; s <= 3; s++) {
        starsHtml += s <= starCount 
            ? '<span class="active-star">★</span>' 
            : '<span>☆</span>';
    }

    dom.modalStars.innerHTML = starsHtml;
    dom.modalMoves.textContent = actual;
    dom.modalPar.textContent = par;
    dom.modalEfficiency.textContent = `${effPercent}%`;

    if (state.currentLevel >= Object.keys(LEVELS).length) {
        dom.modalNextBtn.textContent = '🏆 All Levels Completed! Replay Level 1';
    } else {
        dom.modalNextBtn.textContent = `Proceed to Level ${state.currentLevel + 1} →`;
    }

    dom.modalOverlay.classList.add('show');
}

function hideModal() {
    dom.modalOverlay.classList.remove('show');
}

function updateControlButtons() {
    const hasBlock = !!state.selectedBlock;
    if (dom.rotateBtn) dom.rotateBtn.disabled = !hasBlock || state.isValidating;
    if (dom.changeLayoutBtn) dom.changeLayoutBtn.disabled = !hasBlock || state.isValidating;
    if (dom.validateBtn) dom.validateBtn.disabled = state.isValidating;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
