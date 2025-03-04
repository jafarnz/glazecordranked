// Socket.IO connection
let socket;
let isMultiplayer = false;
let otherPlayers = {};
let serverAIPlayers = [];

// Game variables
let gameStarted = false;
let gameOver = false;
let playerName = "";
let mouseX = 0;
let mouseY = 0;
let canSplit = true;
let lastSplitTime = 0;
let camera = { x: 0, y: 0, zoom: 1 };
let leaderboard = [];
let gameStartTime = 0;
let lastFrameTime = 0;
let fps = 0;
let ping = 0;
let isMobileDevice = false;
let qualityLevel = 'high';
let soundEnabled = true;
let showMinimap = true;

// Game objects
let player = [];
let foods = [];
let aiPlayers = [];
let particles = [];
let notifications = [];

// Game stats
let gameStats = {
  totalScore: 0,
  donutsEaten: 0,
  playersEaten: 0,
  timeAlive: 0
};

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Minimap canvas
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

// Sounds
const sounds = {
  eat: new Audio('https://cdn.freesound.org/previews/256/256116_4772965-lq.mp3'),
  split: new Audio('https://cdn.freesound.org/previews/396/396426_7363675-lq.mp3'),
  gameOver: new Audio('https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3'),
  bgMusic: new Audio('https://cdn.freesound.org/previews/520/520609_9960562-lq.mp3')
};

// Initialize sounds
for (let sound in sounds) {
  sounds[sound].volume = 0.3;
  sounds[sound].preload = 'auto';
}
sounds.bgMusic.volume = 0.1;
sounds.bgMusic.loop = true;

// Initialize canvas size
function initCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  if (minimapCanvas) {
    minimapCanvas.width = 150;
    minimapCanvas.height = 150;
  }
  
  // Detect if on mobile
  isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Create mobile controls if needed
  if (isMobileDevice && !document.getElementById('mobile-controls')) {
    createMobileControls();
  }
}

// Create mobile controls
function createMobileControls() {
  const mobileControls = document.createElement('div');
  mobileControls.id = 'mobile-controls';
  
  const splitButton = document.createElement('div');
  splitButton.className = 'mobile-button';
  splitButton.textContent = 'Split';
  splitButton.addEventListener('touchstart', function() {
    splitPlayer();
  });
  
  const ejectButton = document.createElement('div');
  ejectButton.className = 'mobile-button';
  ejectButton.textContent = 'Eject';
  ejectButton.addEventListener('touchstart', function() {
    ejectMass();
  });
  
  mobileControls.appendChild(ejectButton);
  mobileControls.appendChild(splitButton);
  document.body.appendChild(mobileControls);
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
  gameStats = {
    totalScore: 0,
    donutsEaten: 0,
    playersEaten: 0,
    timeAlive: 0
  };
  
  // Get player name
  playerName = document.getElementById('playerNameInput').value.trim();
  if (!playerName) playerName = "Anonymous Donut";
  
  // Save player name to local storage
  localStorage.setItem('playerName', playerName);
  
  // Show loading screen
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'block';
  
  // Apply quality settings
  applyQualitySettings();
  
  // Check if we're in multiplayer mode
  const urlParams = new URLSearchParams(window.location.search);
  const multiParam = urlParams.get('multiplayer');
  
  // Determine if we should use multiplayer mode
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
    
    // Hide loading and overlay
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    
    // Start game
    gameStarted = true;
    gameStartTime = Date.now();
    
    // Play background music if enabled
    if (soundEnabled) {
      sounds.bgMusic.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Show welcome notification
    showNotification('Welcome to Glazecord Ranked!', 'success');
  }
}

