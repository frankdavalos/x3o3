# X³O³ Product Requirements Document (PRD)

## 1. Executive Summary

This PRD outlines the current status of the X³O³ game (a cyberpunk-themed rotating Tic-Tac-Toe game) and provides detailed solutions for the outstanding issues identified in the multiplayer functionality. It presents an implementation plan to enhance user experience, improve gameplay consistency, and ensure feature parity between single-player and multiplayer modes.

## 2. Current Product State

X³O³ is a web-based game with PWA support featuring:
- Single-player, local multiplayer, and online multiplayer modes
- Unique rotating marks mechanic
- Cyberpunk and high-contrast themes
- Firebase integration for real-time multiplayer
- PWA capabilities for offline play

### 2.1 Known Issues

1. **Navigation Issue**: No consistent way to return to the main menu from multiplayer screens
2. **Core Gameplay Issue**: Win conditions not properly detected in multiplayer mode
3. **Feedback Issue**: Sound effects absent in multiplayer games
4. **Consistency Issue**: Game mode not properly synchronized between players

## 3. Detailed Solutions

### 3.1 Universal Main Menu Access

#### Problem Analysis:
Users can get trapped in the multiplayer flow without a clear path back to the main menu, requiring page refresh to access other game modes or settings.

#### Solution:
Implement a persistent "Home" button across all multiplayer screens that safely returns users to the main menu.

```javascript
// Implementation Requirements:

1. Add HTML/CSS for a consistent home button
2. Implement safe navigation that:
   - Handles active game sessions appropriately
   - Notifies other players if applicable
   - Cleans up Firebase listeners
3. Ensure visual consistency with the game's cyberpunk theme
```

#### Technical Implementation:

```javascript
// Add this to the top navigation bar on all screens
function addHomeButton() {
  const navBar = document.querySelector('.nav-bar') || createNavBar();
  
  const homeButton = document.createElement('button');
  homeButton.classList.add('home-button', 'cyberpunk-button');
  homeButton.innerHTML = '<i class="fas fa-home"></i> Main Menu';
  homeButton.addEventListener('click', handleHomeNavigation);
  
  navBar.appendChild(homeButton);
}

function handleHomeNavigation() {
  // If in active multiplayer game, show confirmation
  if (isInActiveMultiplayerGame()) {
    if (!confirm('Leave the current game and return to main menu?')) {
      return;
    }
    // Notify other player if connected
    notifyOpponentOfDeparture();
    // Clean up Firebase listeners
    cleanupFirebaseListeners();
  }
  
  // Navigate to main menu
  showMainMenu();
  hideAllGameScreens();
}
```

### 3.2 Win Detection in Multiplayer

#### Problem Analysis:
The win detection logic works in single-player but fails in multiplayer, allowing moves after a win condition is met and not displaying victory UI.

#### Solution:
Ensure win detection is triggered after each move in multiplayer and synchronize the game state appropriately.

```javascript
// Implementation Requirements:

1. Perform win detection on both client and server sides
2. Update Firestore document to include game status (active, won, draw)
3. Implement UI updates based on game status changes
4. Block further moves after win/draw detection
5. Highlight winning line in multiplayer (matching single-player experience)
```

#### Technical Implementation:

