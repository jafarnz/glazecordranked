// Draw everything on canvas
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set camera transformation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Draw grid
    drawGrid();
    
    // Draw boundary
    drawBoundary();
    
    // Draw food
    drawFood();
    
    // Draw particles
    drawParticles();
    
    // In single player mode, draw AI players
    if (!isMultiplayer) {
      drawAIPlayers();
    } else {
      // In multiplayer mode, draw other players and server AI players
      drawOtherPlayers();
      drawServerAIPlayers();
    }
    
    // Draw player pieces
    drawPlayer();
    
    // Restore canvas transformation
    ctx.restore();
    
    // Draw split cooldown indicator
    if (gameStarted && !canSplit) {
      const elapsedTime = Date.now() - lastSplitTime;
      const cooldownPercent = Math.min(elapsedTime / SPLIT_COOLDOWN, 1);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(canvas.width / 2 - 100, canvas.height - 30, 200, 10);
      
      ctx.fillStyle = "#41c7c7";
      ctx.fillRect(canvas.width / 2 - 100, canvas.height - 30, 200 * cooldownPercent, 10);
    }
    
    // Draw connection status in multiplayer mode
    if (isMultiplayer) {
      ctx.fillStyle = socket && socket.connected ? "#4CAF50" : "#F44336";
      ctx.beginPath();
      ctx.arc(canvas.width - 20, 20, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw grid background
  function drawGrid() {
    // Draw major grid lines
    ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
    ctx.lineWidth = 2;
    
    const majorGridSize = 500;
    const startX = Math.floor(camera.x - canvas.width / (2 * camera.zoom) / majorGridSize) * majorGridSize;
    const startY = Math.floor(camera.y - canvas.height / (2 * camera.zoom) / majorGridSize) * majorGridSize;
    const endX = Math.ceil(camera.x + canvas.width / (2 * camera.zoom) / majorGridSize) * majorGridSize;
    const endY = Math.ceil(camera.y + canvas.height / (2 * camera.zoom) / majorGridSize) * majorGridSize;
    
    // Vertical major lines
    for (let x = startX; x <= endX; x += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
    
    // Horizontal major lines
    for (let y = startY; y <= endY; y += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw minor grid lines
    ctx.strokeStyle = "rgba(200, 200, 200, 0.2)";
    ctx.lineWidth = 1;
    
    const minorGridSize = 100;
    const minorStartX = Math.floor(camera.x - canvas.width / (2 * camera.zoom) / minorGridSize) * minorGridSize;
    const minorStartY = Math.floor(camera.y - canvas.height / (2 * camera.zoom) / minorGridSize) * minorGridSize;
    const minorEndX = Math.ceil(camera.x + canvas.width / (2 * camera.zoom) / minorGridSize) * minorGridSize;
    const minorEndY = Math.ceil(camera.y + canvas.height / (2 * camera.zoom) / minorGridSize) * minorGridSize;
    
    // Vertical minor lines
    for (let x = minorStartX; x <= minorEndX; x += minorGridSize) {
      // Skip if this is also a major grid line
      if (x % majorGridSize === 0) continue;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
    
    // Horizontal minor lines
    for (let y = minorStartY; y <= minorEndY; y += minorGridSize) {
      // Skip if this is also a major grid line
      if (y % majorGridSize === 0) continue;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_WIDTH, y);
      ctx.stroke();
    }
  }
  
  // Draw game boundary
  function drawBoundary() {
    // Draw a thicker, more visible boundary
    ctx.strokeStyle = "#FF4500";
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Add warning indicators when player is near the boundary
    if (player.length > 0) {
      const margin = 200; // Warning distance from boundary
      
      for (const p of player) {
        // Left boundary warning
        if (p.x < margin) {
          const opacity = 1 - (p.x / margin);
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.3})`;
          ctx.fillRect(0, 0, margin, GAME_HEIGHT);
        }
        
        // Right boundary warning
        if (p.x > GAME_WIDTH - margin) {
          const opacity = 1 - ((GAME_WIDTH - p.x) / margin);
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.3})`;
          ctx.fillRect(GAME_WIDTH - margin, 0, margin, GAME_HEIGHT);
        }
        
        // Top boundary warning
        if (p.y < margin) {
          const opacity = 1 - (p.y / margin);
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.3})`;
          ctx.fillRect(0, 0, GAME_WIDTH, margin);
        }
        
        // Bottom boundary warning
        if (p.y > GAME_HEIGHT - margin) {
          const opacity = 1 - ((GAME_HEIGHT - p.y) / margin);
          ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.3})`;
          ctx.fillRect(0, GAME_HEIGHT - margin, GAME_WIDTH, margin);
        }
      }
    }
  }
  
  // Draw food items
  function drawFood() {
    for (const food of foods) {
      // Draw food as small colorful circles
      ctx.beginPath();
      ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();
      
      // Add a small highlight to make food more visible
      ctx.beginPath();
      ctx.arc(food.x - food.size * 0.3, food.y - food.size * 0.3, food.size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fill();
    }
  }
  
  // Draw player pieces
  function drawPlayer() {
    for (const p of player) {
      // Draw donut body
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      
      // Draw donut hole - scale the hole size with the donut size
      const holeSize = Math.max(p.size * 0.4, 5); // Ensure hole is proportional but not too small
      ctx.beginPath();
      ctx.arc(p.x, p.y, holeSize, 0, Math.PI * 2);
      ctx.fillStyle = "#F8F8FF"; // Light color for the hole
      ctx.fill();
      
      // Add sprinkles and decorations based on flavor/size
      drawDonutDecorations(p.x, p.y, p.size, p.color);
      
      // Draw name and size
      ctx.font = `${Math.max(12, p.size / 3)}px Arial`;
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      
      // Only draw name if it's defined
      if (typeof playerName !== 'undefined' && playerName) {
        ctx.fillText(playerName, p.x, p.y - p.size - 5);
      }
      
      // Always draw the size
      ctx.fillText(Math.round(p.size), p.x, p.y + 5);
    }
  }
  
  // Draw AI players
  function drawAIPlayers() {
    for (const ai of aiPlayers) {
      // Draw donut body
      ctx.beginPath();
      ctx.arc(ai.x, ai.y, ai.size, 0, Math.PI * 2);
      ctx.fillStyle = ai.color;
      ctx.fill();
      
      // Draw donut hole - scale the hole size with the donut size
      const holeSize = Math.max(ai.size * 0.4, 5); // Ensure hole is proportional but not too small
      ctx.beginPath();
      ctx.arc(ai.x, ai.y, holeSize, 0, Math.PI * 2);
      ctx.fillStyle = "#F8F8FF"; // Light color for the hole
      ctx.fill();
      
      // Add sprinkles and decorations based on flavor/size
      drawDonutDecorations(ai.x, ai.y, ai.size, ai.color);
      
      // Draw name and size
      ctx.font = `${Math.max(12, ai.size / 3)}px Arial`;
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(ai.name, ai.x, ai.y - ai.size - 5);
      ctx.fillText(Math.round(ai.size), ai.x, ai.y + 5);
    }
  }
  
  // Draw other players in multiplayer mode
  function drawOtherPlayers() {
    if (isMultiplayer && typeof otherPlayers !== 'undefined') {
      Object.values(otherPlayers).forEach(player => {
        if (player.pieces) {
          player.pieces.forEach(p => {
            // Draw donut body
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            // Draw donut hole - scale the hole size with the donut size
            const holeSize = Math.max(p.size * 0.4, 5); // Ensure hole is proportional but not too small
            ctx.beginPath();
            ctx.arc(p.x, p.y, holeSize, 0, Math.PI * 2);
            ctx.fillStyle = "#F8F8FF"; // Light color for the hole
            ctx.fill();
            
            // Add sprinkles and decorations based on flavor/size
            drawDonutDecorations(p.x, p.y, p.size, p.color);
            
            // Draw name and size
            ctx.font = `${Math.max(12, p.size / 3)}px Arial`;
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(player.name, p.x, p.y - p.size - 5);
            ctx.fillText(Math.round(p.size), p.x, p.y + 5);
          });
        } else if (player.x && player.y && player.size) {
          // Fallback for players without pieces array
          // Draw donut body
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
          ctx.fillStyle = player.color;
          ctx.fill();
          
          // Draw donut hole - scale the hole size with the donut size
          const holeSize = Math.max(player.size * 0.4, 5); // Ensure hole is proportional but not too small
          ctx.beginPath();
          ctx.arc(player.x, player.y, holeSize, 0, Math.PI * 2);
          ctx.fillStyle = "#F8F8FF"; // Light color for the hole
          ctx.fill();
          
          // Add sprinkles and decorations based on flavor/size
          drawDonutDecorations(player.x, player.y, player.size, player.color);
          
          // Draw name and size
          ctx.font = `${Math.max(12, player.size / 3)}px Arial`;
          ctx.fillStyle = "black";
          ctx.textAlign = "center";
          ctx.fillText(player.name, player.x, player.y - player.size - 5);
          ctx.fillText(Math.round(player.size), player.x, player.y + 5);
        }
      });
    }
  }
  
  // Draw server AI players in multiplayer mode
  function drawServerAIPlayers() {
    if (isMultiplayer && typeof serverAIPlayers !== 'undefined') {
      serverAIPlayers.forEach(ai => {
        if (ai.pieces) {
          ai.pieces.forEach(p => {
            // Draw donut body
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            // Draw donut hole - scale the hole size with the donut size
            const holeSize = Math.max(p.size * 0.4, 5); // Ensure hole is proportional but not too small
            ctx.beginPath();
            ctx.arc(p.x, p.y, holeSize, 0, Math.PI * 2);
            ctx.fillStyle = "#F8F8FF"; // Light color for the hole
            ctx.fill();
            
            // Add sprinkles and decorations based on flavor/size
            drawDonutDecorations(p.x, p.y, p.size, p.color);
            
            // Draw name and size
            ctx.font = `${Math.max(12, p.size / 3)}px Arial`;
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(ai.name, p.x, p.y - p.size - 5);
            ctx.fillText(Math.round(p.size), p.x, p.y + 5);
          });
        }
      });
    }
  }
  
  // Draw particle effects
  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = particle.alpha;
      drawDonut(particle.x, particle.y, particle.size, particle.color);
      ctx.globalAlpha = 1;
    }
  }
  
  // Draw a donut at specified position
  function drawDonut(x, y, size, color, name) {
    // Draw donut
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw hole
    ctx.fillStyle = "#fff9f5";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sprinkles if size is big enough
    if (size > 30) {
      const sprinkleCount = Math.floor(size / 10);
      const sprinkleColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"];
      
      for (let i = 0; i < sprinkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = size * 0.4 + Math.random() * size * 0.25;
        const sprinkleX = x + Math.cos(angle) * distance;
        const sprinkleY = y + Math.sin(angle) * distance;
        const sprinkleLength = 5 + (size / 40);
        const sprinkleWidth = 2 + (size / 80);
        const sprinkleColor = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
        
        ctx.save();
        ctx.translate(sprinkleX, sprinkleY);
        ctx.rotate(angle);
        ctx.fillStyle = sprinkleColor;
        ctx.fillRect(-sprinkleLength / 2, -sprinkleWidth / 2, sprinkleLength, sprinkleWidth);
        ctx.restore();
      }
    }
    
    // Draw name if provided
    if (name && size > 20) {
      ctx.fillStyle = "#000";
      ctx.font = `${Math.max(12, Math.min(size / 3, 24))}px Arial Rounded MT Bold, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, x, y);
    }
  }
  
  // Draw donut decorations (sprinkles, etc.)
  function drawDonutDecorations(x, y, size, baseColor) {
    // Only add decorations to donuts of a certain size
    if (size < 30) return;
    
    // Calculate hole size (same as in drawing functions)
    const holeSize = Math.max(size * 0.4, 5);
    
    // Generate a pseudorandom but consistent pattern based on position
    const seed = Math.floor(x * 0.1) + Math.floor(y * 0.1);
    const sprinkleCount = Math.floor(size / 5);
    
    // Sprinkle colors
    const sprinkleColors = [
      '#FF3366', // pink
      '#33CCFF', // blue
      '#FFCC00', // yellow
      '#66FF33', // green
      '#FF9933', // orange
      '#CC33FF'  // purple
    ];
    
    // Draw sprinkles
    for (let i = 0; i < sprinkleCount; i++) {
      // Use consistent random pattern based on position and index
      const angle = ((seed + i * 37) % 100) / 100 * Math.PI * 2;
      const distance = ((seed + i * 17) % 100) / 100 * (size * 0.8 - holeSize);
      const sprinkleX = x + Math.cos(angle) * (holeSize + distance);
      const sprinkleY = y + Math.sin(angle) * (holeSize + distance);
      const sprinkleLength = 5 + (size / 30);
      const sprinkleWidth = 2 + (size / 60);
      const sprinkleAngle = ((seed + i * 73) % 100) / 100 * Math.PI;
      
      // Draw the sprinkle
      ctx.save();
      ctx.translate(sprinkleX, sprinkleY);
      ctx.rotate(sprinkleAngle);
      ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
      ctx.fillRect(-sprinkleLength/2, -sprinkleWidth/2, sprinkleLength, sprinkleWidth);
      ctx.restore();
    }
    
    // Add glaze drips for larger donuts
    if (size > 100) {
      const glazeCount = Math.floor(size / 20);
      
      ctx.fillStyle = adjustColor(baseColor, 30); // Lighter version of base color
      
      for (let i = 0; i < glazeCount; i++) {
        const angle = ((seed + i * 59) % 100) / 100 * Math.PI * 2;
        const dripLength = ((seed + i * 23) % 100) / 100 * (size * 0.3) + (size * 0.1);
        const dripWidth = ((seed + i * 41) % 100) / 100 * (size * 0.2) + (size * 0.05);
        
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(angle) * size,
          y + Math.sin(angle) * size,
          dripWidth,
          dripLength,
          angle,
          0,
          Math.PI
        );
        ctx.fill();
      }
    }
  }
  
  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    
    // Adjust brightness
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }