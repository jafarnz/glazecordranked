// Socket.IO connection
let socket;
let isMultiplayer = false;
let otherPlayers = {};
let serverAIPlayers = [];

// Game variables (initialize here in case they're not defined in config.js)
let gameStarted = false;
let gameOver = false;
let playerName = "";
let mouseX = 0;
let mouseY = 0;
let canSplit = true;
let lastSplitTime = 0;
let camera = { x: 0, y: 0, zoom: 1 };
let leaderboard = [];

// Game objects
let player = [];
let foods = [];
let aiPlayers = [];
let particles = [];

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Initialize canvas size
function initCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Initialize game state
function initGame() {
  // Reset game state
  gameStarted = false;
  gameOver = false;
  player = [];
  foods = [];
  aiPlayers = [];
  particles = [];
  otherPlayers = {};
  serverAIPlayers = [];
  
  // Get player name
  playerName = document.getElementById('playerNameInput').value.trim();
  if (!playerName) playerName = "Anonymous Donut";
  
  // Save player name to local storage
  localStorage.setItem('playerName', playerName);
  
  // Check if we're in multiplayer mode
  const urlParams = new URLSearchParams(window.location.search);
  const multiParam = urlParams.get('multiplayer');
  
  // Determine if we should use multiplayer mode
  // 1. Check URL parameter
  // 2. Check if we're running from a server (not file://)
  isMultiplayer = multiParam === 'true' || (window.location.protocol !== 'file:' && multiParam !== 'false');
  
  if (isMultiplayer) {
    console.log('Starting in multiplayer mode');
    // Connect to server
    connectToServer();
  } else {
    console.log('Starting in single player mode');
    // Create player for single player mode
    player.push({
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      size: PLAYER_START_SIZE,
      speed: calculateSpeed(PLAYER_START_SIZE),
      color: DONUT_FLAVORS[0].color,
      name: playerName
    });
    
    // Generate food
    generateFood(FOOD_COUNT);
    
    // Generate AI players
    generateAI(AI_COUNT);
    
    // Set camera to follow player
    camera.x = player[0].x;
    camera.y = player[0].y;
    camera.zoom = 1;
    
    // Hide overlay
    document.getElementById('overlay').style.display = 'none';
    
    // Start game
    gameStarted = true;
  }
}

// Initialize single player game
function initSinglePlayerGame() {
  isMultiplayer = false;
  
  // Create player for single player mode
  player.push({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    size: PLAYER_START_SIZE,
    speed: calculateSpeed(PLAYER_START_SIZE),
    color: DONUT_FLAVORS[0].color,
    name: playerName
  });
  
  // Generate food
  generateFood(FOOD_COUNT);
  
  // Generate AI players
  generateAI(AI_COUNT);
  
  // Set camera to follow player
  camera.x = player[0].x;
  camera.y = player[0].y;
  camera.zoom = 1;
  
  // Hide overlay
  document.getElementById('overlay').style.display = 'none';
  
  // Start game
  gameStarted = true;
}