// Apply quality settings
function applyQualitySettings() {
  qualityLevel = document.getElementById('qualitySelect').value;
  soundEnabled = document.getElementById('soundToggle').checked;
  
  // Save settings to local storage
  localStorage.setItem('qualityLevel', qualityLevel);
  localStorage.setItem('soundEnabled', soundEnabled ? 'true' : 'false');
  
  // Apply quality settings
  switch (qualityLevel) {
    case 'low':
      // Reduce particle effects, disable shadows
      // Implement quality-specific rendering in the rendering.js file
      break;
    case 'medium':
      // Moderate effects
      break;
    case 'high':
      // Full effects
      break;
  }
  
  // Mute/unmute sounds
  for (let sound in sounds) {
    sounds[sound].muted = !soundEnabled;
  }
}

// Initialize single player game
function initSinglePlayerGame() {
  isMultiplayer = false;
  initGame();
}

// Initialize multiplayer game
function initMultiPlayerGame() {
  isMultiplayer = true;
  initGame();
}

// Connect to server
function connectToServer() {
  try {
    // Connect to Socket.IO server
    socket = io();
    
    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to server');
      
      // Join game
      socket.emit('join', {
        name: playerName
      });
      
      // Handle connection errors
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Connection error. Retrying...', 'error');
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Disconnected from server', 'error');
      });
    });
    
    // Handle initial game state
    socket.on('gameState', (data) => {
      console.log('Received initial game state');
      
      // Initialize player
      const myPlayer = data.players.find(p => p.id === socket.id);
      if (myPlayer) {
        player = myPlayer.pieces.map(piece => ({
          x: piece.x,
          y: piece.y,
          size: piece.size,
          color: piece.color,
          name: playerName,
          speed: calculateSpeed(piece.size)
        }));
      }
      
      // Set camera to follow player
      if (player.length > 0) {
        camera.x = player[0].x;
        camera.y = player[0].y;
      }
      
      // Initialize other players
      data.players.forEach(p => {
        if (p.id !== socket.id) {
          otherPlayers[p.id] = p;
        }
      });
      
      // Update AI players
      serverAIPlayers = data.aiPlayers;
      
      // Update food
      foods = data.foods;
      
      // Hide loading and overlay
      document.getElementById('loadingScreen').style.display = 'none';
      document.getElementById('overlay').style.display = 'none';
      
      // Start game
      gameStarted = true;
      gameStartTime = Date.now();
      
      // Play background music if enabled
      if (soundEnabled) {
        sounds.bgMusic.play().catch(e => console.log('Audio play failed:', e));
      }
      
      // Show welcome notification
      showNotification('Welcome to Glazecord Ranked!', 'success');
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
      
      // Update ping
      ping = Date.now() - data.timestamp;
      updatePingDisplay();
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
      
      // Play split sound if enabled
      if (soundEnabled) {
        sounds.split.play().catch(e => console.log('Audio play failed:', e));
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
      showNotification(`${data.name} joined the game!`, 'info');
    });
    
    // Handle player disconnect
    socket.on('playerDisconnect', (data) => {
      delete otherPlayers[data.id];
    });
    
    // Handle leaderboard update
    socket.on('leaderboard', (data) => {
      updateServerLeaderboard(data);
    });
    
    // Handle game over
    socket.on('gameOver', () => {
      handleGameOver();
    });
    
  } catch (error) {
    console.error('Error connecting to server:', error);
    showNotification('Failed to connect to server', 'error');
    
    // Fall back to single player mode
    isMultiplayer = false;
    initSinglePlayerGame();
  }
}

// Update server leaderboard
function updateServerLeaderboard(data) {
  leaderboard = data;
  updateLeaderboardDisplay();
}

// Update leaderboard display
function updateLeaderboardDisplay() {
  const leaderboardList = document.getElementById('leaderboardList');
  if (!leaderboardList) return;
  
  leaderboardList.innerHTML = '';
  
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    let name = entry.name || 'Unknown Player';
    let size = Math.floor(entry.size);
    
    // Highlight current player's entry
    if ((entry.isPlayer && entry.id === socket.id) || 
        (!isMultiplayer && entry.name === playerName)) {
      li.style.color = '#FFD700';
      li.style.fontWeight = 'bold';
      name = `You (${name})`;
    }
    
    // Add AI indicator for AI players
    if (entry.isAI) {
      name = `[AI] ${name}`;
    }
    
    li.textContent = `${name}: ${size}`;
    leaderboardList.appendChild(li);
  });
}

