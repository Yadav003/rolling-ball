class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.ballImage = new Image();
    this.backgroundImage = new Image();
    this.ballImage.src = "assets/ball/playarena_rolling_ball_3d.svg";
    this.backgroundImage.src = "assets/background/playarena_rolling_ball_background.svg";

    this.camera = new Camera();
    window.camera = this.camera;

    this.level = new Level();
    this.player = new Player(this.ballImage);

    this.started = false;
    this.running = true;
    this.paused = false;
    this.gameOver = false;
    this.levelComplete = false;
    this.lastTime = performance.now();

    // Hook up UI callbacks
    UI.init({
      onStart: () => this.startGame(),
      onRestart: () => this.restartAndPlay(),
      onPauseToggle: () => this.togglePause(),
      onNextLevel: () => this.proceedToNextLevel(),
      onSelectLevel: (idx) => this.selectLevel(idx),
      onReturnToMenu: () => this.showStartMenu()
    });

    UI.setLevelInfo(
      this.level.currentLevelIndex,
      this.level.getLevelName(),
      this.level.getFinishZ(),
      this.level.unlockedLevelIndex
    );
    UI.update(0, 0, this.level.getFinishZ());
    UI.showStartModal();

    Input.onStart = () => {
      if (!this.started) {
        this.startGame();
        return true;
      }
      return false;
    };

    Input.onJump = () => {
      if (!this.started) {
        this.startGame();
        return;
      }
      if (!this.paused && !this.gameOver && !this.levelComplete) this.player.jump();
    };

    Input.onRestart = () => {
      if (!this.started) return;
      if (this.levelComplete) {
        this.proceedToNextLevel();
      } else {
        this.restartAndPlay();
      }
    };

    Input.onPauseToggle = () => {
      if (!this.started) return;
      this.togglePause();
    };

    window.addEventListener("resize", () => this.resize());
    this.resize();

    requestAnimationFrame((time) => this.loop(time));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.floor((rect.width || window.innerWidth) * dpr);
    const height = Math.floor((rect.height || window.innerHeight) * dpr);

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  startGame() {
    if (this.started) return;
    this.started = true;
    this.paused = false;
    this.gameOver = false;
    this.levelComplete = false;

    if (window.soundManager) {
      window.soundManager.init();
      window.soundManager.resume();
      window.soundManager.playStart();
    }

    UI.hideStartModal();
  }

  showStartMenu() {
    this.started = false;
    this.paused = false;
    this.gameOver = false;
    this.levelComplete = false;

    this.player.reset();
    this.level.reset();
    this.camera.reset();
    if (window.particleEngine) window.particleEngine.reset();
    if (window.soundManager) window.soundManager.stopRolling();

    UI.showStartModal();
    UI.updateGems(0);
    UI.setLevelInfo(
      this.level.currentLevelIndex,
      this.level.getLevelName(),
      this.level.getFinishZ(),
      this.level.unlockedLevelIndex
    );
    UI.update(0, 0, this.level.getFinishZ());
  }

  togglePause() {
    if (!this.started || this.gameOver || this.levelComplete) return;
    this.paused = !this.paused;
    UI.showPause(this.paused);
    if (this.paused) {
      if (window.soundManager) window.soundManager.stopRolling();
    }
  }

  selectLevel(index) {
    this.level.loadLevel(index);
    this.restartAndPlay();
  }

  proceedToNextLevel() {
    if (this.level.currentLevelIndex < window.LEVEL_CONFIGS.length - 1) {
      this.level.nextLevel();
    } else {
      this.level.loadLevel(0); // Loop back
    }
    this.restartAndPlay();
  }

  restartAndPlay() {
    this.restart();
    this.startGame();
  }

  restart() {
    this.player.reset();
    this.level.reset();
    this.camera.reset();
    if (window.particleEngine) window.particleEngine.reset();
    if (window.soundManager) window.soundManager.stopRolling();

    this.gameOver = false;
    this.levelComplete = false;
    this.paused = false;

    UI.hideMessage();
    UI.updateGems(0);
    UI.setLevelInfo(
      this.level.currentLevelIndex,
      this.level.getLevelName(),
      this.level.getFinishZ(),
      this.level.unlockedLevelIndex
    );
    UI.update(0, 0, this.level.getFinishZ());
  }

  drawBackground(width, height) {
    const config = this.level.getCurrentConfig();
    const theme = config.theme;
    const time = performance.now() * 0.001;

    // Use custom SVG background for Level 1 if available, otherwise procedural scene
    if (config.id === 1 && this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
      const imageRatio = this.backgroundImage.naturalWidth / this.backgroundImage.naturalHeight;
      const canvasRatio = width / height;

      let drawWidth, drawHeight, x, y;
      if (imageRatio > canvasRatio) {
        drawHeight = height;
        drawWidth = height * imageRatio;
        x = (width - drawWidth) / 2;
        y = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imageRatio;
        x = 0;
        y = (height - drawHeight) / 2;
      }
      this.ctx.drawImage(this.backgroundImage, x, y, drawWidth, drawHeight);
    } else {
      // Dynamic thematic skybox per level
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, theme.skyTop || "#0284c7");
      gradient.addColorStop(0.38, theme.skyMid || "#38bdf8");
      gradient.addColorStop(0.50, theme.skyBottom || "#e0f2fe");
      gradient.addColorStop(1, "#070b14");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);

      // Distinct procedural scenic elements per level
      if (config.id === 1) {
        this.drawSunlitHills(width, height);
      } else if (config.id === 2) {
        this.drawCyberStarsAndGrid(width, height);
      } else if (config.id === 3) {
        this.drawVolcanoBackground(width, height, time);
      } else if (config.id === 4) {
        this.drawGlacialAurora(width, height, time);
      } else if (config.id === 5) {
        this.drawCosmicVoid(width, height, time);
      }
    }

    // Atmospheric horizon haze matching theme
    const horizonY = height * this.camera.horizon;
    const hazeGrad = this.ctx.createLinearGradient(0, horizonY - 45, 0, horizonY + 25);
    hazeGrad.addColorStop(0, "rgba(255, 255, 255, 0)");

    let hazeColor = "rgba(224, 242, 254, 0.45)";
    if (config.id === 2) hazeColor = "rgba(236, 72, 153, 0.25)";
    else if (config.id === 3) hazeColor = "rgba(255, 69, 0, 0.35)";
    else if (config.id === 4) hazeColor = "rgba(56, 189, 248, 0.30)";
    else if (config.id === 5) hazeColor = "rgba(217, 70, 239, 0.28)";

    hazeGrad.addColorStop(0.7, hazeColor);
    hazeGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = hazeGrad;
    this.ctx.fillRect(0, horizonY - 45, width, 70);
  }

  drawSunlitHills(width, height) {
    const horizonY = height * this.camera.horizon;
    this.ctx.save();

    // Distant sun
    const sunGrad = this.ctx.createRadialGradient(width * 0.75, horizonY * 0.5, 5, width * 0.75, horizonY * 0.5, 65);
    sunGrad.addColorStop(0, "rgba(255, 255, 230, 0.95)");
    sunGrad.addColorStop(0.4, "rgba(255, 215, 0, 0.5)");
    sunGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
    this.ctx.fillStyle = sunGrad;
    this.ctx.beginPath();
    this.ctx.arc(width * 0.75, horizonY * 0.5, 65, 0, Math.PI * 2);
    this.ctx.fill();

    // Rolling mountain ridges
    this.ctx.fillStyle = "rgba(16, 110, 68, 0.28)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 40) {
      const y = horizonY - 35 + Math.sin(x * 0.006) * 22 + Math.cos(x * 0.012) * 12;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(width, horizonY + 20);
    this.ctx.lineTo(0, horizonY + 20);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawCyberStarsAndGrid(width, height) {
    const horizonY = height * this.camera.horizon;
    this.ctx.save();

    // Distant cyber stars
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    for (let i = 0; i < 45; i++) {
      const sx = ((i * 137.5) % width);
      const sy = ((i * 83.2) % (horizonY * 0.95));
      const sz = (i % 3 === 0) ? 1.8 : 1.0;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Laser neon horizon line
    this.ctx.strokeStyle = "rgba(236, 72, 153, 0.75)";
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = "#ec4899";
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(width, horizonY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawVolcanoBackground(width, height, time) {
    const horizonY = height * this.camera.horizon;
    this.ctx.save();

    // Jagged volcanic mountain silhouette
    this.ctx.fillStyle = "rgba(28, 10, 8, 0.75)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 30) {
      const peak = Math.sin(x * 0.008) * 45 + Math.sin(x * 0.024) * 22;
      this.ctx.lineTo(x, horizonY - 20 - Math.max(0, peak));
    }
    this.ctx.lineTo(width, horizonY + 20);
    this.ctx.lineTo(0, horizonY + 20);
    this.ctx.closePath();
    this.ctx.fill();

    // Molten crater glow at peaks
    const craterGrad = this.ctx.createRadialGradient(width * 0.35, horizonY - 45, 4, width * 0.35, horizonY - 45, 80);
    craterGrad.addColorStop(0, "rgba(255, 120, 0, 0.65)");
    craterGrad.addColorStop(0.5, "rgba(220, 38, 38, 0.3)");
    craterGrad.addColorStop(1, "rgba(220, 38, 38, 0)");
    this.ctx.fillStyle = craterGrad;
    this.ctx.fillRect(width * 0.35 - 80, horizonY - 125, 160, 100);

    // Rising volcanic embers
    for (let i = 0; i < 28; i++) {
      const px = ((i * 73.1 + time * 18) % width);
      const py = horizonY - (((time * (25 + (i % 15)) + i * 42) % (horizonY * 0.9)));
      const alpha = Math.sin((py / horizonY) * Math.PI) * 0.85;
      if (alpha > 0.05) {
        this.ctx.fillStyle = (i % 2 === 0) ? `rgba(255, 170, 0, ${alpha})` : `rgba(255, 69, 0, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawGlacialAurora(width, height, time) {
    const horizonY = height * this.camera.horizon;
    this.ctx.save();

    // Animated Northern Lights (Aurora Borealis) ribbons
    for (let band = 0; band < 3; band++) {
      const ribbonGrad = this.ctx.createLinearGradient(0, horizonY * 0.1, 0, horizonY * 0.9);
      if (band === 0) {
        ribbonGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
        ribbonGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.32)");
        ribbonGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      } else if (band === 1) {
        ribbonGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
        ribbonGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.28)");
        ribbonGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
      } else {
        ribbonGrad.addColorStop(0, "rgba(168, 85, 247, 0)");
        ribbonGrad.addColorStop(0.5, "rgba(192, 132, 252, 0.22)");
        ribbonGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      }

      this.ctx.fillStyle = ribbonGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(0, horizonY * 0.7);

      for (let x = 0; x <= width; x += 25) {
        const offset = Math.sin(x * 0.005 + time * 0.8 + band * 1.5) * 35 
                     + Math.cos(x * 0.012 - time * 0.5) * 20;
        this.ctx.lineTo(x, horizonY * 0.35 + offset + band * 22);
      }

      this.ctx.lineTo(width, horizonY * 0.85);
      this.ctx.lineTo(0, horizonY * 0.85);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Twinkling crystal stars
    this.ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 123.4) % width);
      const sy = ((i * 71.9) % (horizonY * 0.65));
      const sz = 1.0 + Math.sin(time * 3 + i) * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, Math.max(0.8, sz), 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Sharp icy mountain peaks
    this.ctx.fillStyle = "rgba(10, 30, 52, 0.75)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 35) {
      const peak = Math.abs(Math.sin(x * 0.01 + 0.5)) * 55 + Math.sin(x * 0.02) * 18;
      this.ctx.lineTo(x, horizonY - peak);
    }
    this.ctx.lineTo(width, horizonY + 20);
    this.ctx.lineTo(0, horizonY + 20);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawCosmicVoid(width, height, time) {
    const horizonY = height * this.camera.horizon;
    this.ctx.save();

    // Multi-layered glowing quantum nebula clouds
    const nebulae = [
      { x: width * 0.28, y: horizonY * 0.42, r: 120, color: "rgba(168, 85, 247, 0.26)" },
      { x: width * 0.72, y: horizonY * 0.36, r: 140, color: "rgba(236, 72, 153, 0.24)" },
      { x: width * 0.50, y: horizonY * 0.60, r: 110, color: "rgba(6, 182, 212, 0.20)" }
    ];

    nebulae.forEach(n => {
      const grad = this.ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.r);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Dense twinkling starfield
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let i = 0; i < 65; i++) {
      const sx = ((i * 149.3) % width);
      const sy = ((i * 91.7) % (horizonY * 0.95));
      const sz = (i % 5 === 0) ? (1.5 + Math.sin(time * 4 + i) * 0.7) : (i % 2 === 0 ? 1.2 : 0.8);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, Math.max(0.5, sz), 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Majestic celestial ringed exoplanet on upper horizon
    const planetX = width * 0.82;
    const planetY = horizonY * 0.45;
    const planetR = Math.min(38, width * 0.06);

    // Planet body
    const planetGrad = this.ctx.createRadialGradient(planetX - planetR * 0.3, planetY - planetR * 0.3, 4, planetX, planetY, planetR);
    planetGrad.addColorStop(0, "#d946ef");
    planetGrad.addColorStop(0.6, "#701a75");
    planetGrad.addColorStop(1, "#18021f");
    this.ctx.fillStyle = planetGrad;
    this.ctx.beginPath();
    this.ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
    this.ctx.fill();

    // Planet rings
    this.ctx.strokeStyle = "rgba(236, 72, 153, 0.65)";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(planetX, planetY, planetR * 1.9, planetR * 0.45, -0.35, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  update(dt) {
    if (!this.started) {
      this.camera.update(this.player, dt);
      if (window.particleEngine) {
        window.particleEngine.update(dt);
      }
      return;
    }

    if (this.paused) return;

    const finishZ = this.level.getFinishZ();

    if (!this.gameOver && !this.levelComplete) {
      this.player.update(dt, Input.getAxis(), this.level.track);
      this.level.update(dt, this.player);
      Collision.update(this.player, this.level.track);
      UI.update(this.player.z, this.player.speed, finishZ);

      // Check Finish Line crossing
      if (this.player.z >= finishZ) {
        this.levelComplete = true;
        this.level.unlockLevel(this.level.currentLevelIndex + 1);

        if (window.soundManager) window.soundManager.playLevelComplete();
        if (window.particleEngine) {
          window.particleEngine.spawnConfetti(this.player.x, this.player.y + 2, this.player.z, 60);
        }

        UI.showLevelComplete(
          this.level.currentLevelIndex,
          window.LEVEL_CONFIGS.length,
          this.player.z,
          this.level.collectibles.collectedCount
        );
      }

      // Check Fall Game Over
      if (this.player.falling && this.player.y < -12) {
        this.gameOver = true;
        UI.showGameOver(this.player.z, this.level.collectibles.collectedCount);
      }
    } else if (this.levelComplete) {
      // Graceful slow down past finish line
      this.player.speed = Math.max(0, this.player.speed - 12 * dt);
      this.player.z += this.player.speed * dt;
      this.player.pitchAngle += (this.player.speed * dt) / this.player.radius;
    } else {
      // Falling animation
      this.player.update(dt, 0, this.level.track);
    }

    this.camera.update(this.player, dt);

    if (window.particleEngine) {
      window.particleEngine.update(dt);
    }
  }

  draw() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height);

    this.level.draw(this.ctx, this.camera, width, height, this.player.z);
    this.player.draw(this.ctx, this.camera, width, height, this.level.track);

    if (window.particleEngine) {
      window.particleEngine.draw(this.ctx, this.camera, width, height);
    }
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.033);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }
}

window.addEventListener("load", () => {
  new Game();
});
