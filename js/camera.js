class Camera {
  constructor() {
    this.x = 0;
    this.y = 3.8;
    this.z = -8.5;
    this.targetX = 0;
    this.focalRatio = 0.72; // Relative to canvas height
    this.horizon = 0.38;    // Horizon line at 38% down the screen
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  reset() {
    this.x = 0;
    this.y = 3.8;
    this.z = -8.5;
    this.targetX = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  update(player, dt) {
    // Smooth lateral follow with subtle lag
    this.targetX = player.x * 0.65;
    this.x += (this.targetX - this.x) * Math.min(1, 10 * dt);

    // Follow behind player in Z
    this.z = player.z - 8.5;

    // Follow player elevation with smooth damping
    const targetY = 3.8 + Math.max(0, player.y * 0.4);
    this.y += (targetY - this.y) * Math.min(1, 8 * dt);

    // Compute unified camera shake ONCE per frame (keeps whole scene rigidly locked together)
    if (this.shake > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shake * 12;
      this.shakeY = (Math.random() - 0.5) * this.shake * 12;
      this.shake = Math.max(0, this.shake - dt * 2.8);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  triggerShake(amount = 1.0) {
    this.shake = Math.min(2.0, this.shake + amount);
  }

  project(worldX, worldY, worldZ, canvasWidth, canvasHeight) {
    const relZ = worldZ - this.z;
    if (relZ < 0.25) return null; // Behind near clipping plane

    const focal = canvasHeight * this.focalRatio;
    const scale = focal / relZ;

    const relX = worldX - this.x;
    const relY = worldY - this.y;

    return {
      x: canvasWidth * 0.5 + relX * scale + this.shakeX,
      y: canvasHeight * this.horizon - relY * scale + this.shakeY,
      scale,
      depth: relZ
    };
  }
}
