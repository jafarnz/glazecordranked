const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Add a route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state
const players = {};
const foods = [];
const aiPlayers = [];
const GAME_WIDTH = 4000;
const GAME_HEIGHT = 4000;
const FOOD_SIZE = 15;
const FOOD_COUNT = 500;
const AI_COUNT = 5; // Only 5 AI in multiplayer
const FOOD_COLORS = [
  '#FF9EB5', // pink
  '#FFD79E', // orange
  '#D0FF9E', // lime
  '#9EFFFC', // cyan
  '#D09EFF', // purple
  '#FF9E9E', // red
  '#FFFF9E'  // yellow
];

// AI Names
const AI_NAMES = [
  "Sprinkles", "Frosting", "Doughboy", "Glazey", "Sugar Rush",
  "Crumbly", "Filled", "BakerBot", "Cruller", "JellyRoll",
  "DonutDuke", "GlazeMonster", "FrostyTop", "Crusted", "SprinkleKing"
];

// Donut Flavors based on size
const DONUT_FLAVORS = [
  { size: 0, name: "Plain", color: "#F5DEB3" },
  { size: 100, name: "Strawberry Frosted", color: "#FF9EB5" },
  { size: 250, name: "Chocolate Glazed", color: "#8B4513" },
  { size: 500, name: "Maple Pecan", color: "#CD853F" },
  { size: 1000, name: "Blueberry Blast", color: "#4169E1" },
  { size: 2000, name: "Rainbow Sprinkled", color: "#FF1493" },
  { size: 3500, name: "Gold Glaze Champion", color: "#FFD700" },
  { size: 5000, name: "Cosmic Donut", color: "#8A2BE2" }
];

// Import game constants
const { 
  PLAYER_START_SIZE, 
  MAX_PLAYER_SIZE
} = require('./config');

