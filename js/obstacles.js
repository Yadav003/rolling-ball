// Obstacles Engine with Multi-Level Density & Theme Support
class Obstacles {
  constructor(config = null) {
    this.items = [];
    this.time = 0;
    this.applyConfig(config);
  }

  applyConfig(config = null) {
    this.config = config || {
      frequency: 45,
      movingSpeedMin: 2.5,
      movingSpeedMax: 3.5,
      theme: {
        body: "#be123c",
        stripe: "#fbbf24",
        outline: "#ffe4e6",
        top: "#e11d48"
      }
    };
  }

  reset() {
    this.items = [];
    this.time = 0;
  }

  createObstacleAt(track, z) {
    const trackPoint = track.sample(z);
    if (trackPoint.type === "boost" || trackPoint.type === "ramp") return null;

    const speedMin = this.config.movingSpeedMin || 2.5;
    const speedMax = this.config.movingSpeedMax || 3.5;
    const halfW = trackPoint.width / 2;
    const rand = Math.random();

    if (rand < 0.35) {
      // Static Single Lane Barrier
      const laneOffset = (Math.floor(Math.random() * 3) - 1) * (halfW * 0.52);
      return [{
        type: "barrier",
        x: trackPoint.x + laneOffset,
        baseX: laneOffset,
        y: trackPoint.y,
        z,
        width: 2.1,
        height: 1.6,
        moving: false
      }];
    } else if (rand < 0.65) {
      // Dynamic Oscillating Barrier
      return [{
        type: "moving_barrier",
        x: trackPoint.x,
        baseX: 0,
        y: trackPoint.y,
        z,
        width: 1.9,
        height: 1.5,
        moving: true,
        speed: speedMin + Math.random() * (speedMax - speedMin),
        phase: Math.random() * Math.PI * 2
      }];
    } else if (rand < 0.85) {
      // Center Spire / Monolith (forces player to choose left or right)
      return [{
        type: "spire",
        x: trackPoint.x,
        baseX: 0,
        y: trackPoint.y,
        z,
        width: 1.6,
        height: 2.2,
        moving: false
      }];
    } else {
      // Double Pinch Gate (leaves narrow pass on one side)
      const openSide = Math.random() < 0.5 ? -1 : 1;
      return [{
        type: "barrier",
        x: trackPoint.x - openSide * (halfW * 0.45),
        baseX: -openSide * (halfW * 0.45),
        y: trackPoint.y,
        z,
        width: 2.4,
        height: 1.6,
        moving: false
      }];
    }
  }

  generateForTrack(track, maxZ = 600) {
    this.items = [];
    const freq = this.config.frequency || 45;

    // Start obstacles after z = 50
    for (let z = 50; z < maxZ; z += freq * (0.85 + Math.random() * 0.35)) {
      const created = this.createObstacleAt(track, z);
      if (created) {
        this.items.push(...created);
      }
    }
  }

  extendObstacles(track, currentMaxZ, additionalZ = 300) {
    const startZ = currentMaxZ;
    const endZ = currentMaxZ + additionalZ;
    const freq = this.config.frequency || 45;

    for (let z = startZ; z < endZ; z += freq * (0.85 + Math.random() * 0.35)) {
      const created = this.createObstacleAt(track, z);
      if (created) {
        this.items.push(...created);
      }
    }
  }

  update(dt, player, track) {
    this.time += dt;

    for (let i = 0; i < this.items.length; i++) {
      const obs = this.items[i];
      const trackPoint = track.sample(obs.z);

      if (obs.moving) {
        const maxOffset = trackPoint.width * 0.32;
        obs.x = trackPoint.x + Math.sin(this.time * obs.speed + obs.phase) * maxOffset;
      } else {
        obs.x = trackPoint.x + obs.baseX;
      }
      obs.y = trackPoint.y;

      // Collision check with player
      if (!player.falling) {
        const dz = Math.abs(player.z - obs.z);
        if (dz < 1.1) {
          const dx = Math.abs(player.x - obs.x);
          const dy = Math.abs((player.y + player.radius * 0.5) - (obs.y + obs.height * 0.5));

          if (dx < (obs.width * 0.5 + player.radius * 0.55) && dy < (obs.height * 0.5 + player.radius * 0.55)) {
            player.triggerFall();
            if (window.UI) window.UI.setGameOverReason("Crashed into an obstacle!");
          }
        }
      }
    }

    if (this.items.length > 100 && this.items[0].z < player.z - 30) {
      this.items.shift();
    }
  }

