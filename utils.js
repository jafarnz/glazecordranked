// Calculate speed based on size (bigger = slower)
function calculateSpeed(size) {
    return Math.max(1, MAX_SPEED * (80 / size));
  }
  
  // Create particles for visual effects
  function createParticles(x, y, size, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const particleSize = size / 4 + Math.random() * (size / 4);
      
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: particleSize,
        color: color,
        alpha: 1,
        life: 30 + Math.random() * 20
      });
    }
  }
  
  // Update particles (movement, fading)
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      p.size *= 0.95;
      p.life -= 1;
      p.alpha = p.life / 50;
      
      if (p.life <= 0 || p.size < 1) {
        particles.splice(i, 1);
      }
    }
  }
  
  // Update player's flavor and rank based on size
  function updateFlavorAndRank() {
    let totalSize = 0;
    for (const p of player) {
      totalSize += p.size;
    }
    
    // Find largest flavor that player qualifies for
    let currentFlavor = DONUT_FLAVORS[0];
    for (const flavor of DONUT_FLAVORS) {
      if (totalSize >= flavor.size) {
        currentFlavor = flavor;
      } else {
        break;
      }
    }
    
    // Update each player piece with new flavor and color
    for (const p of player) {
      p.color = currentFlavor.color;
    }
    
    // Find largest rank that player qualifies for
    let currentRank = PLAYER_RANKS[0];
    for (const rank of PLAYER_RANKS) {
      if (totalSize >= rank.size) {
        currentRank = rank;
      } else {
        break;
      }
    }
    
    // Update HUD
    document.getElementById('flavor').textContent = `Flavor: ${currentFlavor.name}`;
    document.getElementById('rank').textContent = `Rank: ${currentRank.name}`;
    document.getElementById('score').textContent = `Score: ${Math.floor(totalSize)}`;
  }
  
  // Update AI flavors based on size
  function updateAIFlavors() {
    for (const ai of aiPlayers) {
      // Find largest flavor that AI qualifies for
      let currentFlavor = DONUT_FLAVORS[0];
      for (const flavor of DONUT_FLAVORS) {
        if (ai.size >= flavor.size) {
          currentFlavor = flavor;
        } else {
          break;
        }
      }
      
      ai.color = currentFlavor.color;
      ai.flavor = currentFlavor.name;
    }
  }
  
  // Load high score from local storage
  function loadHighScore() {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      document.getElementById('playerNameInput').value = savedName;
    }
  }
  
  // Update leaderboard
  function updateLeaderboard() {
    // Only update in single player mode
    if (isMultiplayer) return;
    
    // Calculate total player size
    let playerTotalSize = 0;
    for (const p of player) {
      playerTotalSize += p.size;
    }
    
    // Create leaderboard entries
    const entries = [];
    
    // Add player
    entries.push({
      name: playerName,
      size: playerTotalSize,
      isPlayer: true
    });
    
    // Add AI players
    for (const ai of aiPlayers) {
      entries.push({
        name: ai.name,
        size: ai.size,
        isPlayer: false
      });
    }
    
    // Sort by size
    entries.sort((a, b) => b.size - a.size);
    
    // Keep top 10
    leaderboard = entries.slice(0, 10);
    
    // Update display
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    for (const entry of leaderboard) {
      const listItem = document.createElement('li');
      listItem.textContent = `${entry.name}: ${Math.floor(entry.size)}`;
      
      if (entry.isPlayer) {
        listItem.style.color = '#FFD700';
        listItem.style.fontWeight = 'bold';
      } else {
        listItem.style.color = '#41c7c7';
      }
      
      leaderboardList.appendChild(listItem);
    }
    
    // Check if player is dead and not on leaderboard
    if (player.length === 0 && !gameOver) {
      endGame();
    }
  }
  
  // Split player piece into two
  function splitPlayer() {
    // Check if we have any player pieces to split
    if (player.length === 0) {
      console.log("No player pieces to split");
      return;
    }
    
    // Maximum 8 pieces
    if (player.length >= 8) {
      console.log("Maximum pieces reached, not splitting");
      return;
    }
    
    const newPieces = [];
    
    for (let i = 0; i < player.length; i++) {
      const p = player[i];
      
      // Only split if big enough
      if (p.size >= 50) {
        // Calculate angle toward mouse
        const angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
        
        // Simple division - original piece gets half size, new piece gets half size
        const newSize = p.size / Math.sqrt(2); // Use sqrt(2) for more accurate mass conservation
        
        // Resize original piece
        p.size = newSize;
        p.speed = calculateSpeed(p.size);
        p.splitCooldown = 20;
        
        // Create new piece with significant distance
        const newPiece = {
          x: p.x + Math.cos(angle) * (newSize * 2 + 20),
          y: p.y + Math.sin(angle) * (newSize * 2 + 20),
          size: newSize,
          color: p.color,
          name: playerName, // Use the global playerName variable
          speed: calculateSpeed(newSize) * 1.5, // Boost speed initially
          splitCooldown: 20
        };
        
        // Keep new piece in bounds
        newPiece.x = Math.max(newPiece.size + 10, Math.min(GAME_WIDTH - newPiece.size - 10, newPiece.x));
        newPiece.y = Math.max(newPiece.size + 10, Math.min(GAME_HEIGHT - newPiece.size - 10, newPiece.y));
        
        newPieces.push(newPiece);
      }
    }
    
    // Add new pieces to player array
    if (newPieces.length > 0) {
      player = player.concat(newPieces);
    }
  }
  
  // Split AI player into two
  function splitAI(index) {
    const ai = aiPlayers[index];
    
    if (ai.size >= 50) {
      // Random direction
      const angle = Math.random() * Math.PI * 2;
      
      // Simple division - original piece gets half size, new piece gets half size
      const newSize = ai.size / 2;
      
      // Resize original piece
      ai.size = newSize;
      ai.speed = calculateSpeed(ai.size);
      
      // Create new piece
      const newPiece = {
        x: ai.x + Math.cos(angle) * (newSize * 2 + 5), // Add a small gap
        y: ai.y + Math.sin(angle) * (newSize * 2 + 5), // Add a small gap
        size: newSize,
        color: ai.color,
        name: ai.name,
        speed: calculateSpeed(newSize),
        flavor: ai.flavor
      };
      
      // Keep new piece in bounds
      newPiece.x = Math.max(newPiece.size + 10, Math.min(GAME_WIDTH - newPiece.size - 10, newPiece.x));
      newPiece.y = Math.max(newPiece.size + 10, Math.min(GAME_HEIGHT - newPiece.size - 10, newPiece.y));
      
      aiPlayers.push(newPiece);
    }
  }
  
  // Eject mass from player
  function ejectMass() {
    for (const p of player) {
      if (p.size > 50) {
        // Calculate direction
        const angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
        
        // Create ejected mass as food
        const ejectedMass = {
          x: p.x + Math.cos(angle) * p.size,
          y: p.y + Math.sin(angle) * p.size,
          size: 15,
          color: p.color,
          vx: Math.cos(angle) * 20, // Increased velocity
          vy: Math.sin(angle) * 20, // Increased velocity
          isEjected: true,
          lifeTime: 150 // Increased lifetime to travel further
        };
        
        foods.push(ejectedMass);
        
        // Create particles for visual effect
        createParticles(p.x, p.y, 10, p.color, 3);
        
        // Reduce player size by a small fixed amount
        p.size -= 5;
        
        // Ensure player doesn't get too small
        if (p.size < 30) {
          p.size = 30;
        }
        
        p.speed = calculateSpeed(p.size);
      }
    }
  }
  
  // End game and show game over screen
  function endGame() {
    gameOver = true;
    
    // Calculate final score
    let finalScore = 0;
    for (const p of player) {
      finalScore += p.size;
    }
    
    // Update game over screen
    document.getElementById('finalScore').textContent = `Final Score: ${Math.floor(finalScore)}`;
    document.getElementById('gameOverScreen').style.display = 'block';
    document.getElementById('overlay').style.display = 'flex';
  }