class Player {
  constructor(ballImage) {
    this.ballImage = ballImage;
    this.radius = 0.85;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 18;
    this.speed = this.baseSpeed;
    this.boostTimer = 0;
    this.tilt = 0;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.grounded = true;
    this.falling = false;
    this.fallY = 0;
    this.fallRotation = 0;
  }

  jump() {
    if (this.grounded && !this.falling) {
      this.vy = 10;
      this.grounded = false;
      if (window.soundManager) window.soundManager.playJump();
    }
  }

  applyBoost(multiplier = 1.45, duration = 1.8) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    if (window.soundManager) window.soundManager.playBoost();
    if (window.particleEngine) {
      window.particleEngine.spawnSparks(this.x, this.y + this.radius, this.z, "#00f0ff", 22);
    }
    if (window.camera) window.camera.triggerShake(0.5);
  }

  triggerFall() {
    if (this.falling) return;
    this.falling = true;
    this.grounded = false;
    this.vy = 2; // slight upward bounce as it tumbles off
    if (window.soundManager) window.soundManager.playCrash();
    if (window.particleEngine) {
      window.particleEngine.spawnCrash(this.x, this.y + this.radius, this.z);
    }
    if (window.camera) window.camera.triggerShake(1.2);
  }

  update(dt, axis, track) {
    if (this.falling) {
      this.vy -= 32 * dt;
      this.y += this.vy * dt;
      this.fallRotation += 8 * dt;
      this.z += this.speed * 0.4 * dt;
      return;
    }

    // Forward speed scaling gradually with distance
    let currentForwardSpeed = Math.min(38, this.baseSpeed + this.z * 0.007);
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      currentForwardSpeed *= 1.45;
      if (window.particleEngine && Math.random() < 0.6) {
        window.particleEngine.spawnSparks(this.x, this.y + 0.3, this.z, "#00f5ff", 2);
      }
    }
    this.speed = currentForwardSpeed;
    this.z += this.speed * dt;

    // Pitch rolling rotation
    this.pitchAngle += (this.speed * dt) / this.radius;

    // Responsive lateral steering
    const accel = 42;
    const maxVx = 14;

    if (axis !== 0) {
      this.vx += axis * accel * dt;
    } else {
      // Smooth lateral friction
      this.vx *= Math.pow(0.002, dt);
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    this.vx = Math.max(-maxVx, Math.min(maxVx, this.vx));
    this.x += this.vx * dt;

    // Banking tilt when steering
    const targetTilt = (-this.vx / maxVx) * 0.38;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, 14 * dt);

    // Track surface height and collision
    const trackPoint = track.sample(this.z);

    // Boost pad trigger
    if (trackPoint.type === "boost" && this.boostTimer <= 0) {
      this.applyBoost();
    }

    // Ramp launch trigger
    if (trackPoint.type === "ramp" && this.grounded) {
      this.vy = 8.5;
      this.grounded = false;
      if (window.soundManager) window.soundManager.playJump();
    }

    // Vertical physics (gravity and landing)
    if (!this.grounded) {
      this.vy -= 26 * dt;
      this.y += this.vy * dt;

      if (this.y <= trackPoint.y) {
        this.y = trackPoint.y;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      // Smoothly follow track hill elevation
      this.y = trackPoint.y;
    }

    // Dust particles when rolling on ground
    if (this.grounded && window.particleEngine) {
      if (Math.random() < 0.4) {
        window.particleEngine.spawnDust(this.x, this.y, this.z, 1);
      }
    }

    // Sound manager update
    if (window.soundManager) {
      window.soundManager.updateRolling(this.speed, this.grounded && !this.falling);
    }
  }

  draw(ctx, camera, width, height, track) {
    const trackPoint = track.sample(this.z);
    const groundY = trackPoint.y;

    // 1. Draw Ground Drop Shadow
    if (!this.falling) {
      const shadowPoint = camera.project(this.x, groundY, this.z, width, height);
      if (shadowPoint) {
        const heightOffGround = Math.max(0, this.y - groundY);
        const shadowScale = Math.max(0.2, 1 - heightOffGround / 4);
        const shadowW = Math.max(8, this.radius * 1.5 * shadowPoint.scale * shadowScale);
        const shadowH = Math.max(3, this.radius * 0.45 * shadowPoint.scale * shadowScale);

        ctx.save();
        ctx.fillStyle = `rgba(10, 20, 32, ${0.45 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(shadowPoint.x, shadowPoint.y, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Project Ball Center
    const ballCenter = camera.project(this.x, this.y + this.radius, this.z, width, height);
    if (!ballCenter) return;

    const screenRadius = Math.max(12, this.radius * ballCenter.scale);

    ctx.save();
    ctx.translate(ballCenter.x, ballCenter.y);

    if (this.falling) {
      ctx.rotate(this.fallRotation);
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(this.y) / 25);
    } else {
      ctx.rotate(this.tilt);
    }

    // Draw futuristic 3D Rolling Sphere
    this.draw3DSphere(ctx, screenRadius);

    ctx.restore();
  }

  draw3DSphere(ctx, r) {
    // Base outer glow when boosted
    if (this.boostTimer > 0) {
      ctx.save();
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Clip to circle boundary
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // Dark high-tech base gradient
    const baseGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    baseGrad.addColorStop(0, "#e8f8ff");
    baseGrad.addColorStop(0.18, "#38bdf8");
    baseGrad.addColorStop(0.55, "#0284c7");
    baseGrad.addColorStop(0.85, "#034984");
    baseGrad.addColorStop(1, "#021c38");
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // 3D Rolling Latitude Rings (Pitch rotation)
    const numRings = 3;
    for (let i = 0; i < numRings; i++) {
      const ringOffset = this.pitchAngle + (i * Math.PI) / numRings;
      const sinP = Math.sin(ringOffset);
      const cosP = Math.cos(ringOffset);

      // Only draw visible front facing arcs
      if (cosP > -0.2) {
        const ringY = sinP * (r * 0.78);
        const ringH = Math.max(1, Math.abs(cosP) * (r * 0.28));

        ctx.strokeStyle = `rgba(165, 243, 252, ${0.45 + cosP * 0.45})`;
        ctx.lineWidth = Math.max(1.5, r * 0.055);
        ctx.beginPath();
        ctx.ellipse(0, ringY, r * 0.85, ringH, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 3D Longitude Core Band
    const longRot = Math.sin(this.pitchAngle * 0.5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(longRot) * r * 0.7, r * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center Core Hexagon / Orb
    ctx.fillStyle = this.boostTimer > 0 ? "#ffffff" : "#67e8f9";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Remove clip

    // Sphere Outer Rim Specular Highlight & Bevel
    ctx.save();
    const rimGrad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, -r * 0.4, -r * 0.4, r * 1.3);
    rimGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    rimGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.2)");
    rimGrad.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    rimGrad.addColorStop(1, "rgba(0, 0, 0, 0.65)");

    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.stroke();
    ctx.restore();
  }
}