// Generate a single food item
function createFood() {
  foods.push({
    id: `food-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    size: FOOD_SIZE,
    type: 'food',
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)]
  });
}

// Generate initial food
function generateFood() {
  for (let i = 0; i < FOOD_COUNT; i++) {
    createFood();
  }
}

// Generate AI players
function createAIPlayer() {
  for (let i = 0; i < AI_COUNT; i++) {
    const size = PLAYER_START_SIZE + Math.random() * 10; // Start with a size similar to players
    const aiPlayer = {
      id: `ai-${Date.now()}-${i}`,
      name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] + " " + Math.floor(Math.random() * 100),
      isAI: true,
      pieces: [{
        id: `ai-${Date.now()}-${i}-0`,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: size,
        speed: calculateSpeed(size), // Add speed property
        color: DONUT_FLAVORS[0].color,
        angle: Math.random() * Math.PI * 2 // Add initial random movement angle
      }]
    };
    aiPlayers.push(aiPlayer);
  }
}

// Calculate speed based on size (bigger = slower)
function calculateSpeed(size) {
  return Math.max(1, 5 * (80 / size));
}

// Update AI player behavior
function updateAI() {
  if (!aiPlayers || aiPlayers.length === 0) return;
  
  for (let i = 0; i < aiPlayers.length; i++) {
    const ai = aiPlayers[i];
    if (!ai || !ai.pieces || ai.pieces.length === 0) continue;
    
    for (let j = 0; j < ai.pieces.length; j++) {
      const piece = ai.pieces[j];
      if (!piece) continue;
      
      // Calculate speed based on size
      piece.speed = calculateSpeed(piece.size);
      
      // Move towards the nearest food or smaller player
      let target = null;
      let minDist = Infinity;
      
      // Check for nearby food
      for (let k = 0; k < foods.length; k++) {
        const food = foods[k];
        if (!food) continue;
        
        const dx = piece.x - food.x;
        const dy = piece.y - food.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist && dist < piece.size * 5) {
          minDist = dist;
          target = food;
        }
      }
      
      // Check for nearby smaller players
      const playerKeys = Object.keys(players);
      for (let k = 0; k < playerKeys.length; k++) {
        const player = players[playerKeys[k]];
        if (!player || !player.pieces) continue;
        
        for (let l = 0; l < player.pieces.length; l++) {
          const playerPiece = player.pieces[l];
          if (!playerPiece) continue;
          
          if (playerPiece.size * 1.1 < piece.size) {
            const dx = piece.x - playerPiece.x;
            const dy = piece.y - playerPiece.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist && dist < piece.size * 5) {
              minDist = dist;
              target = {
                x: playerPiece.x,
                y: playerPiece.y,
                size: playerPiece.size,
                id: playerPiece.id,
                playerId: playerKeys[k],
                isPlayer: true
              };
            }
          } else if (playerPiece.size > piece.size * 1.1) {
            // Run away from bigger players
            const dx = piece.x - playerPiece.x;
            const dy = piece.y - playerPiece.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < piece.size * 8) {
              // Move in the opposite direction
              piece.x += (dx / dist) * piece.speed * 1.5;
              piece.y += (dy / dist) * piece.speed * 1.5;
              
              // Skip other movement for this update
              target = null;
              break;
            }
          }
        }
      }
      
      // Check for nearby smaller AI players
      for (let k = 0; k < aiPlayers.length; k++) {
        const otherAI = aiPlayers[k];
        if (!otherAI || !otherAI.pieces || otherAI.id === ai.id) continue;
        
        for (let l = 0; l < otherAI.pieces.length; l++) {
          const otherPiece = otherAI.pieces[l];
          if (!otherPiece) continue;
          
          if (otherPiece.size * 1.1 < piece.size) {
            const dx = piece.x - otherPiece.x;
            const dy = piece.y - otherPiece.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist && dist < piece.size * 5) {
              minDist = dist;
              target = {
                x: otherPiece.x,
                y: otherPiece.y,
                size: otherPiece.size,
                id: otherPiece.id,
                aiId: otherAI.id,
                isAI: true
              };
            }
          } else if (otherPiece.size > piece.size * 1.1) {
            // Run away from bigger AI players
            const dx = piece.x - otherPiece.x;
            const dy = piece.y - otherPiece.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < piece.size * 8) {
              // Move in the opposite direction
              piece.x += (dx / dist) * piece.speed * 1.5;
              piece.y += (dy / dist) * piece.speed * 1.5;
              
              // Skip other movement for this update
              target = null;
              break;
            }
          }
        }
      }
      
      // Move towards the target or in a random direction
      if (target) {
        const dx = target.x - piece.x;
        const dy = target.y - piece.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const speed = piece.speed || calculateSpeed(piece.size);
          piece.x += (dx / dist) * speed;
          piece.y += (dy / dist) * speed;
        }
        
        // Check if AI can eat the target
        if (dist < piece.size) {
          if (target.type === 'food') {
            // AI eats food
            const foodIndex = foods.findIndex(f => f.id === target.id);
            if (foodIndex !== -1) {
              // Small fixed growth amount
              piece.size += 1;
              
              // Cap maximum size using the constant from config.js
              if (piece.size > MAX_PLAYER_SIZE) {
                piece.size = MAX_PLAYER_SIZE;
              }
              
              piece.speed = calculateSpeed(piece.size);
              
              // Remove the food
              foods.splice(foodIndex, 1);
              
              // Add new food
              createFood();
            }
          } else if (target.isPlayer) {
            // AI eats player
            const player = players[target.playerId];
            if (player) {
              const playerPieceIndex = player.pieces.findIndex(p => p.id === target.id);
              if (playerPieceIndex !== -1) {
                // Calculate new size based on area (mass) conservation
                const playerPiece = player.pieces[playerPieceIndex];
                const newSize = Math.sqrt(piece.size * piece.size + playerPiece.size * playerPiece.size);
                piece.size = newSize;
                
                // Cap maximum size using the constant from config.js
                if (piece.size > MAX_PLAYER_SIZE) {
                  piece.size = MAX_PLAYER_SIZE;
                }
                
                piece.speed = calculateSpeed(piece.size);
                
                // Remove the player piece
                player.pieces.splice(playerPieceIndex, 1);
                
                // Check if the player has no more pieces
                if (player.pieces.length === 0) {
                  // Remove the player from the game
                  delete players[target.playerId];
                  io.to(target.playerId).emit('gameOver');
                }
                
                // Broadcast the updated player state to all clients
                io.emit('playerUpdate', {
                  id: target.playerId,
                  pieces: player.pieces
                });
                
                // Update leaderboard
                updateLeaderboard();
              }
            }
          } else if (target.isAI) {
            // AI eats another AI
            const otherAI = aiPlayers.find(a => a.id === target.aiId);
            if (otherAI) {
              const otherPieceIndex = otherAI.pieces.findIndex(p => p.id === target.id);
              if (otherPieceIndex !== -1) {
                // Calculate new size based on area (mass) conservation
                const otherPiece = otherAI.pieces[otherPieceIndex];
                const newSize = Math.sqrt(piece.size * piece.size + otherPiece.size * otherPiece.size);
                piece.size = newSize;
                
                // Cap maximum size using the constant from config.js
                if (piece.size > MAX_PLAYER_SIZE) {
                  piece.size = MAX_PLAYER_SIZE;
                }
                
                piece.speed = calculateSpeed(piece.size);
                
                // Remove the other AI piece
                otherAI.pieces.splice(otherPieceIndex, 1);
                
                // Broadcast the updated AI state to all clients
                io.emit('aiUpdate', {
                  id: otherAI.id,
                  pieces: otherAI.pieces
                });
                
                // Check if the other AI has no more pieces
                if (otherAI.pieces.length === 0) {
                  // Remove the AI from the game
                  const otherAIIndex = aiPlayers.findIndex(a => a.id === otherAI.id);
                  if (otherAIIndex !== -1) {
                    aiPlayers.splice(otherAIIndex, 1);
                    
                    // Create a new AI player
                    createAIPlayer();
                  }
                }
                
                // Update leaderboard
                updateLeaderboard();
              }
            }
          }
        }
      } else {
        // No target found, move in a random direction
        if (!piece.angle || Math.random() < 0.05) {
          piece.angle = Math.random() * Math.PI * 2;
        }
        
        const speed = piece.speed || calculateSpeed(piece.size);
        piece.x += Math.cos(piece.angle) * speed;
        piece.y += Math.sin(piece.angle) * speed;
      }
      
      // Keep AI within bounds with proper buffer based on size
      piece.x = Math.max(piece.size, Math.min(GAME_WIDTH - piece.size, piece.x));
      piece.y = Math.max(piece.size, Math.min(GAME_HEIGHT - piece.size, piece.y));
    }
  }
}

// Initialize food and AI
generateFood();
createAIPlayer();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle player joining
  socket.on('join', (data) => {
    console.log(`Player joined: ${socket.id}, name: ${data.name}`);
    
    // Create new player
    players[socket.id] = {
      id: socket.id,
      name: data.name,
      x: GAME_WIDTH / 2 + (Math.random() * 400 - 200),
      y: GAME_HEIGHT / 2 + (Math.random() * 400 - 200),
      size: PLAYER_START_SIZE,
      color: '#F5DEB3',
      pieces: [{
        id: `${socket.id}-0`,
        x: GAME_WIDTH / 2 + (Math.random() * 400 - 200),
        y: GAME_HEIGHT / 2 + (Math.random() * 400 - 200),
        size: PLAYER_START_SIZE,
        color: '#F5DEB3'
      }]
    };
    
    // Send initial game state to player
    socket.emit('gameState', {
      players: Object.values(players),
      aiPlayers: aiPlayers,
      foods: foods.slice(0, 200) // Send only a portion of food to reduce payload size
    });
    
    // Broadcast new player to all other clients
    socket.broadcast.emit('newPlayer', players[socket.id]);
    
    // Update leaderboard immediately
    updateLeaderboard();
  });
  
  // Handle player movement
  socket.on('move', (data) => {
    const player = players[socket.id];
    if (player) {
      // Update player position
      for (let i = 0; i < player.pieces.length; i++) {
        const piece = player.pieces[i];
        if (data.pieces && data.pieces[i]) {
          piece.x = data.pieces[i].x;
          piece.y = data.pieces[i].y;
          piece.size = data.pieces[i].size;
        }
      }
    }
  });
  
  // Handle player splitting
  socket.on('split', () => {
    console.log("Server: Split request received");
    const player = players[socket.id];
    
    if (player && player.pieces.length < 8) {
      console.log("Server: Player can split, current pieces:", player.pieces.length);
      const newPieces = [];
      
      for (let i = 0; i < player.pieces.length; i++) {
        const piece = player.pieces[i];
        console.log("Server: Checking piece", i, "size:", piece.size);
        
        if (piece.size >= 50) {
          console.log("Server: Splitting piece", i);
          
          // Get direction from client data or use random angle
          const angle = Math.random() * Math.PI * 2;
          console.log("Server: Split angle:", angle);
          
          // Simple division - original piece gets half size, new piece gets half size
          const newSize = piece.size / Math.sqrt(2); // Use sqrt(2) for more accurate mass conservation
          console.log("Server: New size:", newSize);
          
          // Resize original piece
          piece.size = newSize;
          
          // Create new piece with significant distance
          const newPiece = {
            id: `${socket.id}-${player.pieces.length + newPieces.length}`,
            x: piece.x + Math.cos(angle) * (newSize * 2 + 30), // Add a larger gap
            y: piece.y + Math.sin(angle) * (newSize * 2 + 30), // Add a larger gap
            size: newSize,
            color: piece.color
          };
          
          console.log("Server: New piece position:", newPiece.x, newPiece.y);
          
          // Keep new piece in bounds
          newPiece.x = Math.max(newPiece.size + 10, Math.min(GAME_WIDTH - newPiece.size - 10, newPiece.x));
          newPiece.y = Math.max(newPiece.size + 10, Math.min(GAME_HEIGHT - newPiece.size - 10, newPiece.y));
          
          newPieces.push(newPiece);
          console.log("Server: Added new piece to newPieces array");
        }
      }
      
      console.log("Server: New pieces to add:", newPieces.length);
      
      // Add new pieces to player
      if (newPieces.length > 0) {
        player.pieces = player.pieces.concat(newPieces);
        console.log("Server: Updated player pieces:", player.pieces.length);
        
        // Broadcast the updated player state to all clients
        io.emit('playerUpdate', {
          id: socket.id,
          pieces: player.pieces
        });
        
        // Send confirmation to the client that initiated the split
        socket.emit('splitConfirm', {
          pieces: player.pieces
        });
      }
    }
  });
  
  // Handle player ejecting mass
  socket.on('eject', (data) => {
    const player = players[socket.id];
    
    if (player && player.pieces.length > 0) {
      const pieceIndex = data.pieceIndex || 0;
      const piece = player.pieces[pieceIndex];
      
      if (piece && piece.size > 50) {
        // Calculate direction
        const angle = data.angle || Math.random() * Math.PI * 2;
        
        // Create ejected mass as food
        const ejectedMass = {
          id: `food-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          x: piece.x + Math.cos(angle) * piece.size,
          y: piece.y + Math.sin(angle) * piece.size,
          size: 15,
          type: 'food',
          color: piece.color,
          vx: Math.cos(angle) * 20, // Increased velocity
          vy: Math.sin(angle) * 20, // Increased velocity
          isEjected: true,
          lifeTime: 150 // Increased lifetime to travel further
        };
        
        foods.push(ejectedMass);
        
        // Reduce player size by a small fixed amount
        piece.size -= 5;
        
        // Ensure player doesn't get too small
        if (piece.size < 30) {
          piece.size = 30;
        }
        
        // Broadcast the new food to all clients
        io.emit('foodUpdate', {
          foods: [ejectedMass]
        });
      }
    }
  });
  
  // Handle food eaten
  socket.on('eatFood', (foodId) => {
    const foodIndex = foods.findIndex(food => food.id === foodId);
    if (foodIndex !== -1) {
      // Remove eaten food
      foods.splice(foodIndex, 1);
      
      // Add new food
      generateFood();
    }
  });
  
  // Handle player eating another player
  socket.on('eatPlayer', (data) => {
    const eater = players[socket.id];
    const victim = players[data.victimId];
    
    if (eater && victim) {
      const eaterPiece = eater.pieces.find(p => p.id === data.eaterPieceId);
      const victimPiece = victim.pieces.find(p => p.id === data.victimPieceId);
      
      if (eaterPiece && victimPiece && eaterPiece.size > victimPiece.size * 1.1) {
        // Calculate new size based on area (mass) conservation
        const newSize = Math.sqrt(eaterPiece.size * eaterPiece.size + victimPiece.size * victimPiece.size);
        eaterPiece.size = newSize;
        
        // Cap maximum size
        if (eaterPiece.size > MAX_PLAYER_SIZE) {
          eaterPiece.size = MAX_PLAYER_SIZE;
        }
        
        // Recalculate speed based on new size
        eaterPiece.speed = calculateSpeed(eaterPiece.size);
        
        // Remove victim piece
        victim.pieces = victim.pieces.filter(p => p.id !== victimPiece.id);
        
        // If victim has no more pieces, remove player
        if (victim.pieces.length === 0) {
          // Remove the player from the game
          delete players[data.victimId];
          io.to(data.victimId).emit('gameOver');
        }
        
        // Update both players' state for all clients
        io.emit('playerUpdate', {
          id: socket.id,
          pieces: eater.pieces
        });
        
        // Also broadcast the victim's updated state (or removal)
        if (victim.pieces.length > 0) {
          io.emit('playerUpdate', {
            id: data.victimId,
            pieces: victim.pieces
          });
        } else {
          io.emit('playerDisconnect', { id: data.victimId });
        }
        
        // Update leaderboard
        updateLeaderboard();
      }
    }
  });
  
  // Handle player eating AI
  socket.on('eatAI', (data) => {
    const eater = players[socket.id];
    
    if (eater) {
      const eaterPiece = eater.pieces.find(p => p.id === data.eaterPieceId);
      
      if (eaterPiece) {
        for (let i = 0; i < aiPlayers.length; i++) {
          const ai = aiPlayers[i];
          
          for (let j = ai.pieces.length - 1; j >= 0; j--) {
            const aiPiece = ai.pieces[j];
            
            if (aiPiece.id === data.aiPieceId && eaterPiece.size > aiPiece.size * 1.1) {
              // Calculate new size based on area (mass) conservation
              const newSize = Math.sqrt(eaterPiece.size * eaterPiece.size + aiPiece.size * aiPiece.size);
              eaterPiece.size = newSize;
              
              // Cap maximum size
              if (eaterPiece.size > MAX_PLAYER_SIZE) {
                eaterPiece.size = MAX_PLAYER_SIZE;
              }
              
              // Recalculate speed based on new size
              eaterPiece.speed = calculateSpeed(eaterPiece.size);
              
              // Remove AI piece
              ai.pieces.splice(j, 1);
              
              // Broadcast the AI update to all clients
              io.emit('aiUpdate', {
                id: ai.id,
                pieces: ai.pieces
              });
              
              // If AI has no more pieces, remove it and add a new one
              if (ai.pieces.length === 0) {
                aiPlayers.splice(i, 1);
                
                // Create a new AI player
                createAIPlayer();
                
                // Broadcast updated AI list
                io.emit('update', {
                  aiPlayers: aiPlayers,
                  foods: foods.filter(food => food.isEjected)
                });
              }
              
              // Update player state for all clients
              io.emit('playerUpdate', {
                id: socket.id,
                pieces: eater.pieces
              });
              
              // Update leaderboard
              updateLeaderboard();
              
              break;
            }
          }
        }
      }
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove player from players object
    if (players[socket.id]) {
      // Broadcast player disconnection to all clients
      io.emit('playerDisconnect', { id: socket.id });
      
      // Remove player
      delete players[socket.id];
      
      // Update leaderboard immediately
      updateLeaderboard();
    }
  });
});