// Update ping display
function updatePingDisplay() {
  const pingDisplay = document.getElementById('ping');
  if (pingDisplay) {
    pingDisplay.textContent = `Ping: ${ping}ms`;
  }
}

// Update FPS display
function updateFPSDisplay() {
  const fpsDisplay = document.getElementById('fps');
  if (fpsDisplay) {
    fpsDisplay.textContent = `FPS: ${fps}`;
  }
}

// Update location display
function updateLocationDisplay() {
  const locationDisplay = document.getElementById('mapLocation');
  if (locationDisplay && player.length > 0) {
    const x = Math.floor(player[0].x);
    const y = Math.floor(player[0].y);
    locationDisplay.textContent = `Location: (${x}, ${y})`;
  }
}

// Update player count display
function updatePlayerCountDisplay() {
  const playerCountDisplay = document.getElementById('playerCount');
  if (playerCountDisplay) {
    let count = Object.keys(otherPlayers).length + 1; // +1 for the current player
    playerCountDisplay.textContent = `Players: ${count}`;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const container = document.getElementById('notifications-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      container.removeChild(notification);
    }, 300);
  }, 3000);
}

// Handle game over
function handleGameOver() {
  gameOver = true;
  gameStarted = false;
  
  // Stop background music
  sounds.bgMusic.pause();
  sounds.bgMusic.currentTime = 0;
  
  // Play game over sound if enabled
  if (soundEnabled) {
    sounds.gameOver.play().catch(e => console.log('Audio play failed:', e));
  }
  
  // Calculate time alive
  const timeAlive = Math.floor((Date.now() - gameStartTime) / 1000);
  const minutes = Math.floor(timeAlive / 60);
  const seconds = timeAlive % 60;
  const timeAliveFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  // Update final score and stats
  document.getElementById('finalScore').textContent = `Score: ${Math.floor(gameStats.totalScore)}`;
  document.getElementById('timeAlive').textContent = `Time Alive: ${timeAliveFormatted}`;
  document.getElementById('finalRank').textContent = `Final Rank: ${getPlayerRank(gameStats.totalScore)}`;
  document.getElementById('donuts-eaten').textContent = `Donuts Eaten: ${gameStats.donutsEaten}`;
  
  // Show game over screen
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('gameOverScreen').style.display = 'block';
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'none';
}

// Get player rank based on score
function getPlayerRank(score) {
  for (let i = PLAYER_RANKS.length - 1; i >= 0; i--) {
    if (score >= PLAYER_RANKS[i].size) {
      return PLAYER_RANKS[i].rank;
    }
  }
  return PLAYER_RANKS[0].rank;
}

// Share score
function shareScore() {
  const score = Math.floor(gameStats.totalScore);
  const text = `I scored ${score} in Glazecord Ranked! Can you beat my score?`;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: 'My Glazecord Ranked Score',
      text: text,
      url: url
    }).catch(console.error);
  } else {
    // Fallback to clipboard copy
    const tempInput = document.createElement('input');
    tempInput.value = `${text} Play at ${url}`;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    showNotification('Score copied to clipboard!', 'success');
  }
}

