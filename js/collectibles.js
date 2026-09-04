// Collectible Gems System
class Collectibles {
  constructor() {
    this.gems = [];
    this.collectedCount = 0;
    this.rotTime = 0;
  }

  reset() {
    this.gems = [];
    this.collectedCount = 0;
    this.rotTime = 0;
  }

  generateForTrack(track, maxZ = 600) {
    this.gems = [];
    // Spawn clusters of gems every ~25-40 units along track
    for (let z = 25; z < maxZ; z += 24 + Math.random() * 18) {
      const trackPoint = track.sample(z);
      // Skip if boost or ramp
      if (trackPoint.type === "boost" || trackPoint.type === "ramp") continue;

      const laneOffset = (Math.floor(Math.random() * 3) - 1) * 2.0; // -2, 0, 2
      const count = 2 + Math.floor(Math.random() * 3); // 2 to 4 in a line

      for (let i = 0; i < count; i++) {
        const gemZ = z + i * 3.5;
        const pt = track.sample(gemZ);
        this.gems.push({
          x: pt.x + laneOffset,
          y: pt.y + 0.85,
          z: gemZ,
          collected: false,
          baseY: pt.y + 0.85
        });
      }
    }
  }

  extendGems(track, currentMaxZ, additionalZ = 300) {
    const startZ = currentMaxZ;
    const endZ = currentMaxZ + additionalZ;
    for (let z = startZ; z < endZ; z += 28 + Math.random() * 16) {
      const trackPoint = track.sample(z);
      if (trackPoint.type === "boost" || trackPoint.type === "ramp") continue;

      const laneOffset = (Math.floor(Math.random() * 3) - 1) * 2.0;
      const count = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const gemZ = z + i * 3.5;
        const pt = track.sample(gemZ);
        this.gems.push({
          x: pt.x + laneOffset,
          y: pt.y + 0.85,
          z: gemZ,
          collected: false,
          baseY: pt.y + 0.85
        });
      }
    }
  }

  update(dt, player) {
    this.rotTime += dt * 3.5;

    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (gem.collected) continue;

      // Bobbing animation
      gem.y = gem.baseY + Math.sin(this.rotTime + gem.z * 0.1) * 0.15;

      // Distance check to player
      const dz = gem.z - player.z;
      if (Math.abs(dz) < 1.4) {
        const dx = gem.x - player.x;
        const dy = gem.y - (player.y + player.radius);
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < (player.radius + 0.6) * (player.radius + 0.6)) {
          gem.collected = true;
          this.collectedCount++;

          if (window.soundManager) window.soundManager.playGem();
          if (window.particleEngine) {
            window.particleEngine.spawnSparks(gem.x, gem.y, gem.z, "#ffd700", 18);
          }
          if (window.UI) window.UI.updateGems(this.collectedCount);
        }
      }
    }

    // Clean up old gems behind player
    if (this.gems.length > 200 && this.gems[0].z < player.z - 30) {
      this.gems.shift();
    }
  }

  draw(ctx, camera, width, height, playerZ) {
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (gem.collected) continue;
      if (gem.z < playerZ - 5 || gem.z > playerZ + 120) continue;

      const screen = camera.project(gem.x, gem.y, gem.z, width, height);
      if (!screen) continue;

      const size = Math.max(6, 0.55 * screen.scale);
      const rot = this.rotTime + gem.z * 0.2;
      const widthFactor = Math.abs(Math.cos(rot));

      ctx.save();
      ctx.translate(screen.x, screen.y);

      // Glowing Diamond Crystal
      ctx.fillStyle = "#ffd23f";
      ctx.shadowColor = "#ffea75";
      ctx.shadowBlur = Math.max(4, size * 0.4);

      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7 * widthFactor, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.7 * widthFactor, 0);
      ctx.closePath();
      ctx.fill();

      // Inner facet shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(size * 0.35 * widthFactor, 0);
      ctx.lineTo(0, size * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}

window.Collectibles = Collectibles;
