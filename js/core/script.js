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
const homeButton = document.getElementById('homeButton');
const navBar = document.getElementById('navBar');

// --- Splash Elements ---
const splash = document.getElementById('splash');
const splashForm = document.getElementById('splashForm');
const gameContainer = document.getElementById('gameContainer');
const backToSplashBtn = document.getElementById('backToSplashBtn');

// --- Default Theme Setting ---
function setDefaultTheme() {
    // Always use the neon theme (default)
    document.body.classList.remove('theme-high-contrast');
    localStorage.setItem('theme', 'neon');
}
function getTheme() {
    return 'neon'; // Always return neon theme
}

// --- Splash Logic ---
function showSplash() {
    // Reset game state
    gameActive = true;
    currentPlayer = 'X';
    
    // Reset UI visibility
    splash.style.display = 'flex';
    gameContainer.style.display = 'none';
    
    // Reset multiplayer UI
    multiplayerForm.style.display = 'none';
    splashForm.style.display = 'flex';
    lobbyCreateSection.style.display = 'none';
    lobbyJoinSection.style.display = 'none';
    
    // Clear any game data
    for (let i = 0; i < 9; i++) board[i] = null;
    moveHistory.X = [];
    moveHistory.O = [];
    
    console.log("Main menu displayed");
}
function hideSplash() {
    splash.style.display = 'none';
    gameContainer.style.display = 'flex';
}

// Home button handler for universal navigation
function handleHomeNavigation() {
    console.log("Home button clicked");
    
    // Check if we're already on the main menu's game mode selection
    if (splash.style.display === 'flex' && splashForm.style.display === 'flex') {
        console.log("Already on main menu");
        return;
    }
    
    // If in multiplayer UI screens (lobby creation/joining)
    if (splash.style.display === 'flex' && multiplayerForm.style.display === 'flex') {
        console.log("Returning from multiplayer UI to main menu");
        cleanupMultiplayerResources();
        multiplayerForm.style.display = 'none';
        splashForm.style.display = 'flex';
        return;
    }
    
    // If in an active multiplayer game, show confirmation
    if (isMultiplayer && currentLobbyCode) {
        if (!confirm('Are you sure you want to leave the current game and return to the main menu?')) {
            return; // User cancelled
        }
        
        console.log("Leaving active multiplayer game");
        // Notify other player if in a multiplayer game
        notifyOpponentOfDeparture();
        
        // Clean up Firebase listeners
        cleanupMultiplayerResources();
    }
    
    // Reset multiplayer state
    isMultiplayer = false;
    multiplayerRole = null;
    currentLobbyCode = null;
    multiplayerMode = null;
    
    // Navigate to main menu
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
    
    // Use the abandonGame function from multiplayer.js
    X3O3Multiplayer.abandonGame(currentLobbyCode, multiplayerRole)
        .catch(err => console.error('Error abandoning game:', err));
}

backToSplashBtn.addEventListener('click', () => {
    console.log("Back to splash button clicked");
    
    // If in an active multiplayer game, confirm first
    if (isMultiplayer && currentLobbyCode) {
        if (!confirm('Are you sure you want to leave the current game and return to the main menu?')) {
            return; // User cancelled
        }
        
        // Clean up Firebase resources
        notifyOpponentOfDeparture();
        cleanupMultiplayerResources();
    }
    
    // Reset multiplayer state
    isMultiplayer = false;
    multiplayerRole = null;
    currentLobbyCode = null;
    multiplayerMode = null;
    
    // Return to main menu
    showSplash();
});

splashForm.addEventListener('submit', e => {
    e.preventDefault();
    const mode = splashForm.elements['gameMode'].value;
    gameMode = mode;
    setDefaultTheme(); // Always use default theme
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

// Dynamically create AudioContext after user interaction
let audioContext;
const soundBuffers = {};
const audioFallback = {
    X: new Audio('assets/sounds/x.mp3'),
    O: new Audio('assets/sounds/o.mp3')
};

function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext initialized');
    }
}

