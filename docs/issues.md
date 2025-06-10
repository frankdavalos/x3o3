# X³O³ Multiplayer Outstanding Issues

## 1. No Universal Main Menu Access

**Description:**  
Users cannot always return to the main menu (splash screen) from the multiplayer UI.  
- After clicking "Online Multiplayer," users see only "Create Lobby" or "Join Lobby" options, with no way to return to the main menu.
- After clicking "Create Lobby" or "Join Lobby," the "Cancel" button only returns users to the previous multiplayer screen, not the main menu.
- There is no consistent "Back to Main Menu" button across all multiplayer-related screens.

**Impact:**  
Users may get stuck in the multiplayer flow and be unable to access other game modes or settings without refreshing the page.

---

## 2. Game Rules Broken (Win Not Detected in Multiplayer)

**Description:**  
In multiplayer games, the win condition is not properly detected or enforced.  
- Players can continue making moves even after a win condition is met.
- The UI does not highlight the winning line or display a winner message in multiplayer mode.
- The game does not end as expected when a player wins.

**Impact:**  
This breaks the core gameplay experience and can cause confusion or frustration for players.

---

## 3. No Sound Effects in Multiplayer

**Description:**  
Sound effects (for X, O, and winning moves) do not play during multiplayer games.  
- Audio works as expected in single-player/local games.
- In multiplayer mode, no sounds are triggered for moves or wins.

**Impact:**  
Reduces the feedback and immersion for players in multiplayer games.

---

## 4. Game Mode Sync Issue in Multiplayer

**Description:**  
The selected game mode is not reliably synchronized between the lobby creator and the joiner.  
- The lobby creator’s selected mode should be enforced for both players.
- Currently, the joiner may see a different mode depending on their own selection, leading to inconsistent gameplay.

**Impact:**  
Players may experience different rules or board behavior in the same game, causing confusion and unfair outcomes.

---

**Next Steps:**  
Each issue should be addressed and resolved one at a time, starting with the main menu access problem.
