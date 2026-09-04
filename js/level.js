// Multi-Level Progression Engine
const LEVEL_CONFIGS = [
  {
    id: 1,
    name: "Level 1: Sunlit Valley",
    targetDistance: 1500,
    trackWidth: 7.5,
    curveIntensity: 1.0,
    hillIntensity: 1.0,
    theme: {
      deckA: "#e09f48",
      deckB: "#d28c38",
      deckAvg: "#d4913f",
      curb: "#f59e0b",
      curbTick: "#ffd23f",
      slabLeft: "#1b263b",
      slabRight: "#101826",
      boost: "#00c4f4",
      ramp: "#f97316",
      archPillar: "#ffd23f",
      archGlow: "#f59e0b",
      skyTop: "#0284c7",
      skyMid: "#38bdf8",
      skyBottom: "#e0f2fe"
    },
    obstacleConfig: {
      frequency: 48,
      movingSpeedMin: 2.5,
      movingSpeedMax: 3.5,
      theme: {
        body: "#be123c",
        stripe: "#fbbf24",
        outline: "#ffe4e6",
        top: "#e11d48"
      }
    }
  },
  {
    id: 2,
    name: "Level 2: Cyber Neon Grid",
    targetDistance: 2000,
    trackWidth: 6.2, // Narrower track for increased challenge
    curveIntensity: 1.45, // Tighter chicanes
    hillIntensity: 1.35,
    theme: {
      deckA: "#1e1b4b", // Cyber indigo/obsidian
      deckB: "#141235",
      deckAvg: "#17153a",
      curb: "#ec4899", // Neon hot pink
      curbTick: "#06b6d4", // Electric cyan
      slabLeft: "#0d0c22",
      slabRight: "#070614",
      boost: "#00ffcc",
      ramp: "#ff0055",
      archPillar: "#06b6d4",
      archGlow: "#ec4899",
      skyTop: "#090d16",
      skyMid: "#1e1035",
      skyBottom: "#3b0764"
    },
    obstacleConfig: {
      frequency: 28, // High obstacle density!
      movingSpeedMin: 3.8,
      movingSpeedMax: 6.2, // Faster oscillating obstacles
      theme: {
        body: "#4c0519",
        stripe: "#06b6d4",
        outline: "#ec4899",
        top: "#831843"
      }
    }
  }
];

class Level {
  constructor() {
    this.currentLevelIndex = 0;
    this.unlockedLevelIndex = Number(localStorage.getItem("playarenaUnlockedLevel") || 0);
    this.completed = false;

    this.track = new Track();
    this.obstacles = new Obstacles();
    this.collectibles = new Collectibles();
    this.generatedZ = 600;

    this.loadLevel(this.currentLevelIndex);
  }

  getCurrentConfig() {
    return LEVEL_CONFIGS[this.currentLevelIndex] || LEVEL_CONFIGS[0];
  }

  getFinishZ() {
    return this.getCurrentConfig().targetDistance;
  }

  getLevelName() {
    return this.getCurrentConfig().name;
  }

  loadLevel(index) {
    this.currentLevelIndex = Math.max(0, Math.min(index, LEVEL_CONFIGS.length - 1));
    const config = this.getCurrentConfig();
    this.completed = false;

    // Apply config to track and obstacles
    this.track.applyConfig({
      width: config.trackWidth,
      curveIntensity: config.curveIntensity,
      hillIntensity: config.hillIntensity,
      finishZ: config.targetDistance,
      theme: config.theme
    });

    this.obstacles.applyConfig(config.obstacleConfig);

    this.generatedZ = Math.min(600, config.targetDistance + 50);
    this.reset();
  }

  nextLevel() {
    if (this.currentLevelIndex < LEVEL_CONFIGS.length - 1) {
      this.currentLevelIndex++;
      this.unlockLevel(this.currentLevelIndex);
      this.loadLevel(this.currentLevelIndex);
      return true;
    }
    return false;
  }

  unlockLevel(index) {
    if (index > this.unlockedLevelIndex) {
      this.unlockedLevelIndex = index;
      localStorage.setItem("playarenaUnlockedLevel", String(index));
    }
  }

  reset() {
    this.completed = false;
    const config = this.getCurrentConfig();
    this.generatedZ = Math.min(600, config.targetDistance + 50);

    this.obstacles.reset();
    this.collectibles.reset();

    this.collectibles.generateForTrack(this.track, this.generatedZ);
    this.obstacles.generateForTrack(this.track, this.generatedZ);
  }

  update(dt, player) {
    this.collectibles.update(dt, player);
    this.obstacles.update(dt, player, this.track);

    const finishZ = this.getFinishZ();

    // Extend world up to finish line + 150m
    if (player.z + 300 > this.generatedZ && this.generatedZ < finishZ + 100) {
      const extendAmount = Math.min(300, finishZ + 100 - this.generatedZ);
      if (extendAmount > 10) {
        this.collectibles.extendGems(this.track, this.generatedZ, extendAmount);
        this.obstacles.extendObstacles(this.track, this.generatedZ, extendAmount);
        this.generatedZ += extendAmount;
      }
    }
  }

  draw(ctx, camera, width, height, playerZ) {
    this.track.draw(ctx, camera, width, height, playerZ);
    this.collectibles.draw(ctx, camera, width, height, playerZ);
    this.obstacles.draw(ctx, camera, width, height, playerZ);
  }
}

window.LEVEL_CONFIGS = LEVEL_CONFIGS;
window.Level = Level;
