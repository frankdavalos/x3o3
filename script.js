// script.js - X³O³ Rotating Tic-Tac-Toe Game Logic

// --- Game State ---
const board = Array(9).fill(null); // 3x3 grid, 0-8
const moveHistory = { X: [], O: [] }; // Track moves for each player
let currentPlayer = 'X';
let gameActive = true;

const winCombos = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6]           // diags
];

// --- DOM Elements ---
const gameBoard = document.getElementById('gameBoard');
const statusText = document.getElementById('status');
const newGameBtn = document.getElementById('newGameBtn');

// --- Initialize Board ---
function createBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        gameBoard.appendChild(cell);
    }
}

// --- Handle Cell Click ---
function handleCellClick(e) {
    const idx = +e.target.dataset.index;
    if (!gameActive || board[idx]) return; // Ignore if not active or cell filled

    // Place mark
    board[idx] = currentPlayer;
    moveHistory[currentPlayer].push(idx);
    updateBoard();

    // Remove oldest if more than 3 marks
    if (moveHistory[currentPlayer].length > 3) {
        const oldest = moveHistory[currentPlayer].shift();
        board[oldest] = null;
        updateBoard();
    }

    // Check win
    const winner = checkWinner();
    if (winner) {
        gameActive = false;
        highlightWinner(winner.combo);
        statusText.innerHTML = `<span style='color:${winner.player==="X"?"#0ff":"#f06"}'>${winner.player}</span> wins!`;
        return;
    }

    // Check draw
    if (board.every(cell => cell)) {
        statusText.textContent = "It's a draw!";
        gameActive = false;
        return;
    }

    // Next turn
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
}

// --- Update Board UI ---
function updateBoard() {
    for (let i = 0; i < 9; i++) {
        const cell = gameBoard.children[i];
        cell.textContent = board[i] ? board[i] : '';
        cell.className = 'cell';
        if (board[i]) cell.classList.add(board[i].toLowerCase());
    }
}

// --- Update Status ---
function updateStatus() {
    statusText.innerHTML = `Turn: <span style='color:${currentPlayer==="X"?"#0ff":"#f06"}'>${currentPlayer}</span>`;
}

// --- Check for Winner ---
function checkWinner() {
    for (const combo of winCombos) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { player: board[a], combo };
        }
    }
    return null;
}

// --- Highlight Winning Combo ---
function highlightWinner(combo) {
    combo.forEach(idx => {
        gameBoard.children[idx].classList.add('winner');
    });
}

// --- New Game ---
function newGame() {
    for (let i = 0; i < 9; i++) board[i] = null;
    moveHistory.X = [];
    moveHistory.O = [];
    currentPlayer = 'X';
    gameActive = true;
    updateBoard();
    updateStatus();
}

// --- Event Listeners ---
newGameBtn.addEventListener('click', newGame);

// --- Start Game ---
createBoard();
newGame();

// --- Responsive Font Sizing (Optional) ---
window.addEventListener('resize', () => {
    // Could add dynamic font scaling if desired
});

// --- Theme Switching ---
const themeSwitcher = document.getElementById('themeSwitcher');
const THEME_KEY = 'x3o3-theme';
const themeMap = {
    'neon': 'theme-neon',
    'high-contrast': 'theme-high-contrast',
    'toca-boca': 'theme-toca-boca'
};
function applyTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('theme-neon', 'theme-high-contrast', 'theme-toca-boca');
    // Add selected
    document.body.classList.add(themeMap[theme] || 'theme-neon');
}
function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
}
function restoreTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'neon';
    themeSwitcher.value = saved;
    applyTheme(saved);
}
themeSwitcher.addEventListener('change', e => setTheme(e.target.value));
restoreTheme();

// --- End of script.js ---