// Function to load and decode sound files
async function loadSound(player, url) {
    if (!audioContext) return; // Ensure AudioContext is initialized
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    soundBuffers[player] = await audioContext.decodeAudioData(arrayBuffer);
}

// Preload sounds for X and O
function preloadSounds() {
    if (audioContext) {
        Promise.all([
            loadSound('X', 'assets/sounds/x.mp3'),
            loadSound('O', 'assets/sounds/o.mp3')
        ]).then(() => console.log('Sounds preloaded')).catch(err => console.error('Sound preload failed:', err));
    }
}

// Preload winner sound
function preloadWinnerSound() {
    if (audioContext) {
        loadSound('winner', 'assets/sounds/winner.mp3').then(() => {
            console.log('Winner sound preloaded');
        }).catch(err => console.error('Winner sound preload failed:', err));
    }
}

// Function to play sound for the current player
function playSound(player) {
    if (audioContext && soundBuffers[player]) {
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[player];
        source.connect(audioContext.destination);
        source.start(0); // Play immediately
    } else if (audioFallback[player]) {
        audioFallback[player].currentTime = 0; // Reset sound to the beginning
        audioFallback[player].play().catch(err => console.error('Audio fallback play failed:', err));
    }
}

// Play winner sound
function playWinnerSound() {
    if (audioContext && soundBuffers['winner']) {
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers['winner'];
        source.connect(audioContext.destination);
        source.start(0);
    } else {
        const winnerFallback = new Audio('assets/sounds/winner.mp3');
        winnerFallback.play().catch(err => console.error('Winner fallback play failed:', err));
    }
}

function handleCellClick(e) {
    const idx = +e.target.dataset.index;
    if (!gameActive || board[idx]) return;

    // Ensure blocked cell remains locked
    if (gameMode === 'luck' && blockedCell === idx) return;

    // Place mark
    board[idx] = currentPlayer;
    moveHistory[currentPlayer].push(idx);
    playSound(currentPlayer); // Play sound for the current player
    updateBoard();

    // Classic mode: no rotation
    if (gameMode === 'classic') {
        // Check win
        const winner = checkWinner();
        if (winner) {
            gameActive = false;
            highlightWinner(winner.combo);
            statusText.innerHTML = `<span style='color:${winner.player === "X" ? "#0ff" : "#f06"}'>${winner.player}</span> wins!`;
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
        statusText.innerHTML = `<span style='color:${winner.player === "X" ? "#0ff" : "#f06"}'>${winner.player}</span> wins!`;
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

        // Expert: hide all but most recent mark for each player
        if (gameMode === 'expert') {
            ['X', 'O'].forEach(player => {
                if (moveHistory[player].includes(i)) {
                    const isMostRecent = moveHistory[player][moveHistory[player].length - 1] === i;
                    if (!isMostRecent) {
                        cell.classList.add('hide-mark');
                        cell.textContent = ''; // Clear text for hidden marks
                    }
                }
            });
        }

        // Beginner: fade oldest mark for each player (no min count)
        if (gameMode === 'beginner') {
            ['X', 'O'].forEach(player => {
                if (moveHistory[player].length > 0 && moveHistory[player][0] === i) {
                    cell.classList.add('fade-out');
                }
            });
        }

        // Luck: blocked cell
        if (gameMode === 'luck' && blockedCell === i) {
            cell.classList.add('blocked');
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
    playWinnerSound(); // Play the winner sound
}

// Display options for user after game ends
function showGameEndOptions() {
    // Make new game button visible
    newGameBtn.textContent = "New Game";
    newGameBtn.style.display = 'block';
    
    // Make back to menu button visible and in focus
    backToSplashBtn.style.display = 'block';
    backToSplashBtn.focus();
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
homeButton.addEventListener('click', handleHomeNavigation);

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
    setDefaultTheme(); // Always use default theme
    showSplash();
    preloadWinnerSound();
    
    // Ensure buttons are properly initialized
    console.log("Initializing navigation buttons");

    // Ensure AudioContext is unlocked on mobile devices and revisits
    const unlockAudioContext = () => {
        initializeAudioContext();
        preloadSounds();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            }).catch(err => console.error('AudioContext resume failed:', err));
        }
        // Remove the event listener after unlocking
        document.removeEventListener('click', unlockAudioContext);
        document.removeEventListener('touchstart', unlockAudioContext);
        document.removeEventListener('keydown', unlockAudioContext);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', unlockAudioContext);
    document.addEventListener('touchstart', unlockAudioContext);
    document.addEventListener('keydown', unlockAudioContext);

    // Attempt to unlock immediately if possible (e.g., revisits)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed on load');
        }).catch(err => console.error('AudioContext resume on load failed:', err));
    }
});