```javascript
// Add or modify the makeMove function in multiplayer.js

async function makeMove(lobbyCode, index, value) {
  try {
    const gameRef = db.collection('games').doc(lobbyCode);
    const gameDoc = await gameRef.get();
    const gameData = gameDoc.data();
    
    // Only allow moves if game is still active
    if (gameData.status !== 'active') {
      console.log('Game is already complete');
      return false;
    }
    
    // Make the move
    const newBoard = [...gameData.board];
    newBoard[index] = value;
    
    // Check for win or draw
    const winResult = checkWinCondition(newBoard, gameData.mode);
    let newStatus = 'active';
    let winningLine = null;
    
    if (winResult.isWin) {
      newStatus = 'won';
      winningLine = winResult.line;
    } else if (isBoardFull(newBoard)) {
      newStatus = 'draw';
    }
    
    // Update game state in Firestore
    await gameRef.update({
      board: newBoard,
      currentPlayer: gameData.currentPlayer === 'X' ? 'O' : 'X',
      lastMove: { index, value },
      status: newStatus,
      winningLine: winningLine,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error making move:', error);
    return false;
  }
}

// Add listener for game state updates that handles win/draw conditions
function setupGameStateListener(lobbyCode) {
  return db.collection('games').doc(lobbyCode)
    .onSnapshot((doc) => {
      const gameData = doc.data();
      updateGameBoard(gameData.board);
      
      // Handle game status
      if (gameData.status === 'won') {
        displayWinner(gameData.currentPlayer === 'X' ? 'O' : 'X', gameData.winningLine);
        playWinSound(); // Add sound effect for win
        disableBoardInput();
      } else if (gameData.status === 'draw') {
        displayDraw();
        disableBoardInput();
      }
    });
}
```

### 3.3 Sound Effects in Multiplayer

#### Problem Analysis:
Sound effects that work in single-player mode are not triggered during multiplayer gameplay, reducing feedback and immersion.

#### Solution:
Integrate sound playback into the multiplayer event handling system, ensuring audio feedback for all player actions.

```javascript
// Implementation Requirements:

1. Ensure audio files are properly cached by service worker
2. Trigger sound effects based on multiplayer state changes
3. Play appropriate sounds for X moves, O moves, and wins
4. Implement volume control and mute option for multiplayer
```

#### Technical Implementation:

```javascript
// Modify the game state listener to include sound effects

function setupGameStateListener(lobbyCode) {
  let previousBoard = Array(9).fill(null);
  
  return db.collection('games').doc(lobbyCode)
    .onSnapshot((doc) => {
      const gameData = doc.data();
      const currentBoard = gameData.board;
      
      // Find what changed to determine which sound to play
      if (previousBoard && currentBoard) {
        for (let i = 0; i < currentBoard.length; i++) {
          if (previousBoard[i] !== currentBoard[i]) {
            // Play the appropriate sound based on the new value
            if (currentBoard[i] === 'X') {
              playSound('x');
            } else if (currentBoard[i] === 'O') {
              playSound('o');
            }
            break;
          }
        }
      }
      
      // Update the board UI
      updateGameBoard(currentBoard);
      
      // Handle game status
      if (gameData.status === 'won') {
        displayWinner(gameData.currentPlayer === 'X' ? 'O' : 'X', gameData.winningLine);
        playSound('winner');
        disableBoardInput();
      } else if (gameData.status === 'draw') {
        displayDraw();
        disableBoardInput();
      }
      
      // Update previous board for next comparison
      previousBoard = [...currentBoard];
    });
}

// Add or ensure this function exists and is accessible
function playSound(soundType) {
  // This should match the sound playing mechanism from single-player
  const soundMap = {
    'x': '/sounds/x.mp3',
    'o': '/sounds/o.mp3',
    'winner': '/sounds/winner.mp3'
  };
  
  const sound = new Audio(soundMap[soundType]);
  sound.play().catch(err => console.log('Error playing sound:', err));
}
```

### 3.4 Game Mode Synchronization

#### Problem Analysis:
The selected game mode is not properly synchronized between the lobby creator and joiner, leading to inconsistent gameplay experiences.

#### Solution:
Ensure game mode is properly stored in the Firestore document and enforced for all players in the multiplayer session.

```javascript
// Implementation Requirements:

1. Store game mode in Firestore during lobby creation
2. Apply the stored game mode when a player joins 
3. Display the active mode to both players
4. Ensure all game logic respects the synchronized mode
```

#### Technical Implementation:

