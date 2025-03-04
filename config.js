// Game configuration
const GAME_WIDTH = 4000;
const GAME_HEIGHT = 4000;
const PLAYER_START_SIZE = 40;
const MAX_PLAYER_SIZE = 2000;
const FOOD_SIZE = 15;
const FOOD_COUNT = 500;
const AI_COUNT = 5; // Reduced for better performance in multiplayer

// Game mechanics
const SPLIT_COOLDOWN = 10000; // 10 seconds in milliseconds
const MERGE_TIMEOUT = 15000;  // 15 seconds in milliseconds
const MAX_PLAYER_PIECES = 16;
const FOOD_NUTRITIONAL_VALUE = 1;
const EJECTED_MASS_SIZE = 15;
const EJECTED_MASS_LOSS = 5;
const MASS_DECAY_RATE = 0.001; // % of mass lost per second
const MASS_DECAY_THRESHOLD = 100; // Size at which decay starts
const MIN_SPLIT_SIZE = 50;

// Visual and gameplay settings
const FOOD_COLORS = [
  '#FF9EB5', // pink
  '#FFD79E', // orange
  '#D0FF9E', // lime
  '#9EFFFC', // cyan
  '#D09EFF', // purple
  '#FF9E9E', // red
  '#FFFF9E'  // yellow
];

// AI configuration
const AI_NAMES = [
  "Sprinkles", "Frosting", "Doughboy", "Glazey", "Sugar Rush",
  "Crumbly", "Filled", "BakerBot", "Cruller", "JellyRoll",
  "DonutDuke", "GlazeMonster", "FrostyTop", "Crusted", "SprinkleKing"
];

// AI behavior settings
const AI_VISION_RANGE = 800;
const AI_AGGRESSION_FACTOR = 0.7;
const AI_DECISION_RATE = 500; // ms

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

// Player ranks based on size
const PLAYER_RANKS = [
  { size: 0, rank: "Rookie Glazer" },
  { size: 100, rank: "Donut Novice" },
  { size: 250, rank: "Glaze Apprentice" },
  { size: 500, rank: "Sprinkle Master" },
  { size: 1000, rank: "Donut Dominator" },
  { size: 2000, rank: "Glaze Lord" },
  { size: 3500, rank: "Donut Champion" },
  { size: 5000, rank: "Cosmic Cruller" }
];

// Network settings
const UPDATE_INTERVAL = 1000 / 30; // 30 FPS
const LEADERBOARD_SIZE = 10;

// Helper functions
function calculateSpeed(size) {
  return Math.max(1, 5 * (80 / size));
}

// Browser detection
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Client-side specific variables (only defined in browser)
if (typeof window !== 'undefined') {
  // Game state
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
    MAX_PLAYER_SIZE,
    SPLIT_COOLDOWN,
    MERGE_TIMEOUT,
    MAX_PLAYER_PIECES,
    FOOD_NUTRITIONAL_VALUE,
    EJECTED_MASS_SIZE,
    EJECTED_MASS_LOSS,
    MASS_DECAY_RATE,
    MASS_DECAY_THRESHOLD,
    MIN_SPLIT_SIZE,
    AI_VISION_RANGE,
    AI_AGGRESSION_FACTOR,
    AI_DECISION_RATE,
    UPDATE_INTERVAL,
    LEADERBOARD_SIZE,
    calculateSpeed
  };
}