// --- Multiplayer Integration (MVP) ---
// Example usage (UI integration required):
// 1. Call X3O3Multiplayer.initFirebase() on app load
// 2. Use X3O3Multiplayer.createLobby(selectedMode) to create a lobby
// 3. Use X3O3Multiplayer.joinLobby(code) to join
// 4. Use X3O3Multiplayer.listenToGame(code, callback) for real-time updates
// 5. Use X3O3Multiplayer.makeMove(code, idx, value) to make a move
// See multiplayer.js for details

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

// --- Multiplayer UI & Logic Integration ---
window.addEventListener('DOMContentLoaded', () => {
    // Multiplayer UI elements
    const showMultiplayerBtn = document.getElementById('showMultiplayerBtn');
    const multiplayerForm = document.getElementById('multiplayerForm');
    const splashForm = document.getElementById('splashForm');
    const createLobbyBtn = document.getElementById('createLobbyBtn');
    const showJoinLobbyBtn = document.getElementById('showJoinLobbyBtn');
    const lobbyCreateSection = document.getElementById('lobbyCreateSection');
    const lobbyJoinSection = document.getElementById('lobbyJoinSection');
    const lobbyCodeDisplay = document.getElementById('lobbyCodeDisplay');
    const lobbyStatus = document.getElementById('lobbyStatus');
    const copyLobbyCodeBtn = document.getElementById('copyLobbyCodeBtn');
    const cancelLobbyBtn = document.getElementById('cancelLobbyBtn');
    const joinLobbyCodeInput = document.getElementById('joinLobbyCodeInput');
    const joinLobbyBtn = document.getElementById('joinLobbyBtn');
    const joinLobbyError = document.getElementById('joinLobbyError');
    const cancelJoinLobbyBtn = document.getElementById('cancelJoinLobbyBtn');

    let multiplayerUnsub = null;
    let currentLobbyCode = null;
    let multiplayerRole = null;
    let multiplayerMode = null;
    let isMultiplayer = false;

    // Initialize Firebase for multiplayer
    X3O3Multiplayer.initFirebase().catch(console.error);

    // Show multiplayer form
    showMultiplayerBtn.addEventListener('click', () => {
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
        moveHistory.X = gameData.board.map((v, i) => v === 'X' ? i : null).filter(i => i !== null);
        moveHistory.O = gameData.board.map((v, i) => v === 'O' ? i : null).filter(i => i !== null);
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
            moveHistory.X = data.board.map((v, i) => v === 'X' ? i : null).filter(i => i !== null);
            moveHistory.O = data.board.map((v, i) => v === 'O' ? i : null).filter(i => i !== null);
            currentPlayer = data.currentTurn;
            gameActive = data.status === 'in_progress';
            gameMode = data.mode;
            updateBoard();
            updateStatus();
            // Optionally handle win/draw UI here if you add win logic to Firestore
        });
    }
});

// --- End of script.js ---