// Game update loop
setInterval(() => {
  // Update AI
  updateAI();
  
  // Update ejected mass
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    if (food.isEjected) {
      // Move according to velocity
      food.x += food.vx;
      food.y += food.vy;
      
      // Apply friction
      food.vx *= 0.95;
      food.vy *= 0.95;
      
      // Decrease lifetime
      food.lifeTime--;
      
      // Keep in bounds
      food.x = Math.max(food.size, Math.min(GAME_WIDTH - food.size, food.x));
      food.y = Math.max(food.size, Math.min(GAME_HEIGHT - food.size, food.y));
      
      // If lifetime is over, remove ejected property
      if (food.lifeTime <= 0) {
        food.isEjected = false;
        delete food.vx;
        delete food.vy;
        delete food.lifeTime;
      }
    }
  }
  
  // Update leaderboard
  updateLeaderboard();
  
  // Send game state to all players
  io.emit('update', {
    players: Object.values(players),
    aiPlayers: aiPlayers,
    foods: foods.filter(food => food.isEjected) // Only send ejected food to reduce payload
  });
}, 1000 / 30); // 30 FPS

// Update and broadcast leaderboard
function updateLeaderboard() {
  // Generate leaderboard
  const leaderboard = [];
  
  // Add human players to leaderboard
  Object.values(players).forEach(player => {
    let totalSize = 0;
    player.pieces.forEach(piece => {
      totalSize += piece.size;
    });
    
    leaderboard.push({
      id: player.id,
      name: player.name,
      size: totalSize,
      isPlayer: true
    });
  });
  
  // Add AI players to leaderboard
  aiPlayers.forEach(ai => {
    let totalSize = 0;
    ai.pieces.forEach(piece => {
      totalSize += piece.size;
    });
    
    leaderboard.push({
      id: ai.id,
      name: ai.name,
      size: totalSize,
      isAI: true
    });
  });
  
  // Sort leaderboard by size
  leaderboard.sort((a, b) => b.size - a.size);
  
  // Send leaderboard to all clients
  io.emit('leaderboard', leaderboard.slice(0, 10)); // Send top 10 players
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to play`);
}); 