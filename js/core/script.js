// script.js - X³O³ Rotating Tic-Tac-Toe Game Logic

// --- Game State ---
const board = Array(9).fill(null); // 3x3 grid, 0-8
const moveHistory = { X: [], O: [] }; // Cells each player occupies, oldest first
const MAX_MARKS = 3; // Rotating modes: a 4th mark removes the player's oldest
let currentPlayer = 'X';
let gameActive = false;

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
const MODE_STORAGE_KEY = 'x3o3-mode';
let gameMode = 'classic';
let blockedCell = null; // for luck mode

// --- Multiplayer Global State ---
let multiplayerUnsub = null;
let currentLobbyCode = null;
let multiplayerRole = null;
let multiplayerMode = null;
let isMultiplayer = false;

// --- DOM Elements ---
const gameBoard = document.getElementById('gameBoard');
const statusText = document.getElementById('status');
const newGameBtn = document.getElementById('newGameBtn');
const homeButton = document.getElementById('homeButton');
const soundToggle = document.getElementById('soundToggle');

// --- Splash Elements ---
const splash = document.getElementById('splash');
const splashForm = document.getElementById('splashForm');
const multiplayerForm = document.getElementById('multiplayerForm');
const lobbyCreateSection = document.getElementById('lobbyCreateSection');
const lobbyJoinSection = document.getElementById('lobbyJoinSection');
const gameContainer = document.getElementById('gameContainer');
const backToSplashBtn = document.getElementById('backToSplashBtn');

// --- Splash Logic ---
function showSplash() {
    gameActive = false;
    currentPlayer = 'X';

    splash.style.display = 'flex';
    gameContainer.style.display = 'none';
    homeButton.hidden = true;

    // Reset multiplayer UI
    multiplayerForm.style.display = 'none';
    splashForm.style.display = 'flex';
    lobbyCreateSection.style.display = 'none';
    lobbyJoinSection.style.display = 'none';

    // Clear any game data
    for (let i = 0; i < 9; i++) board[i] = null;
    moveHistory.X = [];
    moveHistory.O = [];
    blockedCell = null;
}
function hideSplash() {
    splash.style.display = 'none';
    gameContainer.style.display = 'flex';
    homeButton.hidden = false;
}

function resetMultiplayerState() {
    isMultiplayer = false;
    multiplayerRole = null;
    currentLobbyCode = null;
    multiplayerMode = null;
}

// Leave whatever screen we're on and go back to the main menu.
function returnToMainMenu() {
    if (isMultiplayer && currentLobbyCode) {
        if (!confirm('Are you sure you want to leave the current game and return to the main menu?')) {
            return;
        }
        notifyOpponentOfDeparture();
    }
    cleanupMultiplayerResources();
    resetMultiplayerState();
    showSplash();
}

// Clean up Firebase listeners and connections
function cleanupMultiplayerResources() {
    if (multiplayerUnsub) {
        multiplayerUnsub();
        multiplayerUnsub = null;
    }
}

// Notify opponent that this player has left
function notifyOpponentOfDeparture() {
    if (!currentLobbyCode || !multiplayerRole) return;
    X3O3Multiplayer.abandonGame(currentLobbyCode, multiplayerRole)
        .catch(err => console.error('Error abandoning game:', err));
}

backToSplashBtn.addEventListener('click', returnToMainMenu);
homeButton.addEventListener('click', returnToMainMenu);

splashForm.addEventListener('submit', e => {
    e.preventDefault();
    gameMode = splashForm.elements['gameMode'].value;
    localStorage.setItem(MODE_STORAGE_KEY, gameMode);
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
    newGameBtn.style.display = '';
    createBoard();
    updateBoard();
    updateStatus();
}

function createBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        gameBoard.appendChild(cell);
    }
}

function rejectMove(cell) {
    X3O3Sound.play('invalid');
    cell.classList.remove('shake');
    void cell.offsetWidth; // restart the animation
    cell.classList.add('shake');
}

