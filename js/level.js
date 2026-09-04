// Multi-Level Progression Engine
const LEVEL_CONFIGS = [
  {
    id: 1,
    name: "Sunlit Valley",
    targetDistance: 800,
    trackWidth: 7.6,
    curveIntensity: 0.95,
    hillIntensity: 0.85,
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
      frequency: 50,
      movingSpeedMin: 2.2,
      movingSpeedMax: 3.2,
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
    name: "Cyber Neon Grid",
    targetDistance: 1500,
    trackWidth: 6.6,
    curveIntensity: 1.35,
    hillIntensity: 1.20,
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
      frequency: 36,
      movingSpeedMin: 3.5,
      movingSpeedMax: 5.2,
      theme: {
        body: "#4c0519",
        stripe: "#06b6d4",
        outline: "#ec4899",
        top: "#831843"
      }
    }
  },
  {
    id: 3,
    name: "Volcanic Magma Ridge",
    targetDistance: 2000,
    trackWidth: 6.0,
    curveIntensity: 1.60,
    hillIntensity: 1.45,
    theme: {
      deckA: "#261510", // Basalt charcoal
      deckB: "#1a0d0a",
      deckAvg: "#20110d",
      curb: "#ff4500", // Molten lava red-orange
      curbTick: "#ffaa00", // Magma yellow
      slabLeft: "#170a08",
      slabRight: "#0d0504",
      boost: "#ff8800",
      ramp: "#dc2626",
      archPillar: "#ff4500",
      archGlow: "#ffaa00",
      skyTop: "#180505",
      skyMid: "#450a0a",
      skyBottom: "#ea580c"
    },
    obstacleConfig: {
      frequency: 30,
      movingSpeedMin: 4.2,
      movingSpeedMax: 6.2,
      theme: {
        body: "#1c0909",
        stripe: "#ff4500",
        outline: "#ff9900",
        top: "#7f1d1d"
      }
    }
  },
  {
    id: 4,
    name: "Glacial Aurora Peaks",
    targetDistance: 2200,
    trackWidth: 5.6,
    curveIntensity: 1.85,
    hillIntensity: 1.40,
    theme: {
      deckA: "#0f2b48", // Glacial crystal navy
      deckB: "#0a1c32",
      deckAvg: "#0c233d",
      curb: "#38bdf8", // Polar cyan
      curbTick: "#a5f3fc", // Aurora white-cyan
      slabLeft: "#061322",
      slabRight: "#030a13",
      boost: "#22d3ee",
      ramp: "#6366f1",
      archPillar: "#38bdf8",
      archGlow: "#a5f3fc",
      skyTop: "#020617",
      skyMid: "#082f49",
      skyBottom: "#0f766e"
    },
    obstacleConfig: {
      frequency: 26,
      movingSpeedMin: 4.8,
      movingSpeedMax: 6.8,
      theme: {
        body: "#082f49",
        stripe: "#38bdf8",
        outline: "#bae6fd",
        top: "#0284c7"
      }
    }
  },
  {
    id: 5,
    name: "Cosmic Void & Nebula",
    targetDistance: 2500,
    trackWidth: 5.2,
    curveIntensity: 2.15,
    hillIntensity: 1.70,
    theme: {
      deckA: "#140727", // Quantum void violet
      deckB: "#0c0318",
      deckAvg: "#100520",
      curb: "#d946ef", // Electric violet
      curbTick: "#f43f5e", // Neon rose
      slabLeft: "#0a0214",
      slabRight: "#05010a",
      boost: "#a855f7",
      ramp: "#ec4899",
      archPillar: "#d946ef",
      archGlow: "#f43f5e",
      skyTop: "#030014",
      skyMid: "#0f051d",
      skyBottom: "#2e1065"
    },
    obstacleConfig: {
      frequency: 22,
      movingSpeedMin: 5.5,
      movingSpeedMax: 8.0,
      theme: {
        body: "#2e1065",
        stripe: "#f43f5e",
        outline: "#e879f9",
        top: "#581c87"
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
