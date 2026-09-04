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

    // Use custom SVG background for Level 1, or dynamic gradient for Level 2 (Cyber)
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
      gradient.addColorStop(0.48, theme.skyBottom || "#e0f2fe");
      gradient.addColorStop(1, "#070b14");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);

      // Distant cyber stars/grid for Level 2
      if (config.id === 2) {
        this.drawCyberStars(width, height);
      }
    }

    // Atmospheric horizon haze matching theme
    const horizonY = height * this.camera.horizon;
    const hazeGrad = this.ctx.createLinearGradient(0, horizonY - 45, 0, horizonY + 25);
    hazeGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    hazeGrad.addColorStop(0.7, config.id === 2 ? "rgba(236, 72, 153, 0.25)" : "rgba(224, 242, 254, 0.45)");
    hazeGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = hazeGrad;
    this.ctx.fillRect(0, horizonY - 45, width, 70);
  }

  drawCyberStars(width, height) {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    // Static deterministic seed for stars
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5) % width);
      const sy = ((i * 83.2) % (height * 0.38));
      const sz = (i % 3 === 0) ? 1.8 : 1.0;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      this.ctx.fill();
    }
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