function handleCellClick(e) {
    const cell = e.currentTarget;
    const idx = +cell.dataset.index;
    if (!gameActive) return;
    if (board[idx] || (gameMode === 'luck' && blockedCell === idx)) {
        rejectMove(cell);
        return;
    }

    const player = currentPlayer;
    board[idx] = player;
    moveHistory[player].push(idx);
    X3O3Sound.play(player);

    // Rotating modes: placing a 4th mark removes the player's oldest one.
    if (gameMode !== 'classic' && moveHistory[player].length > MAX_MARKS) {
        const oldest = moveHistory[player].shift();
        board[oldest] = null;
        X3O3Sound.play('vanish', 0.08);
    }

    // Luck mode: once the 6th mark is down, lock one random empty cell for the rest of the game.
    if (gameMode === 'luck' && blockedCell === null &&
        moveHistory.X.length + moveHistory.O.length === 2 * MAX_MARKS) {
        const open = board.map((v, i) => v ? null : i).filter(i => i !== null);
        if (open.length) {
            blockedCell = open[Math.floor(Math.random() * open.length)];
            X3O3Sound.play('block', 0.15);
        }
    }

    const winner = checkWinner();
    if (winner) {
        endGame(winner);
        return;
    }
    if (board.every((v, i) => v || (gameMode === 'luck' && blockedCell === i))) {
        endGame(null);
        return;
    }

    currentPlayer = player === 'X' ? 'O' : 'X';
    updateBoard();
    updateStatus();
}

function endGame(winner) {
    gameActive = false;
    updateBoard(); // reveals hidden marks in expert mode
    if (winner) {
        highlightWinner(winner.combo);
        setStatusWinner(winner.player);
    } else {
        statusText.textContent = "It's a draw!";
        X3O3Sound.play('draw', 0.1);
    }
}

function markSpan(player) {
    const span = document.createElement('span');
    span.className = `mark-${player.toLowerCase()}`;
    span.textContent = player;
    return span;
}

function setStatusWinner(player) {
    statusText.replaceChildren(markSpan(player), ' wins!');
}

function updateBoard() {
    for (let i = 0; i < 9; i++) {
        const cell = gameBoard.children[i];
        const mark = board[i];
        cell.className = 'cell';
        cell.textContent = mark || '';
        let label = mark ? `Cell ${i + 1}, ${mark}` : `Cell ${i + 1}, empty`;
        if (mark) cell.classList.add(mark.toLowerCase());

        if (mark && gameActive) {
            const history = moveHistory[mark];
            // Expert: only each player's most recent mark is visible while playing.
            if (gameMode === 'expert' && history[history.length - 1] !== i) {
                cell.classList.add('hide-mark');
                cell.textContent = '';
                label = `Cell ${i + 1}`;
            }
            // Beginner: fade the mark that will vanish on that player's next move.
            if (gameMode === 'beginner' && history.length === MAX_MARKS && history[0] === i) {
                cell.classList.add('fade-out');
                label += ' (vanishes next)';
            }
        }

        // Luck: blocked cell
        if (gameMode === 'luck' && blockedCell === i) {
            cell.classList.add('blocked');
            cell.textContent = '';
            label = `Cell ${i + 1}, blocked`;
        }

        cell.setAttribute('aria-label', label);
    }
}

function updateStatus() {
    statusText.replaceChildren('Turn: ', markSpan(currentPlayer), ` · ${MODES[gameMode]}`);
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
    X3O3Sound.play('win', 0.12);
}

// Display options for user after game ends
function showGameEndOptions() {
    newGameBtn.textContent = "New Game";
    newGameBtn.style.display = 'block';
    backToSplashBtn.style.display = 'block';
    backToSplashBtn.focus();
}

