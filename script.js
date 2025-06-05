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

// --- Game Modes ---
const MODES = {
    classic: 'Classic',
    beginner: 'Beginner',
    normal: 'Normal',
    expert: 'Expert',
    luck: 'Luck'
};
let gameMode = 'classic';
let blockedCell = null; // for luck mode

// --- DOM Elements ---
const gameBoard = document.getElementById('gameBoard');
const statusText = document.getElementById('status');
const newGameBtn = document.getElementById('newGameBtn');

// --- Splash Elements ---
const splash = document.getElementById('splash');
const splashForm = document.getElementById('splashForm');
const gameContainer = document.getElementById('gameContainer');
const themeSwitcher = document.getElementById('themeSwitcher');
const backToSplashBtn = document.getElementById('backToSplashBtn');

// --- Theme Persistence and Switching ---
function setTheme(theme) {
    document.body.classList.remove('theme-high-contrast');
    if (theme === 'high-contrast') {
        document.body.classList.add('theme-high-contrast');
    }
    localStorage.setItem('theme', theme);
}
function getTheme() {
    return localStorage.getItem('theme') || 'neon';
}

// --- Splash Logic ---
function showSplash() {
    splash.style.display = 'flex';
    gameContainer.style.display = 'none';
}
function hideSplash() {
    splash.style.display = 'none';
    gameContainer.style.display = 'flex';
}
backToSplashBtn.addEventListener('click', showSplash);

splashForm.addEventListener('submit', e => {
    e.preventDefault();
    const mode = splashForm.elements['gameMode'].value;
    gameMode = mode;
    const theme = splashForm.elements['themeSwitcherSplash'].value;
    setTheme(theme);
    hideSplash();
    startGame();
});

// --- Game Logic ---
function startGame() {
    for (let i = 0; i < 9; i++) board[i] = null;
    moveHistory.X = [];
    moveHistory.O = [];
    currentPlayer = 'X';
    gameActive = true;
    blockedCell = null;
    createBoard();
    updateBoard();
    updateStatus();
}

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

function handleCellClick(e) {
    const idx = +e.target.dataset.index;
    if (!gameActive || board[idx]) return;
    if (gameMode === 'luck' && blockedCell === idx) return;

    // Place mark
    board[idx] = currentPlayer;
    moveHistory[currentPlayer].push(idx);
    updateBoard();

    // Classic mode: no rotation
    if (gameMode === 'classic') {
        // Check win
        const winner = checkWinner();
        if (winner) {
            gameActive = false;
            highlightWinner(winner.combo);
            statusText.innerHTML = `<span style='color:${winner.player==="X"?"#0ff":"#f06"}'>${winner.player}</span> wins!`;
            return;
        }
        if (board.every(cell => cell)) {
            statusText.textContent = "It's a draw!";
            gameActive = false;
            return;
        }
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
        return;
    }

    // Rotating modes
    if (moveHistory[currentPlayer].length > 3) {
        const oldest = moveHistory[currentPlayer].shift();
        board[oldest] = null;
        updateBoard();
    }
    // Luck mode: block a cell after 6th move
    if (gameMode === 'luck' && !blockedCell && moveHistory.X.length + moveHistory.O.length === 6) {
        let open = board.map((v, i) => v ? null : i).filter(i => i !== null);
        if (open.length) {
            blockedCell = open[Math.floor(Math.random() * open.length)];
            updateBoard();
        }
    }

    // Check win
    const winner = checkWinner();
    if (winner) {
        gameActive = false;
        highlightWinner(winner.combo);
        statusText.innerHTML = `<span style='color:${winner.player==="X"?"#0ff":"#f06"}'>${winner.player}</span> wins!`;
        return;
    }
    if (board.every((cell, i) => cell || (gameMode === 'luck' && blockedCell === i))) {
        statusText.textContent = "It's a draw!";
        gameActive = false;
        return;
    }
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatus();
}

function updateBoard() {
    for (let i = 0; i < 9; i++) {
        const cell = gameBoard.children[i];
        cell.textContent = board[i] ? board[i] : '';
        cell.className = 'cell';
        if (board[i]) cell.classList.add(board[i].toLowerCase());
        // Beginner: fade oldest mark for each player (no min count)
        if (gameMode === 'beginner') {
            ['X', 'O'].forEach(player => {
                if (moveHistory[player].length > 0 && moveHistory[player][0] === i) {
                    cell.classList.add('fade-out');
                }
            });
        }
        // Expert: hide all but most recent
        if (gameMode === 'expert') {
            ['X', 'O'].forEach(player => {
                if (moveHistory[player].length > 1 && moveHistory[player].includes(i) && moveHistory[player][moveHistory[player].length-1] !== i) {
                    cell.classList.add('hide-mark');
                }
            });
        }
        // Luck: blocked cell
        if (gameMode === 'luck' && blockedCell === i) {
            cell.classList.add('blocked', 'cracked');
            cell.textContent = '';
        }
    }
}

function updateStatus() {
    statusText.innerHTML = `Turn: <span style='color:${currentPlayer==="X"?"#0ff":"#f06"}'>${currentPlayer}</span> | Mode: <b>${MODES[gameMode]}</b>`;
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
newGameBtn.addEventListener('click', startGame);

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
    setTheme(getTheme());
    showSplash();
});

// --- Responsive Font Sizing (Optional) ---
window.addEventListener('resize', () => {
    // Could add dynamic font scaling if desired
});

// --- PWA: Service Worker Registration & Update Handling ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      // Listen for updates
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          }
        };
      };
    });
  });
}

function showUpdateNotification() {
  const updateBar = document.createElement('div');
  updateBar.textContent = 'A new version is available. Click to update!';
  updateBar.style.cssText = 'position:fixed;bottom:0;left:0;width:100vw;background:#0ff;color:#181a20;font-weight:bold;text-align:center;padding:1em;z-index:2000;cursor:pointer;box-shadow:0 -2px 8px #0ff8;';
  updateBar.onclick = () => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
    }
    window.location.reload();
  };
  document.body.appendChild(updateBar);
}

// --- End of script.js ---
