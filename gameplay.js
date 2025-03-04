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
    if (player.length > 1 && elapsedTime > SPLIT_COOLDOWN / 2) {
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
    
    // Check collisions between player and other players
    checkPlayerAICollisions();
    
    // Update flavor and rank based on size
    updateFlavorAndRank();
    
    // Update camera to follow player
    updateCamera();
    
    // Update particles
    updateParticles();
    
    // Update leaderboard
    updateLeaderboard();
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
        flavor: DONUT_FLAVORS[0].name
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
    for (let i = 0; i < aiPlayers.length; i++) {
      const ai = aiPlayers[i];
      
      // AI behavior - move toward nearest smaller entity and away from bigger ones
      let targetX = ai.x + (Math.random() * 20 - 10);
      let targetY = ai.y + (Math.random() * 20 - 10);
      let fleeing = false;
      
      // Find nearest food
      let nearestFoodDist = Infinity;
      let nearestFood = null;
      
      for (const food of foods) {
        const dx = food.x - ai.x;
        const dy = food.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < nearestFoodDist && dist < 300) {
          nearestFoodDist = dist;
          nearestFood = food;
        }
      }
      
      // Find nearest player piece that's threatening
      let nearestThreatDist = Infinity;
      let nearestThreat = null;
      
      for (const p of player) {
        if (p.size > ai.size * 1.1) {
          const dx = p.x - ai.x;
          const dy = p.y - ai.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < nearestThreatDist && dist < 400) {
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
          
          // If other AI is bigger and close, flee from it
          if (otherAI.size > ai.size * 1.1 && dist < 300 && (!fleeing || dist < nearestThreatDist)) {
            nearestThreatDist = dist;
            nearestThreat = otherAI;
            fleeing = true;
          }
          
          // If other AI is smaller and closer than food, target it
          if (otherAI.size * 1.1 < ai.size && dist < 200 && (!nearestFood || dist < nearestFoodDist)) {
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
          targetX = ai.x + (dx / dist) * 200;
          targetY = ai.y + (dy / dist) * 200;
        }
      } else if (nearestFood) {
        // Move toward food
        targetX = nearestFood.x;
        targetY = nearestFood.y;
      }
      
      // Move AI toward target
      const dx = targetX - ai.x;
      const dy = targetY - ai.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        ai.x += (dx / dist) * ai.speed;
        ai.y += (dy / dist) * ai.speed;
      }
      
      // Keep AI in bounds
      ai.x = Math.max(ai.size, Math.min(GAME_WIDTH - ai.size, ai.x));
      ai.y = Math.max(ai.size, Math.min(GAME_HEIGHT - ai.size, ai.y));
      
      // Random splitting for larger AIs
      if (ai.size > 80 && Math.random() < 0.001) {
        splitAI(i);
      }
    }
  }