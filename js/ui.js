window.UI = {
  distanceElement: document.getElementById("distance"),
  bestElement: document.getElementById("best"),
  gemsElement: document.getElementById("gems"),
  speedElement: document.getElementById("speed"),
  levelBadgeElement: document.getElementById("levelBadge"),
  levelProgressBar: document.getElementById("levelProgressBar"),
  levelProgressText: document.getElementById("levelProgressText"),

  startModal: document.getElementById("startModal"),
  playButton: document.getElementById("playButton"),
  startLevelName: document.getElementById("startLevelName"),
  menuFromGameOverBtn: document.getElementById("menuFromGameOverBtn"),
  menuFromPauseBtn: document.getElementById("menuFromPauseBtn"),

  message: document.getElementById("message"),
  messageTitle: document.getElementById("messageTitle"),
  messageText: document.getElementById("messageText"),
  finalDistanceText: document.getElementById("finalDistance"),
  finalGemsText: document.getElementById("finalGems"),
  restartButton: document.getElementById("restartButton"),

  levelCompleteModal: document.getElementById("levelCompleteModal"),
  levelCompleteTitle: document.getElementById("levelCompleteTitle"),
  levelCompleteText: document.getElementById("levelCompleteText"),
  levelCompleteDistance: document.getElementById("levelCompleteDistance"),
  levelCompleteGems: document.getElementById("levelCompleteGems"),
  nextLevelButton: document.getElementById("nextLevelButton"),

  pauseOverlay: document.getElementById("pauseOverlay"),
  pauseButton: document.getElementById("pauseButton"),
  resumeButton: document.getElementById("resumeButton"),
  muteButton: document.getElementById("muteButton"),
  levelSelectContainer: document.getElementById("levelSelectContainer"),

  gameOverReason: "The ball fell from the track.",

  init(callbacks) {
    const { onStart, onRestart, onPauseToggle, onNextLevel, onSelectLevel, onReturnToMenu } = callbacks;

    if (this.playButton) {
      this.playButton.addEventListener("click", () => {
        if (onStart) onStart();
      });
    }
    if (this.restartButton) this.restartButton.addEventListener("click", onRestart);
    if (this.resumeButton) this.resumeButton.addEventListener("click", onPauseToggle);
    if (this.pauseButton) this.pauseButton.addEventListener("click", onPauseToggle);
    if (this.nextLevelButton) this.nextLevelButton.addEventListener("click", onNextLevel);

    if (this.menuFromGameOverBtn) {
      this.menuFromGameOverBtn.addEventListener("click", () => {
        if (onReturnToMenu) onReturnToMenu();
      });
    }
    if (this.menuFromPauseBtn) {
      this.menuFromPauseBtn.addEventListener("click", () => {
        if (onReturnToMenu) onReturnToMenu();
      });
    }

    if (this.muteButton) {
      this.muteButton.addEventListener("click", () => {
        if (window.soundManager) {
          const isMuted = window.soundManager.toggleMute();
          this.updateMuteIcon(isMuted);
        }
      });
      if (window.soundManager) {
        this.updateMuteIcon(window.soundManager.isMuted());
      }
    }

    this.onSelectLevel = onSelectLevel;

    this.best = Number(localStorage.getItem("playarenaRollingBest") || 0);
    if (this.bestElement) this.bestElement.textContent = `${this.best} m`;
  },

  updateMuteIcon(isMuted) {
    if (this.muteButton) {
      this.muteButton.textContent = isMuted ? "🔇" : "🔊";
      this.muteButton.setAttribute("aria-label", isMuted ? "Unmute sound" : "Mute sound");
    }
  },

  setGameOverReason(reason) {
    this.gameOverReason = reason;
  },

  setLevelInfo(levelIndex, levelName, finishZ, unlockedLevel) {
    if (this.levelBadgeElement) {
      this.levelBadgeElement.textContent = `LEVEL ${levelIndex + 1}`;
    }
    if (this.startLevelName) {
      this.startLevelName.textContent = `Level ${levelIndex + 1}: ${levelName}`;
    }
    if (this.levelProgressText) {
      this.levelProgressText.textContent = `0 / ${finishZ} m`;
    }
    if (this.levelProgressBar) {
      this.levelProgressBar.style.width = "0%";
    }
    this.renderLevelSelector(levelIndex, unlockedLevel);
  },

  renderLevelSelector(currentLevel, unlockedLevel) {
    if (!this.levelSelectContainer || !window.LEVEL_CONFIGS) return;
    this.levelSelectContainer.innerHTML = "";

    window.LEVEL_CONFIGS.forEach((lvl, idx) => {
      const btn = document.createElement("button");
      btn.className = `level-chip ${idx === currentLevel ? "active" : ""} ${idx > unlockedLevel ? "locked" : ""}`;
      btn.textContent = idx > unlockedLevel ? `🔒 Level ${idx + 1}` : `Level ${idx + 1}`;
      btn.disabled = idx > unlockedLevel;

      btn.addEventListener("click", () => {
        if (this.onSelectLevel && idx <= unlockedLevel) {
          this.onSelectLevel(idx);
        }
      });
      this.levelSelectContainer.appendChild(btn);
    });
  },

  update(distance, speed, finishZ) {
    const distMeters = Math.floor(distance);
    if (this.distanceElement) this.distanceElement.textContent = `${distMeters} m`;

    if (this.speedElement) {
      const kmh = Math.floor(speed * 3.6);
      this.speedElement.textContent = `${kmh} km/h`;
    }

    if (finishZ > 0) {
      const pct = Math.min(100, Math.max(0, (distance / finishZ) * 100));
      if (this.levelProgressBar) {
        this.levelProgressBar.style.width = `${pct.toFixed(1)}%`;
      }
      if (this.levelProgressText) {
        this.levelProgressText.textContent = `${distMeters} / ${finishZ} m`;
      }
    }

    if (distMeters > this.best) {
      this.best = distMeters;
      localStorage.setItem("playarenaRollingBest", String(distMeters));
      if (this.bestElement) this.bestElement.textContent = `${distMeters} m`;
    }
  },

  updateGems(count) {
    if (this.gemsElement) {
      this.gemsElement.textContent = String(count);
    }
  },

  showGameOver(distance, gems) {
    const distMeters = Math.floor(distance);
    const isNewBest = distMeters >= this.best && distMeters > 0;

    if (this.messageTitle) {
      this.messageTitle.textContent = isNewBest ? "🏆 NEW RECORD!" : "GAME OVER";
    }
    if (this.messageText) {
      this.messageText.textContent = this.gameOverReason;
    }
    if (this.finalDistanceText) {
      this.finalDistanceText.textContent = `${distMeters} m`;
    }
    if (this.finalGemsText) {
      this.finalGemsText.textContent = String(gems);
    }

    if (this.message) this.message.classList.remove("hidden");
  },

  showLevelComplete(levelIndex, totalLevels, distance, gems) {
    const isLastLevel = levelIndex >= totalLevels - 1;

    if (this.levelCompleteTitle) {
      this.levelCompleteTitle.textContent = isLastLevel ? "👑 ALL LEVELS CLEARED!" : `🏁 LEVEL ${levelIndex + 1} CLEARED!`;
    }
    if (this.levelCompleteText) {
      this.levelCompleteText.textContent = isLastLevel 
        ? "Legendary run! You conquered every track challenge!" 
        : `Spectacular! Level ${levelIndex + 2} is now unlocked!`;
    }
    if (this.levelCompleteDistance) {
      this.levelCompleteDistance.textContent = `${Math.floor(distance)} m`;
    }
    if (this.levelCompleteGems) {
      this.levelCompleteGems.textContent = String(gems);
    }
    if (this.nextLevelButton) {
      this.nextLevelButton.textContent = isLastLevel ? "Replay Levels ➔" : `Proceed to Level ${levelIndex + 2} ➔`;
    }

    if (this.levelCompleteModal) {
      this.levelCompleteModal.classList.remove("hidden");
    }
  },

  hideMessage() {
    if (this.message) this.message.classList.add("hidden");
    if (this.pauseOverlay) this.pauseOverlay.classList.add("hidden");
    if (this.levelCompleteModal) this.levelCompleteModal.classList.add("hidden");
  },

  showPause(paused) {
    if (this.pauseOverlay) {
      if (paused) {
        this.pauseOverlay.classList.remove("hidden");
        if (this.pauseButton) this.pauseButton.textContent = "▶";
      } else {
        this.pauseOverlay.classList.add("hidden");
        if (this.pauseButton) this.pauseButton.textContent = "⏸";
      }
    }
  },

  showStartModal() {
    if (this.startModal) this.startModal.classList.remove("hidden");
    this.hideMessage();
    document.body.classList.add("in-menu");
  },

  hideStartModal() {
    if (this.startModal) this.startModal.classList.add("hidden");
    document.body.classList.remove("in-menu");
  },

  isStartModalOpen() {
    return this.startModal && !this.startModal.classList.contains("hidden");
  }
};