// --- Sound toggle ---
function renderSoundToggle() {
    const muted = X3O3Sound.isMuted();
    soundToggle.textContent = muted ? 'Sound: Off' : 'Sound: On';
    soundToggle.setAttribute('aria-pressed', String(!muted));
}
soundToggle.addEventListener('click', () => {
    X3O3Sound.setMuted(!X3O3Sound.isMuted());
    renderSoundToggle();
});

// --- Event Listeners ---
newGameBtn.addEventListener('click', startGame);

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode && MODES[savedMode]) {
        const radio = splashForm.querySelector(`input[name="gameMode"][value="${savedMode}"]`);
        if (radio) radio.checked = true;
    }
    renderSoundToggle();
    showSplash();

    // Browsers only allow audio after a user gesture; warm the AudioContext
    // on the first one so the first move's sound isn't dropped.
    const unlock = () => {
        X3O3Sound.unlock();
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
});

// --- PWA: Service Worker Registration & Update Handling ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Older builds registered a worker under /pwa/ that never controlled the page.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.filter(r => r.scope.endsWith('/pwa/')).forEach(r => r.unregister());
    });

    navigator.serviceWorker.register('service-worker.js').then(reg => {
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification();
          }
        };
      };
    }).catch(err => console.warn('Service worker registration failed:', err));
  });
}

function showUpdateNotification() {
  const updateBar = document.createElement('div');
  updateBar.textContent = 'A new version is available. Click to update!';
  updateBar.style.cssText = 'position:fixed;bottom:0;left:0;width:100vw;background:#0ff;color:#181a20;font-weight:bold;text-align:center;padding:1em;z-index:2000;cursor:pointer;box-shadow:0 -2px 8px #0ff8;';
  updateBar.onclick = () => window.location.reload();
  document.body.appendChild(updateBar);
}

