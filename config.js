// Game constants
const GAME_WIDTH = 5000;  // Larger game area
const GAME_HEIGHT = 5000; // Larger game area
const PLAYER_START_SIZE = 30; // Smaller starting size
const FOOD_COUNT = 500;
const AI_COUNT = 15;
const FOOD_SIZE = 10; // Smaller food
const ZOOM_FACTOR = 0.9;
const SPLIT_COOLDOWN = 10000; // 10 seconds
const MAX_SPEED = 5;
const MAX_PLAYER_SIZE = 300; // Maximum player size to prevent excessive growth
const FOOD_COLORS = [
  '#FF9EB5', // pink
  '#FFD79E', // orange
  '#D0FF9E', // lime
  '#9EFFFC', // cyan
  '#D09EFF', // purple
  '#FF9E9E', // red
  '#FFFF9E'  // yellow
];

// Donut Flavors based on size - adjusted for better scaling
const DONUT_FLAVORS = [
  { size: 0, name: "Plain", color: "#F5DEB3" },
  { size: 60, name: "Strawberry Frosted", color: "#FF9EB5" },
  { size: 100, name: "Chocolate Glazed", color: "#8B4513" },
  { size: 150, name: "Maple Pecan", color: "#CD853F" },
  { size: 200, name: "Blueberry Blast", color: "#4169E1" },
  { size: 250, name: "Rainbow Sprinkled", color: "#FF1493" },
  { size: 280, name: "Gold Glaze Champion", color: "#FFD700" },
  { size: 300, name: "Cosmic Donut", color: "#8A2BE2" }
];

// Player Ranks based on size - adjusted for better scaling
const PLAYER_RANKS = [
  { size: 0, name: "Rookie Glazer" },
  { size: 60, name: "Donut Novice" },
  { size: 100, name: "Sprinkle Scout" },
  { size: 150, name: "Glaze Guardian" },
  { size: 200, name: "Frosting Fighter" },
  { size: 250, name: "Donut Destroyer" },
  { size: 280, name: "Pastry Professional" },
  { size: 300, name: "Glazecord Champion" }
];

// AI Names
const AI_NAMES = [
  "Sprinkles", "Frosting", "Doughboy", "Glazey", "Sugar Rush",
  "Crumbly", "Filled", "BakerBot", "Cruller", "JellyRoll",
  "DonutDuke", "GlazeMonster", "FrostyTop", "Crusted", "SprinkleKing"
];

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Browser-specific variables
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
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAME_WIDTH,
    GAME_HEIGHT,
    PLAYER_START_SIZE,
    FOOD_COUNT,
    AI_COUNT,
    FOOD_SIZE,
    FOOD_COLORS,
    DONUT_FLAVORS,
    PLAYER_RANKS,
    AI_NAMES,
    MAX_PLAYER_SIZE
  };
}