  draw(ctx, camera, width, height, playerZ) {
    const theme = this.config.theme || {
      body: "#be123c",
      stripe: "#fbbf24",
      outline: "#ffe4e6",
      top: "#e11d48"
    };

    for (let i = 0; i < this.items.length; i++) {
      const obs = this.items[i];
      if (obs.z < playerZ - 5 || obs.z > playerZ + 130) continue;

      const halfW = obs.width / 2;
      const h = obs.height;
      const thick = 0.5;

      const pFrontBL = camera.project(obs.x - halfW, obs.y, obs.z - thick * 0.5, width, height);
      const pFrontBR = camera.project(obs.x + halfW, obs.y, obs.z - thick * 0.5, width, height);
      const pFrontTR = camera.project(obs.x + halfW, obs.y + h, obs.z - thick * 0.5, width, height);
      const pFrontTL = camera.project(obs.x - halfW, obs.y + h, obs.z - thick * 0.5, width, height);

      const pBackBL = camera.project(obs.x - halfW, obs.y, obs.z + thick * 0.5, width, height);
      const pBackBR = camera.project(obs.x + halfW, obs.y, obs.z + thick * 0.5, width, height);
      const pBackTR = camera.project(obs.x + halfW, obs.y + h, obs.z + thick * 0.5, width, height);
      const pBackTL = camera.project(obs.x - halfW, obs.y + h, obs.z + thick * 0.5, width, height);

      if (!pFrontBL || !pFrontBR || !pFrontTR || !pFrontTL) continue;

      // Top face
      if (pBackTL && pBackTR) {
        ctx.fillStyle = theme.top;
        ctx.beginPath();
        ctx.moveTo(pFrontTL.x, pFrontTL.y);
        ctx.lineTo(pFrontTR.x, pFrontTR.y);
        ctx.lineTo(pBackTR.x, pBackTR.y);
        ctx.lineTo(pBackTL.x, pBackTL.y);
        ctx.closePath();
        ctx.fill();
      }

      // Front face
      ctx.beginPath();
      ctx.moveTo(pFrontBL.x, pFrontBL.y);
      ctx.lineTo(pFrontBR.x, pFrontBR.y);
      ctx.lineTo(pFrontTR.x, pFrontTR.y);
      ctx.lineTo(pFrontTL.x, pFrontTL.y);
      ctx.closePath();
      ctx.fillStyle = theme.body;
      ctx.fill();

      // Warning stripes
      ctx.save();
      ctx.clip();

      const numStripes = 4;
      for (let s = 0; s < numStripes; s++) {
        const stripeT = (s / numStripes);
        const nextT = ((s + 0.5) / numStripes);

        const sBLx = pFrontBL.x + (pFrontBR.x - pFrontBL.x) * stripeT;
        const sBLy = pFrontBL.y + (pFrontBR.y - pFrontBL.y) * stripeT;
        const sBRx = pFrontBL.x + (pFrontBR.x - pFrontBL.x) * nextT;
        const sBRy = pFrontBL.y + (pFrontBR.y - pFrontBL.y) * nextT;

        const sTRx = pFrontTL.x + (pFrontTR.x - pFrontTL.x) * nextT;
        const sTRy = pFrontTL.y + (pFrontTR.y - pFrontTL.y) * nextT;
        const sTLx = pFrontTL.x + (pFrontTR.x - pFrontTL.x) * stripeT;
        const sTLy = pFrontTL.y + (pFrontTR.y - pFrontTL.y) * stripeT;

        ctx.fillStyle = theme.stripe;
        ctx.beginPath();
        ctx.moveTo(sBLx, sBLy);
        ctx.lineTo(sBRx, sBRy);
        ctx.lineTo(sTRx, sTRy);
        ctx.lineTo(sTLx, sTLy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = theme.outline;
      ctx.lineWidth = Math.max(1.5, pFrontBL.scale * 0.9);
      ctx.stroke();
    }
  }
}

window.Obstacles = Obstacles;