// --- Multiplayer UI & Logic Integration ---
window.addEventListener('DOMContentLoaded', () => {
    // Multiplayer UI elements
    const showMultiplayerBtn = document.getElementById('showMultiplayerBtn');
    const createLobbyBtn = document.getElementById('createLobbyBtn');
    const showJoinLobbyBtn = document.getElementById('showJoinLobbyBtn');
    const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
    const lobbyStatus = document.getElementById('lobbyStatus');
    const copyLobbyCodeBtn = document.getElementById('copyLobbyCodeBtn');
    const cancelLobbyBtn = document.getElementById('cancelLobbyBtn');
    const joinLobbyCodeInput = document.getElementById('joinLobbyCodeInput');
    const joinLobbyBtn = document.getElementById('joinLobbyBtn');
    const joinLobbyError = document.getElementById('joinLobbyError');
    const cancelJoinLobbyBtn = document.getElementById('cancelJoinLobbyBtn');

    // Show multiplayer form. Firebase is only loaded once the player opts in,
    // so single-player games never pay for (or fail on) the SDK download.
    showMultiplayerBtn.addEventListener('click', () => {
        X3O3Multiplayer.initFirebase().catch(console.error);
        splashForm.style.display = 'none';
        multiplayerForm.style.display = 'flex';
        lobbyCreateSection.style.display = 'none';
        lobbyJoinSection.style.display = 'none';
    });

    // Create Lobby
    createLobbyBtn.addEventListener('click', async () => {
        lobbyCreateSection.style.display = 'flex';
        lobbyJoinSection.style.display = 'none';
        lobbyStatus.textContent = 'Creating lobby...';
        joinLobbyError.textContent = '';
        // Get selected mode
        const mode = splashForm.elements['gameMode'].value;
        try {
            await X3O3Multiplayer.initFirebase();
            console.log('Calling createLobby with mode:', mode);
            const code = await X3O3Multiplayer.createLobby(mode);
            currentLobbyCode = code;
            multiplayerMode = mode;
            multiplayerRole = 'X';
            isMultiplayer = true;
            lobbyCodeDisplay.textContent = `Lobby Code: ${code}`;
            lobbyStatus.textContent = 'Waiting for opponent to join...';
            // Listen for game start
            if (multiplayerUnsub) multiplayerUnsub();
            multiplayerUnsub = X3O3Multiplayer.listenToGame(code, data => {
                if (data.status === 'in_progress' && data.players.O) {
                    lobbyStatus.textContent = 'Opponent joined! Starting game...';
                    setTimeout(() => {
                        multiplayerForm.style.display = 'none';
                        hideSplash();
                        startMultiplayerGame(data, code, 'X');
                    }, 500);
                }
            });
        } catch (e) {
            lobbyStatus.textContent = 'Error creating lobby.';
            console.error('Error from createLobbyBtn:', e);
        }
    });

    // Join Lobby
    joinLobbyBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        lobbyJoinSection.style.display = 'flex'; // Ensure join section is visible
        console.log('[JoinLobby] Button clicked');
        const code = joinLobbyCodeInput.value.trim().toUpperCase();
        console.log('[JoinLobby] Entered code:', code);
        if (!code || code.length !== 6) {
            joinLobbyError.textContent = 'Enter a valid 6-letter code.';
            console.log('[JoinLobby] Invalid code');
            return;
        }
        joinLobbyError.textContent = 'Joining lobby...';
        try {
            await X3O3Multiplayer.initFirebase();
            const data = await X3O3Multiplayer.joinLobby(code);
            console.log('[JoinLobby] joinLobby resolved:', data);
            currentLobbyCode = code;
            multiplayerMode = data.mode;
            multiplayerRole = 'O';
            isMultiplayer = true;
            joinLobbyError.textContent = '';
            // Listen for game state
            if (multiplayerUnsub) multiplayerUnsub();
            multiplayerUnsub = X3O3Multiplayer.listenToGame(code, data => {
                console.log('[JoinLobby] listenToGame snapshot:', data);
                // Only start the game when both players are present and status is in_progress
                if (data.status === 'in_progress' && data.players.O) {
                    multiplayerForm.style.display = 'none';
                    hideSplash();
                    startMultiplayerGame(data, code, 'O');
                }
            });
        } catch (e) {
            joinLobbyError.textContent = e.message || 'Failed to join lobby.';
            console.error('[JoinLobby] Error:', e);
        }
    });

    // Copy lobby code
    copyLobbyCodeBtn.addEventListener('click', () => {
        if (currentLobbyCode) {
            navigator.clipboard.writeText(currentLobbyCode);
            lobbyStatus.textContent = 'Copied!';
        }
    });

    // Cancel lobby/join
    cancelLobbyBtn.addEventListener('click', () => {
        lobbyCreateSection.style.display = 'none';
        multiplayerForm.style.display = 'flex';
        cleanupMultiplayerResources();
        
        // Delete the lobby if we created it and no one joined yet
        if (currentLobbyCode) {
            firebase.firestore().collection('games').doc(currentLobbyCode).get()
                .then(doc => {
                    if (doc.exists && doc.data().status === 'waiting') {
                        doc.ref.delete().catch(console.error);
                    }
                })
                .catch(console.error);
            currentLobbyCode = null;
        }
    });
    
    cancelJoinLobbyBtn.addEventListener('click', () => {
        lobbyJoinSection.style.display = 'none';
        multiplayerForm.style.display = 'flex';
        joinLobbyError.textContent = '';
        cleanupMultiplayerResources();
    });

    // Show Join Lobby section
    showJoinLobbyBtn.addEventListener('click', () => {
        lobbyCreateSection.style.display = 'none';
        lobbyJoinSection.style.display = 'flex';
        joinLobbyError.textContent = '';
        joinLobbyCodeInput.focus(); // Focus the input for better UX
    });

    // Back to Menu button in multiplayer screens
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            console.log("Back to Menu button clicked");
            
            // If in multiplayer UI screens (not in a game yet)
            if (splash.style.display === 'flex' && multiplayerForm.style.display === 'flex') {
                console.log("Returning to main menu from multiplayer options");
                cleanupMultiplayerResources();
                multiplayerForm.style.display = 'none';
                splashForm.style.display = 'flex';
                
                // Reset any partially created lobbies
                if (currentLobbyCode) {
                    firebase.firestore().collection('games').doc(currentLobbyCode).get()
                        .then(doc => {
                            if (doc.exists && doc.data().status === 'waiting') {
                                doc.ref.delete().catch(console.error);
                            }
                        })
                        .catch(console.error);
                    currentLobbyCode = null;
                }
                return;
            }
            
            // Reset multiplayer state
            cleanupMultiplayerResources();
            isMultiplayer = false;
            multiplayerRole = null;
            currentLobbyCode = null;
            multiplayerMode = null;
            
            // Go back to main menu
            showSplash();
        });
    }

    // --- Multiplayer Game Logic ---
    function startMultiplayerGame(gameData, code, role) {
        createBoard(); // Ensure the board DOM exists
        // Set up board, mode, and state from Firestore
        for (let i = 0; i < 9; i++) board[i] = gameData.board[i] || null;
        moveHistory.X = gameData.moveHistory?.X ? [...gameData.moveHistory.X] : [];
        moveHistory.O = gameData.moveHistory?.O ? [...gameData.moveHistory.O] : [];
        blockedCell = gameData.blockedCell === undefined ? null : gameData.blockedCell;
        currentPlayer = gameData.currentTurn;
        gameActive = gameData.status === 'in_progress';
        gameMode = gameData.mode;
        updateBoard();
        updateStatus();
        // Remove all previous cell click handlers
        for (let i = 0; i < 9; i++) {
            const cell = gameBoard.children[i];
            cell.replaceWith(cell.cloneNode(true)); // Remove all listeners
        }
        // Add multiplayer cell click handlers
        for (let i = 0; i < 9; i++) {
            const cell = gameBoard.children[i];
            cell.onclick = async () => {
                // Only allow move if it's this player's turn and cell is empty
                if (!gameActive || board[i] || currentPlayer !== role) return;
                try {
                    await X3O3Multiplayer.makeMove(code, i, role);
                } catch (e) {
                    // Optionally show error
                    console.error('Multiplayer move error:', e);
                }
            };
        }
        // Listen for game state changes from Firestore
        if (multiplayerUnsub) multiplayerUnsub();
        multiplayerUnsub = X3O3Multiplayer.listenToGame(code, data => {
            // Check if game was abandoned
            if (data.status === 'abandoned') {
                gameActive = false;
                const abandonedBy = data.abandonedBy === 'X' ? 'Player X' : 'Player O';
                statusText.textContent = `Game ended: ${abandonedBy} left the game`;
                showGameEndOptions();
                return;
            }
            
            // Update board and turn from Firestore
            for (let i = 0; i < 9; i++) board[i] = data.board[i] || null;
            moveHistory.X = data.moveHistory?.X ? [...data.moveHistory.X] : [];
            moveHistory.O = data.moveHistory?.O ? [...data.moveHistory.O] : [];
            blockedCell = data.blockedCell === undefined ? null : data.blockedCell;
            currentPlayer = data.currentTurn;
            gameActive = data.status === 'in_progress';
            gameMode = data.mode;
            updateBoard();
            updateStatus();
            
            // Handle completed game
            if (data.status === 'finished') {
                gameActive = false;
                if (data.winner) {
                    highlightWinner(data.winningCombo);
                    setStatusWinner(data.winner);
                } else {
                    statusText.textContent = "It's a draw!";
                }
                
                // Show back to splash button, but hide new game button for multiplayer
                backToSplashBtn.style.display = 'block';
                backToSplashBtn.focus();
                newGameBtn.style.display = 'none';
            } else {
                // Ensure new game button is hidden while playing multiplayer
                newGameBtn.style.display = 'none';
            }
        });
    }
});

// --- End of script.js ---