```javascript
// Modify createLobby function to properly store game mode

async function createLobby(selectedMode) {
  try {
    // Generate unique lobby code
    const lobbyCode = generateLobbyCode();
    
    // Create lobby document in Firestore
    await db.collection('games').doc(lobbyCode).set({
      mode: selectedMode,  // Clearly set the game mode
      status: 'waiting',
      board: Array(9).fill(null),
      currentPlayer: 'X',
      creator: auth.currentUser.uid,
      joiner: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      lobbyCode: lobbyCode
    };
  } catch (error) {
    console.error('Error creating lobby:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Modify joinLobby function to apply the creator's game mode
async function joinLobby(lobbyCode) {
  try {
    const gameRef = db.collection('games').doc(lobbyCode);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) {
      return {
        success: false,
        error: 'Lobby not found'
      };
    }
    
    const gameData = gameDoc.data();
    
    if (gameData.status !== 'waiting') {
      return {
        success: false,
        error: 'Game already in progress'
      };
    }
    
    // Update game status
    await gameRef.update({
      joiner: auth.currentUser.uid,
      status: 'active',
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Apply the creator's game mode to the joiner's interface
    setGameMode(gameData.mode);
    displayGameMode(gameData.mode);
    
    return {
      success: true,
      mode: gameData.mode
    };
  } catch (error) {
    console.error('Error joining lobby:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ensure game mode is properly displayed and applied
function setGameMode(mode) {
  // Update UI to show active mode
  document.querySelectorAll('.mode-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Apply game logic for the selected mode
  applyGameRules(mode);
}

function displayGameMode(mode) {
  const modeDisplay = document.getElementById('current-mode');
  modeDisplay.textContent = `Mode: ${formatModeName(mode)}`;
  modeDisplay.classList.remove('hidden');
}

function formatModeName(modeId) {
  // Convert mode ID to display name
  const modeNames = {
    'classic': 'Classic',
    'rotation': 'Rotation',
    'chaos': 'Chaos Mode'
  };
  return modeNames[modeId] || modeId;
}
```

## 4. Implementation Plan

### 4.1 Phase 1: Navigation & UI Improvements

**Estimated Effort: 1-2 days**
- Add persistent home button across all screens
- Implement confirmation dialogs for game abandonment
- Ensure proper cleanup of Firebase listeners on navigation

### 4.2 Phase 2: Core Gameplay Fixes

**Estimated Effort: 2-3 days**
- Implement win detection in multiplayer
- Add game status tracking in Firestore
- Create UI for displaying winners and draws
- Highlight winning lines in multiplayer mode

### 4.3 Phase 3: Audio & Feedback

**Estimated Effort: 1 day**
- Integrate sound effects with multiplayer state changes
- Ensure proper caching of audio files
- Add mute toggle for multiplayer audio

### 4.4 Phase 4: Game Mode Synchronization

**Estimated Effort: 1-2 days**
- Update lobby creation to properly store game mode
- Modify join logic to respect creator's mode selection
- Add UI elements to display active mode

### 4.5 Phase 5: Testing & Polish

**Estimated Effort: 1-2 days**
- Comprehensive testing of all fixes
- Edge case handling for network issues
- Performance optimization for mobile devices

## 5. Additional Recommendations

### 5.1 Multiplayer Enhancements
- Add player status indicators (online/offline)
- Implement rematch functionality
- Add basic chat or emoji reactions
- Create a lobby browser instead of code-only joining

### 5.2 Performance Improvements
- Optimize Firebase reads/writes to reduce costs
- Implement better error handling for network failures
- Add offline detection and recovery

### 5.3 Analytics and Monitoring
- Implement basic analytics to track usage patterns
- Add error reporting to identify issues in production
- Monitor Firebase usage to control costs

## 6. Success Metrics

- **Navigation**: Users can navigate through all screens without getting stuck
- **Gameplay**: Win conditions are properly detected in 100% of multiplayer games
- **Audio**: Sound effects play consistently in both single and multiplayer
- **Consistency**: Game mode is properly synchronized between players
- **Retention**: Increase in completed multiplayer games (fewer abandons due to bugs)

## 7. Conclusion

The X³O³ game has a strong foundation with unique gameplay and visual identity. By addressing these critical issues in the multiplayer experience, we can significantly improve user satisfaction and retention. The proposed solutions maintain the existing architecture while enhancing reliability and feature consistency across game modes.