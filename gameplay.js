// Update game state
function update() {
    // Update player position based on mouse
    const elapsedTime = Date.now() - lastSplitTime;
    const cooldownPercent = Math.min(elapsedTime / SPLIT_COOLDOWN, 1);
    
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
      
      // Apply mass decay for larger pieces (if over threshold)
      if (p.size > MASS_DECAY_THRESHOLD) {
        p.size -= p.size * MASS_DECAY_RATE / 30; // Adjust for frames per second
      }
      
      // Keep player in bounds
      p.x = Math.max(p.size, Math.min(GAME_WIDTH - p.size, p.x));
      p.y = Math.max(p.size, Math.min(GAME_HEIGHT - p.size, p.y));
      
      // If this is a split piece, gradually rejoin after cooldown
      if (player.length > 1 && p.splitCooldown) {
        p.splitCooldown -= 1;
        if (p.splitCooldown <= 0) {
          p.splitCooldown = 0;
        }
      }
    }
    
    // Rejoin split pieces that are close to each other
    if (player.length > 1 && elapsedTime > MERGE_TIMEOUT) {
      for (let i = 0; i < player.length; i++) {
        for (let j = i + 1; j < player.length; j++) {
          const p1 = player[i];
          const p2 = player[j];
          
          if (p1.splitCooldown <= 0 && p2.splitCooldown <= 0) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < p1.size) {
              // Combine pieces
              p1.size = Math.sqrt(p1.size * p1.size + p2.size * p2.size);
              p1.speed = calculateSpeed(p1.size);
              player.splice(j, 1);
              
              // Create particle effect for merge
              createMergeEffect(p1.x, p1.y, p1.color);
              break;
            }
          }
        }
      }
    }
    
    // Update ejected mass
    updateEjectedMass();
    
    // Update AI players
    updateAI();
    
    // Check collisions between player and food
    checkPlayerFoodCollisions();
    
    // Check collisions between player and other players/AI
    checkPlayerAICollisions();
    
    // Update flavor and rank based on size
    updateFlavorAndRank();
    
    // Update camera to follow player
    updateCamera();
    
    // Update particles
    updateParticles();
    
    // Update leaderboard
    updateLeaderboard();
    
    // Update game time
    gameStats.timeAlive = Math.floor((Date.now() - gameStartTime) / 1000);
  }
  
  // Create merge effect
  function createMergeEffect(x, y, color) {
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      const size = 5 + Math.random() * 5;
      const lifetime = 30 + Math.random() * 20;
      
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: color,
        alpha: 1,
        lifetime: lifetime,
        maxLifetime: lifetime
      });
    }
  }
  
  // Update ejected mass movement
  function updateEjectedMass() {
    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i];
      
      // Only process ejected mass
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
  }
  
  // Generate food items throughout the game world
  function generateFood(count) {
    foods = [];
    for (let i = 0; i < count; i++) {
      foods.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: FOOD_SIZE,
        color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)]
      });
    }
  }
  
  // Generate AI players
  function generateAI(count) {
    for (let i = 0; i < count; i++) {
      const size = PLAYER_START_SIZE + Math.random() * 30;
      const ai = {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: size,
        speed: calculateSpeed(size),
        color: DONUT_FLAVORS[0].color,
        name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] + " " + Math.floor(Math.random() * 100),
        flavor: DONUT_FLAVORS[0].name,
        target: null,
        targetType: null,
        fleeTarget: null,
        changeDirectionTime: 0,
        personalityType: Math.floor(Math.random() * 3) // 0 = cautious, 1 = balanced, 2 = aggressive
      };
      
      // Make sure AI doesn't spawn too close to player
      if (player.length > 0) {
        let tooClose = false;
        for (const p of player) {
          const dx = p.x - ai.x;
          const dy = p.y - ai.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 500) {
            tooClose = true;
            break;
          }
        }
        
        if (tooClose) {
          i--; // Try again
          continue;
        }
      }
      
      aiPlayers.push(ai);
    }
  }
  
  // Update AI player behavior
  function updateAI() {
    // Update AI decision timing
    const now = Date.now();
    
    for (let i = 0; i < aiPlayers.length; i++) {
      const ai = aiPlayers[i];
      
      // Only make new decisions periodically to improve performance
      // Different personalities make decisions at different rates
      const decisionRate = AI_DECISION_RATE * (1 + ai.personalityType * 0.2);
      if (!ai.lastDecisionTime || now - ai.lastDecisionTime > decisionRate) {
        ai.lastDecisionTime = now;
        
        // AI behavior - move toward nearest smaller entity and away from bigger ones
        let targetX = ai.x;
        let targetY = ai.y;
        let fleeing = false;
        
        // Vision range varies by AI size (bigger AI sees farther)
        const visionRange = AI_VISION_RANGE * (0.7 + (ai.size / MAX_PLAYER_SIZE) * 0.3);
        
        // Find nearest food
        let nearestFoodDist = Infinity;
        let nearestFood = null;
        
        // Only check a subset of foods for performance
        const foodSampleSize = Math.min(foods.length, 50);
        const foodSample = getRandomSample(foods, foodSampleSize);
        
        for (const food of foodSample) {
          const dx = food.x - ai.x;
          const dy = food.y - ai.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < nearestFoodDist && dist < visionRange) {
            nearestFoodDist = dist;
            nearestFood = food;
          }
        }
        
        // Find nearest player piece that's threatening
        let nearestThreatDist = Infinity;
        let nearestThreat = null;
        
        for (const p of player) {
          // Different personalities have different threat thresholds
          const threatThreshold = 1.1 - (ai.personalityType * 0.1); // Aggressive AIs take more risks
          
          if (p.size > ai.size * threatThreshold) {
            const dx = p.x - ai.x;
            const dy = p.y - ai.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Flee distance varies by personality
            const fleeDistance = visionRange * (1.2 - ai.personalityType * 0.2);
            
            if (dist < nearestThreatDist && dist < fleeDistance) {
              nearestThreatDist = dist;
              nearestThreat = p;
              fleeing = true;
            }
          }
        }
        
        // Find nearest AI that we can eat or flee from
        for (let j = 0; j < aiPlayers.length; j++) {
          const otherAI = aiPlayers[j];
          if (otherAI !== ai) {
            const dx = otherAI.x - ai.x;
            const dy = otherAI.y - ai.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Different personalities have different threat thresholds
            const threatThreshold = 1.1 - (ai.personalityType * 0.1);
            
            // If other AI is bigger and close, flee from it
            if (otherAI.size > ai.size * threatThreshold && dist < visionRange && (!fleeing || dist < nearestThreatDist)) {
              nearestThreatDist = dist;
              nearestThreat = otherAI;
              fleeing = true;
            }
            
            // If other AI is smaller and closer than food, target it
            // Aggressiveness affects how eagerly AI pursues other players
            const huntingDistance = 200 + (ai.personalityType * 100);
            
            if (otherAI.size * 1.1 < ai.size && dist < huntingDistance && (!nearestFood || dist < nearestFoodDist)) {
              nearestFoodDist = dist;
              nearestFood = otherAI;
            }
          }
        }
        
        // Set target based on threats and food
        if (fleeing && nearestThreat) {
          // Flee from threat (move in opposite direction)
          const dx = ai.x - nearestThreat.x;
          const dy = ai.y - nearestThreat.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            // Flee distance depends on relative size difference and personality
            const fleeFactor = 200 * (nearestThreat.size / ai.size) * (1.2 - ai.personalityType * 0.2);
            targetX = ai.x + (dx / dist) * fleeFactor;
            targetY = ai.y + (dy / dist) * fleeFactor;
          }
          
          ai.target = null;
          ai.fleeTarget = nearestThreat;
        } else if (nearestFood) {
          // Move toward food
          targetX = nearestFood.x;
          targetY = nearestFood.y;
          
          ai.target = nearestFood;
          ai.fleeTarget = null;
        } else {
          // No target found, use random movement with persistence
          if (!ai.changeDirectionTime || now > ai.changeDirectionTime) {
            // Change direction every 1-3 seconds
            ai.angle = Math.random() * Math.PI * 2;
            ai.changeDirectionTime = now + 1000 + Math.random() * 2000;
          }
          
          targetX = ai.x + Math.cos(ai.angle) * 100;
          targetY = ai.y + Math.sin(ai.angle) * 100;
          
          ai.target = null;
          ai.fleeTarget = null;
        }
        
        // Store target position
        ai.targetX = targetX;
        ai.targetY = targetY;
      }
      
      // Move toward target
      if (ai.targetX !== undefined && ai.targetY !== undefined) {
        const dx = ai.targetX - ai.x;
        const dy = ai.targetY - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          ai.x += (dx / dist) * ai.speed;
          ai.y += (dy / dist) * ai.speed;
        }
      }
      
      // AI mass decay for larger pieces
      if (ai.size > MASS_DECAY_THRESHOLD) {
        ai.size -= ai.size * MASS_DECAY_RATE / 30; // Adjust for frames per second
      }
      
      // Keep in bounds
      ai.x = Math.max(ai.size, Math.min(GAME_WIDTH - ai.size, ai.x));
      ai.y = Math.max(ai.size, Math.min(GAME_HEIGHT - ai.size, ai.y));
      
      // Update AI color based on size
      updateAIAppearance(ai);
    }
  }

  // Get random sample from array
  function getRandomSample(array, size) {
    if (array.length <= size) return array;
    
    const sample = [];
    const indices = new Set();
    
    while (sample.length < size) {
      const index = Math.floor(Math.random() * array.length);
      if (!indices.has(index)) {
        indices.add(index);
        sample.push(array[index]);
      }
    }
    
    return sample;
  }

  // Update AI appearance based on size
  function updateAIAppearance(ai) {
    // Update flavor and color based on size
    for (let i = DONUT_FLAVORS.length - 1; i >= 0; i--) {
      if (ai.size >= DONUT_FLAVORS[i].size) {
        ai.flavor = DONUT_FLAVORS[i].name;
        ai.color = DONUT_FLAVORS[i].color;
        break;
      }
    }
  }

  // Check collisions between player pieces and food
  function checkPlayerFoodCollisions() {
    for (let i = 0; i < player.length; i++) {
      const p = player[i];
      
      for (let j = foods.length - 1; j >= 0; j--) {
        const food = foods[j];
        
        // Calculate distance
        const dx = p.x - food.x;
        const dy = p.y - food.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If player collides with food
        if (dist < p.size - food.size / 2) {
          // Increase player size
          p.size += FOOD_NUTRITIONAL_VALUE;
          p.speed = calculateSpeed(p.size);
          
          // Create eat effect
          createEatEffect(food.x, food.y, food.color);
          
          // Remove the food
          foods.splice(j, 1);
          
          // Add new food elsewhere
          foods.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: FOOD_SIZE,
            color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)]
          });
          
          // Update statistics
          gameStats.donutsEaten++;
          
          // Play eat sound if enabled
          if (soundEnabled) {
            sounds.eat.currentTime = 0;
            sounds.eat.play().catch(e => console.log('Audio play failed:', e));
          }
          
          // Notify server in multiplayer mode
          if (isMultiplayer) {
            socket.emit('eatFood', food.id);
          }
        }
      }
    }
  }

  // Create eat effect
  function createEatEffect(x, y, color) {
    const particleCount = qualityLevel === 'high' ? 8 : (qualityLevel === 'medium' ? 5 : 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const size = 2 + Math.random() * 3;
      const lifetime = 20 + Math.random() * 10;
      
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: color,
        alpha: 1,
        lifetime: lifetime,
        maxLifetime: lifetime
      });
    }
  }

  // Update particles
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Move particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Reduce velocity
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      
      // Reduce lifetime and alpha
      particle.lifetime--;
      particle.alpha = particle.lifetime / particle.maxLifetime;
      
      // Remove dead particles
      if (particle.lifetime <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // Split player piece
  function performSplit() {
    if (Date.now() - lastSplitTime < SPLIT_COOLDOWN) return;
    
    const newPieces = [];
    const canSplit = player.length < MAX_PLAYER_PIECES;
    
    if (canSplit) {
      for (let i = 0; i < player.length; i++) {
        const p = player[i];
        
        if (p.size >= MIN_SPLIT_SIZE) {
          // Calculate world coordinates of mouse position
          const worldMouseX = mouseX - canvas.width / 2 + camera.x;
          const worldMouseY = mouseY - canvas.height / 2 + camera.y;
          
          // Calculate direction
          const dx = worldMouseX - p.x;
          const dy = worldMouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          
          // Split the piece
          const newSize = p.size / Math.sqrt(2); // Conservation of mass
          p.size = newSize;
          p.speed = calculateSpeed(p.size);
          p.splitCooldown = 30; // Prevent immediate recombination
          
          // Create new piece
          const newPiece = {
            x: p.x + Math.cos(angle) * p.size * 2,
            y: p.y + Math.sin(angle) * p.size * 2,
            size: newSize,
            speed: calculateSpeed(newSize) * 2, // Initial speed boost
            color: p.color,
            name: p.name,
            splitCooldown: 30,
            velX: Math.cos(angle) * 10, // Initial velocity
            velY: Math.sin(angle) * 10
          };
          
          // Keep in bounds
          newPiece.x = Math.max(newPiece.size, Math.min(GAME_WIDTH - newPiece.size, newPiece.x));
          newPiece.y = Math.max(newPiece.size, Math.min(GAME_HEIGHT - newPiece.size, newPiece.y));
          
          newPieces.push(newPiece);
        }
      }
      
      // Add new pieces to player array
      if (newPieces.length > 0) {
        player = player.concat(newPieces);
        lastSplitTime = Date.now();
      }
    }
  }

  // Eject mass
  function performEject() {
    // Find the largest player piece
    let largestPiece = null;
    let largestIndex = -1;
    
    for (let i = 0; i < player.length; i++) {
      if (!largestPiece || player[i].size > largestPiece.size) {
        largestPiece = player[i];
        largestIndex = i;
      }
    }
    
    if (largestPiece && largestPiece.size > 50) {
      // Calculate world coordinates of mouse position
      const worldMouseX = mouseX - canvas.width / 2 + camera.x;
      const worldMouseY = mouseY - canvas.height / 2 + camera.y;
      
      // Calculate direction
      const dx = worldMouseX - largestPiece.x;
      const dy = worldMouseY - largestPiece.y;
      const angle = Math.atan2(dy, dx);
      
      // Create ejected mass
      const ejectedMass = {
        x: largestPiece.x + Math.cos(angle) * largestPiece.size,
        y: largestPiece.y + Math.sin(angle) * largestPiece.size,
        size: EJECTED_MASS_SIZE,
        color: largestPiece.color,
        vx: Math.cos(angle) * 20,
        vy: Math.sin(angle) * 20,
        isEjected: true,
        lifeTime: 100
      };
      
      // Add to foods array
      foods.push(ejectedMass);
      
      // Reduce player size
      largestPiece.size -= EJECTED_MASS_LOSS;
      largestPiece.speed = calculateSpeed(largestPiece.size);
    }
  }

  // Check collisions between player pieces and AI players
  function checkPlayerAICollisions() {
    // Check for player collisions with AI
    for (let i = 0; i < player.length; i++) {
      const p = player[i];
      
      // Check collisions with AI
      for (let j = aiPlayers.length - 1; j >= 0; j--) {
        const ai = aiPlayers[j];
        
        // Calculate distance
        const dx = p.x - ai.x;
        const dy = p.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If player collides with AI and player is bigger
        if (dist < p.size && p.size > ai.size * 1.1) {
          // Calculate new size based on area (mass) conservation
          const newSize = Math.sqrt(p.size * p.size + ai.size * ai.size);
          p.size = newSize;
          p.speed = calculateSpeed(p.size);
          
          // Create eat effect
          createEatEffect(ai.x, ai.y, ai.color);
          
          // Remove the AI
          aiPlayers.splice(j, 1);
          
          // Add new AI
          if (isMultiplayer) {
            // In multiplayer, notify server
            socket.emit('eatAI', {
              eaterPieceId: p.id,
              aiPieceId: ai.id
            });
          } else {
            // In single player, create a new AI
            setTimeout(() => {
              const aiCount = aiPlayers.length;
              if (aiCount < AI_COUNT) {
                generateAI(1);
              }
            }, 2000);
          }
          
          // Update statistics
          gameStats.playersEaten++;
          
          // Play eat sound if enabled
          if (soundEnabled) {
            sounds.eat.currentTime = 0;
            sounds.eat.play().catch(e => console.log('Audio play failed:', e));
          }
        }
        // If AI is bigger and collides with player
        else if (dist < ai.size && ai.size > p.size * 1.1) {
          // In single player, implement AI eating the player
          if (!isMultiplayer) {
            // Remove the player piece
            player.splice(i, 1);
            
            // Calculate new AI size
            ai.size = Math.sqrt(ai.size * ai.size + p.size * p.size);
            ai.speed = calculateSpeed(ai.size);
            
            // Create eat effect
            createEatEffect(p.x, p.y, p.color);
            
            // Check if player has been completely eaten
            if (player.length === 0) {
              handleGameOver();
            }
            
            // Skip to the next player piece
            break;
          }
        }
      }
    }
  }

  // Update flavor and rank based on size
  function updateFlavorAndRank() {
    if (player.length > 0) {
      // Calculate total score (sum of all piece sizes)
      let totalScore = 0;
      for (let i = 0; i < player.length; i++) {
        totalScore += player[i].size;
      }
      
      // Update score display
      document.getElementById('score').textContent = `Score: ${Math.floor(totalScore)}`;
      
      // Update rank based on size
      let currentRank = PLAYER_RANKS[0].rank;
      for (let i = PLAYER_RANKS.length - 1; i >= 0; i--) {
        if (totalScore >= PLAYER_RANKS[i].size) {
          currentRank = PLAYER_RANKS[i].rank;
          break;
        }
      }
      document.getElementById('rank').textContent = `Rank: ${currentRank}`;
      
      // Update flavor based on size
      let currentFlavor = DONUT_FLAVORS[0].name;
      for (let i = DONUT_FLAVORS.length - 1; i >= 0; i--) {
        if (totalScore >= DONUT_FLAVORS[i].size) {
          currentFlavor = DONUT_FLAVORS[i].name;
          // Update player color to match flavor
          for (let j = 0; j < player.length; j++) {
            player[j].color = DONUT_FLAVORS[i].color;
          }
          break;
        }
      }
      document.getElementById('flavor').textContent = `Flavor: ${currentFlavor}`;
    }
  }

  // Update camera position to follow player
  function updateCamera() {
    if (player.length > 0) {
      // Calculate center of mass
      let centerX = 0;
      let centerY = 0;
      let totalMass = 0;
      
      for (let i = 0; i < player.length; i++) {
        const p = player[i];
        const mass = p.size * p.size; // Mass is proportional to area
        centerX += p.x * mass;
        centerY += p.y * mass;
        totalMass += mass;
      }
      
      if (totalMass > 0) {
        centerX /= totalMass;
        centerY /= totalMass;
      }
      
      // Smooth camera movement
      camera.x += (centerX - camera.x) * 0.1;
      camera.y += (centerY - camera.y) * 0.1;
      
      // Dynamic zoom based on player size
      let targetZoom = 1;
      if (player.length > 0) {
        // Find the largest player piece
        let largestSize = 0;
        for (let i = 0; i < player.length; i++) {
          if (player[i].size > largestSize) {
            largestSize = player[i].size;
          }
        }
        
        // Adjust zoom based on size (smaller value = zoomed out more)
        targetZoom = Math.max(0.7, Math.min(1.5, 100 / largestSize));
      }
      
      // Smooth zoom transition
      camera.zoom += (targetZoom - camera.zoom) * 0.05;
    }
  }

  // Update leaderboard
  function updateLeaderboard() {
    if (!isMultiplayer) {
      // In single player, generate leaderboard locally
      leaderboard = [];
      
      // Add player
      let playerTotalSize = 0;
      for (let i = 0; i < player.length; i++) {
        playerTotalSize += player[i].size;
      }
      
      leaderboard.push({
        name: playerName,
        size: playerTotalSize,
        isPlayer: true
      });
      
      // Add AI players
      for (let i = 0; i < aiPlayers.length; i++) {
        leaderboard.push({
          name: aiPlayers[i].name,
          size: aiPlayers[i].size,
          isAI: true
        });
      }
      
      // Sort leaderboard by size
      leaderboard.sort((a, b) => b.size - a.size);
      
      // Update display
      updateLeaderboardDisplay();
    }
  }
}