// Connect to Socket.IO server
function connectToServer() {
  try {
    // Check if io is defined (Socket.IO is available)
    if (typeof io !== 'undefined') {
      // Connect to the server
      socket = io();
      
      // Handle connection
      socket.on('connect', () => {
        console.log('Connected to server');
        
        // Join the game
        socket.emit('join', { name: playerName });
        
        // Create player
        player.push({
          x: GAME_WIDTH / 2,
          y: GAME_HEIGHT / 2,
          size: PLAYER_START_SIZE,
          speed: calculateSpeed(PLAYER_START_SIZE),
          color: DONUT_FLAVORS[0].color,
          name: playerName
        });
        
        // Hide overlay
        document.getElementById('overlay').style.display = 'none';
        
        // Start game
        gameStarted = true;
      });
      
      // Handle game state update
      socket.on('gameState', (data) => {
        // Update other players
        data.players.forEach(p => {
          if (p.id !== socket.id) {
            otherPlayers[p.id] = p;
          }
        });
        
        // Update AI players
        serverAIPlayers = data.aiPlayers;
        
        // Update food
        foods = data.foods;
      });
      
      // Handle regular game updates
      socket.on('update', (data) => {
        // Update other players
        data.players.forEach(p => {
          if (p.id !== socket.id) {
            otherPlayers[p.id] = p;
          }
        });
        
        // Update AI players
        serverAIPlayers = data.aiPlayers;
        
        // Update ejected food
        if (data.foods && data.foods.length > 0) {
          // Add new ejected foods to the existing foods array
          data.foods.forEach(newFood => {
            // Check if this food already exists
            const existingIndex = foods.findIndex(f => f.id === newFood.id);
            if (existingIndex !== -1) {
              // Update existing food
              foods[existingIndex] = newFood;
            } else {
              // Add new food
              foods.push(newFood);
            }
          });
        }
        
        // Update leaderboard
        if (data.leaderboard) {
          updateServerLeaderboard(data.leaderboard);
        }
      });
      
      // Handle player update
      socket.on('playerUpdate', (data) => {
        if (data.id !== socket.id) {
          otherPlayers[data.id] = {
            ...otherPlayers[data.id],
            pieces: data.pieces
          };
        }
      });
      
      // Handle split confirmation
      socket.on('splitConfirm', (data) => {
        console.log('Split confirmed by server', data);
        // Update player pieces with server data
        if (data.pieces && data.pieces.length > 0) {
          // Convert server pieces to client format
          player = data.pieces.map(piece => ({
            x: piece.x,
            y: piece.y,
            size: piece.size,
            color: piece.color,
            name: playerName,
            speed: calculateSpeed(piece.size),
            splitCooldown: 20
          }));
        }
      });
      
      // Handle food update
      socket.on('foodUpdate', (data) => {
        // Update food
        foods = data.foods;
      });
      
      // Handle new player
      socket.on('newPlayer', (data) => {
        otherPlayers[data.id] = data;
      });
      
      // Handle player disconnect
      socket.on('playerDisconnect', (data) => {
        delete otherPlayers[data.id];
      });
      
      // Handle AI update
      socket.on('aiUpdate', (data) => {
        // Find and update the AI player
        const aiIndex = serverAIPlayers.findIndex(ai => ai.id === data.id);
        if (aiIndex !== -1) {
          serverAIPlayers[aiIndex].pieces = data.pieces;
          
          // If the AI has no pieces left, remove it from the array
          if (data.pieces.length === 0) {
            serverAIPlayers.splice(aiIndex, 1);
          }
        }
      });
      
      // Handle leaderboard update
      socket.on('leaderboard', (data) => {
        updateServerLeaderboard(data);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    } else {
      console.error('Socket.IO not available');
      alert('Could not connect to server. Playing in single player mode.');
      initSinglePlayerGame();
    }
  } catch (error) {
    console.error('Error connecting to server:', error);
    alert('Could not connect to server. Playing in single player mode.');
    initSinglePlayerGame();
  }
}

// Update camera to follow player
function updateCamera() {
  if (player.length === 0) return;
  
  // Calculate center of mass
  let centerX = 0;
  let centerY = 0;
  let totalSize = 0;
  
  for (const p of player) {
    centerX += p.x * p.size;
    centerY += p.y * p.size;
    totalSize += p.size;
  }
  
  centerX /= totalSize;
  centerY /= totalSize;
  
  // Smoothly move camera to center of mass
  camera.x = camera.x * 0.9 + centerX * 0.1;
  camera.y = camera.y * 0.9 + centerY * 0.1;
  
  // Improved zoom calculation - more aggressive zoom out for larger players
  // This will make the game more playable at larger sizes
  const baseZoom = 1.2; // Start with a slightly zoomed out view
  const sizeImpact = 0.003; // Reduced impact to prevent excessive zooming
  const targetZoom = Math.max(0.2, Math.min(1.5, baseZoom - (totalSize * sizeImpact)));
  
  // Smoothly adjust zoom
  camera.zoom = camera.zoom * 0.95 + targetZoom * 0.05;
}

// Check collisions between player and food
function checkPlayerFoodCollisions() {
  if (player.length === 0) return;
  
  for (let i = player.length - 1; i >= 0; i--) {
    const p = player[i];
    
    for (let j = foods.length - 1; j >= 0; j--) {
      const food = foods[j];
      
      const dx = p.x - food.x;
      const dy = p.y - food.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < p.size) {
        // Small fixed growth amount
        const growthAmount = food.isEjected ? 3 : 1;
        p.size += growthAmount;
        
        // Cap maximum size using the constant from config.js
        if (p.size > MAX_PLAYER_SIZE) {
          p.size = MAX_PLAYER_SIZE;
        }
        
        p.speed = calculateSpeed(p.size);
        
        // Create particles
        createParticles(food.x, food.y, food.size, food.color, 3);
        
        // In multiplayer mode, notify server
        if (isMultiplayer && socket) {
          socket.emit('eatFood', food.id);
        }
        
        // Remove food
        foods.splice(j, 1);
        
        // Add new food in single player mode
        if (!isMultiplayer) {
          createNewFood();
        }
      }
    }
  }
}

// Create a new food item at a random position
function createNewFood() {
  foods.push({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    size: FOOD_SIZE,
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    isEjected: false
  });
}

// Check collisions between player and AI players or other players
function checkPlayerAICollisions() {
  if (isMultiplayer) {
    // Check collisions with other players in multiplayer mode
    for (let i = player.length - 1; i >= 0; i--) {
      const p = player[i];
      
      // Check each other player
      Object.values(otherPlayers).forEach(otherPlayer => {
        otherPlayer.pieces.forEach(otherPiece => {
          const dx = p.x - otherPiece.x;
          const dy = p.y - otherPiece.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Player eats other player
          if (dist < p.size && p.size > otherPiece.size * 1.1) {
            // Calculate new size based on area (mass) conservation
            const newSize = Math.sqrt(p.size * p.size + otherPiece.size * otherPiece.size);
            p.size = newSize;
            
            // Cap maximum size using the constant from config.js
            if (p.size > MAX_PLAYER_SIZE) {
              p.size = MAX_PLAYER_SIZE;
            }
            
            p.speed = calculateSpeed(p.size);
            
            // Create particles
            createParticles(otherPiece.x, otherPiece.y, otherPiece.size, otherPiece.color, 5);
            
            // Notify server
            socket.emit('eatPlayer', {
              victimId: otherPlayer.id,
              eaterPieceId: p.id,
              victimPieceId: otherPiece.id
            });
          }
          
          // Other player eats player
          if (dist < otherPiece.size && otherPiece.size > p.size * 1.1) {
            // Create particles
            createParticles(p.x, p.y, p.size, p.color, 5);
            
            // Remove player piece
            player.splice(i, 1);
            
            // Check if player is completely eaten
            if (player.length === 0) {
              endGame();
            }
            
            return; // Break the loop
          }
        });
      });
      
      // Check each AI player in multiplayer mode
      serverAIPlayers.forEach(ai => {
        ai.pieces.forEach(aiPiece => {
          const dx = p.x - aiPiece.x;
          const dy = p.y - aiPiece.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Player eats AI
          if (dist < p.size && p.size > aiPiece.size * 1.1) {
            // Calculate new size based on area (mass) conservation
            const newSize = Math.sqrt(p.size * p.size + aiPiece.size * aiPiece.size);
            p.size = newSize;
            
            // Cap maximum size using the constant from config.js
            if (p.size > MAX_PLAYER_SIZE) {
              p.size = MAX_PLAYER_SIZE;
            }
            
            p.speed = calculateSpeed(p.size);
            
            // Create particles
            createParticles(aiPiece.x, aiPiece.y, aiPiece.size, aiPiece.color, 5);
            
            // Notify server
            socket.emit('eatAI', {
              eaterPieceId: p.id,
              aiPieceId: aiPiece.id
            });
          }
          
          // AI eats player
          if (dist < aiPiece.size && aiPiece.size > p.size * 1.1) {
            // Create particles
            createParticles(p.x, p.y, p.size, p.color, 5);
            
            // Remove player piece
            player.splice(i, 1);
            
            // Check if player is completely eaten
            if (player.length === 0) {
              endGame();
            }
            
            return; // Break the loop
          }
        });
      });
    }
  } else {
    // Check collisions with AI players in single player mode
    // Check if player can eat AI
    for (let i = player.length - 1; i >= 0; i--) {
      const p = player[i];
      
      for (let j = aiPlayers.length - 1; j >= 0; j--) {
        const ai = aiPlayers[j];
        
        const dx = p.x - ai.x;
        const dy = p.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Player eats AI
        if (dist < p.size && p.size > ai.size * 1.1) {
          // Calculate new size based on area (mass) conservation
          const newSize = Math.sqrt(p.size * p.size + ai.size * ai.size);
          p.size = newSize;
          
          // Cap maximum size using the constant from config.js
          if (p.size > MAX_PLAYER_SIZE) {
            p.size = MAX_PLAYER_SIZE;
          }
          
          p.speed = calculateSpeed(p.size);
          
          // Create particles
          createParticles(ai.x, ai.y, ai.size, ai.color, 5);
          
          // Remove AI
          aiPlayers.splice(j, 1);
          
          // Add new AI
          generateAI(1);
        }
        
        // AI eats player
        if (dist < ai.size && ai.size > p.size * 1.1) {
          // Create particles
          createParticles(p.x, p.y, p.size, p.color, 5);
          
          // Remove player piece
          player.splice(i, 1);
          
          // Check if player is completely eaten
          if (player.length === 0) {
            endGame();
          }
          
          break; // Break the loop
        }
      }
    }
  }
}

// Update server leaderboard
function updateServerLeaderboard(leaderboardData) {
  const leaderboardList = document.getElementById('leaderboardList');
  if (!leaderboardList) return;
  
  // Clear the current leaderboard
  leaderboardList.innerHTML = '';
  
  // Add each entry to the leaderboard
  leaderboardData.forEach(entry => {
    const listItem = document.createElement('li');
    listItem.textContent = `${entry.name}: ${Math.floor(entry.size)}`;
    
    // Highlight the current player
    if (entry.isPlayer && socket && entry.id === socket.id) {
      listItem.style.color = '#FFD700'; // Gold color
      listItem.style.fontWeight = 'bold';
    } else if (entry.isAI) {
      listItem.style.color = '#41c7c7'; // Cyan color for AI
    }
    
    leaderboardList.appendChild(listItem);
  });
}

// Send player position to server in multiplayer mode
function sendPlayerPosition() {
  if (isMultiplayer && socket && player.length > 0) {
    socket.emit('move', {
      pieces: player.map(p => ({
        x: p.x,
        y: p.y,
        size: p.size
      }))
    });
  }
}

// Game loop
function gameLoop() {
  if (gameStarted && !gameOver) {
    if (!isMultiplayer) {
      // Single player update
      update();
    } else {
      // Multiplayer update - only update player position locally
      updatePlayerPosition();
      sendPlayerPosition();
      checkPlayerFoodCollisions();
      checkPlayerAICollisions();
      updateCamera();
      updateFlavorAndRank();
    }
  }
  
  render();
  requestAnimationFrame(gameLoop);
}

// Update player position based on mouse
function updatePlayerPosition() {
  for (let i = 0; i < player.length; i++) {
    const p = player[i];
    
    // Calculate world coordinates of mouse position
    const worldMouseX = mouseX - canvas.width / 2 + camera.x;
    const worldMouseY = mouseY - canvas.height / 2 + camera.y;
    
    // Calculate direction
    const dx = worldMouseX - p.x;
    const dy = worldMouseY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Update velocity
    if (dist > 0) {
      p.x += (dx / dist) * p.speed;
      p.y += (dy / dist) * p.speed;
    }
    
    // Keep player in bounds with a buffer based on size
    const buffer = 10; // Extra buffer to prevent visual clipping
    p.x = Math.max(p.size + buffer, Math.min(GAME_WIDTH - p.size - buffer, p.x));
    p.y = Math.max(p.size + buffer, Math.min(GAME_HEIGHT - p.size - buffer, p.y));
  }
}

// Event listeners
window.addEventListener('load', function() {
  initCanvas();
  loadHighScore();
  
  // Add multiplayer option to start screen
  const startScreen = document.getElementById('startScreen');
  const modeSelector = document.createElement('div');
  modeSelector.innerHTML = `
    <div style="margin: 20px 0;">
      <label>
        <input type="radio" name="gameMode" value="single" checked> Single Player
      </label>
      <label style="margin-left: 20px;">
        <input type="radio" name="gameMode" value="multi"> Multiplayer
      </label>
    </div>
  `;
  startScreen.insertBefore(modeSelector, document.getElementById('startButton'));
  
  // Start button
  document.getElementById('startButton').addEventListener('click', function() {
    // Set multiplayer flag based on selection
    const isMulti = document.querySelector('input[name="gameMode"]:checked').value === 'multi';
    if (isMulti) {
      window.location.search = '?multiplayer=true';
    } else {
      initGame();
    }
  });
  
  // Restart button
  document.getElementById('restartButton').addEventListener('click', function() {
    initGame();
  });
  
  // Mouse movement
  canvas.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  // Keyboard controls
  window.addEventListener('keydown', function(e) {
    if (gameStarted && !gameOver) {
      // Space to split
      if (e.code === 'Space' && canSplit) {
        if (isMultiplayer && socket) {
          // In multiplayer, send split request to server
          console.log('Sending split request to server');
          socket.emit('split');
        } else {
          // In single player, handle split locally
          splitPlayer();
        }
        
        canSplit = false;
        lastSplitTime = Date.now();
        setTimeout(function() {
          canSplit = true;
        }, SPLIT_COOLDOWN);
      }
      
      // W to eject mass
      if (e.code === 'KeyW') {
        if (isMultiplayer && socket) {
          // In multiplayer, send eject request to server
          const angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
          socket.emit('eject', {
            pieceIndex: 0, // For simplicity, always use the first piece
            angle: angle
          });
        } else {
          // In single player, handle eject locally
          ejectMass();
        }
      }
    }
  });
  
  // Window resize
  window.addEventListener('resize', function() {
    initCanvas();
  });
  
  // Start game loop
  gameLoop();
  
  // Auto-start if URL has multiplayer parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('multiplayer') === 'true') {
    initGame();
  }
});