// Document ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize canvas
  initCanvas();
  
  // Load saved name from local storage
  const savedName = localStorage.getItem('playerName');
  if (savedName) {
    document.getElementById('playerNameInput').value = savedName;
  }
  
  // Load saved settings
  const savedQuality = localStorage.getItem('qualityLevel');
  if (savedQuality) {
    document.getElementById('qualitySelect').value = savedQuality;
  }
  
  const savedSound = localStorage.getItem('soundEnabled');
  if (savedSound !== null) {
    document.getElementById('soundToggle').checked = savedSound === 'true';
  }
  
  // Start button
  document.getElementById('multiplayerButton').addEventListener('click', function() {
    initMultiPlayerGame();
  });
  
  // Single player button
  document.getElementById('singlePlayerButton').addEventListener('click', function() {
    initSinglePlayerGame();
  });
  
  // Restart button
  document.getElementById('restartButton').addEventListener('click', function() {
    location.reload();
  });
  
  // Share button
  document.getElementById('shareButton').addEventListener('click', function() {
    shareScore();
  });
  
  // Quality select
  document.getElementById('qualitySelect').addEventListener('change', function() {
    applyQualitySettings();
  });
  
  // Sound toggle
  document.getElementById('soundToggle').addEventListener('change', function() {
    applyQualitySettings();
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    initCanvas();
  });
  
  // Start animation loop
  animationLoop();
});

// Animation loop
function animationLoop() {
  // Calculate FPS
  const now = performance.now();
  fps = Math.round(1000 / (now - lastFrameTime));
  lastFrameTime = now;
  
  // Update game state
  if (gameStarted && !gameOver) {
    updateGame();
    renderGame();
    
    // Update HUD
    updateHUD();
  }
  
  // Request next frame
  requestAnimationFrame(animationLoop);
}

// Update HUD
function updateHUD() {
  updateFPSDisplay();
  updateLocationDisplay();
  updatePlayerCountDisplay();
  
  // Update game stats
  if (player.length > 0) {
    // Calculate total score (sum of all piece sizes)
    let totalScore = 0;
    for (let i = 0; i < player.length; i++) {
      totalScore += player[i].size;
    }
    gameStats.totalScore = totalScore;
    
    // Update score display
    document.getElementById('score').textContent = `Score: ${Math.floor(totalScore)}`;
    
    // Update rank based on size
    document.getElementById('rank').textContent = `Rank: ${getPlayerRank(totalScore)}`;
    
    // Update flavor based on size
    let flavor = DONUT_FLAVORS[0].name;
    for (let i = DONUT_FLAVORS.length - 1; i >= 0; i--) {
      if (totalScore >= DONUT_FLAVORS[i].size) {
        flavor = DONUT_FLAVORS[i].name;
        break;
      }
    }
    document.getElementById('flavor').textContent = `Flavor: ${flavor}`;
  }
}

// Input handling
document.addEventListener('mousemove', function(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

document.addEventListener('touchmove', function(e) {
  e.preventDefault();
  mouseX = e.touches[0].clientX;
  mouseY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('keydown', function(e) {
  if (e.code === 'Space') {
    splitPlayer();
  } else if (e.code === 'KeyW') {
    ejectMass();
  } else if (e.code === 'KeyE') {
    toggleMinimap();
  }
});

// Split player
function splitPlayer() {
  if (!gameStarted || gameOver) return;
  
  if (isMultiplayer) {
    socket.emit('split');
  } else {
    // Single player split logic
    // Implement split logic in gameplay.js
    performSplit();
    
    // Play split sound if enabled
    if (soundEnabled) {
      sounds.split.play().catch(e => console.log('Audio play failed:', e));
    }
  }
}

// Eject mass
function ejectMass() {
  if (!gameStarted || gameOver) return;
  
  if (isMultiplayer) {
    // Calculate angle based on mouse position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    
    socket.emit('eject', {
      angle: angle
    });
  } else {
    // Single player eject logic
    // Implement eject logic in gameplay.js
    performEject();
  }
}

// Toggle minimap
function toggleMinimap() {
  showMinimap = !showMinimap;
  
  const minimapContainer = document.getElementById('minimap-container');
  if (minimapContainer) {
    minimapContainer.style.display = showMinimap ? 'block' : 'none';
  }
}

// Export necessary functions for use in other files
window.initGame = initGame;
window.showNotification = showNotification;
window.splitPlayer = splitPlayer;
window.ejectMass = ejectMass;
window.toggleMinimap = toggleMinimap;
window.handleGameOver = handleGameOver;
