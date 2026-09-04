// Particle System for PlayArena Rolling Ball
class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  spawnDust(x, y, z, count = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.5,
        y: y + 0.1,
        z: z - 0.2 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0.8 + Math.random() * 1.2,
        vz: -2 - Math.random() * 2,
        size: 0.18 + Math.random() * 0.15,
        color: "rgba(230, 240, 255, 0.6)",
        alpha: 0.6,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }
  }

  spawnSparks(x, y, z, color = "#00e5ff", count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x,
        y: y + 0.5,
        z,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 6,
        vz: Math.sin(angle) * speed,
        size: 0.12 + Math.random() * 0.12,
        color,
        alpha: 1,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8
      });
    }
  }

  spawnCrash(x, y, z) {
    for (let i = 0; i < 30; i++) {
      const speed = 4 + Math.random() * 8;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.sin(theta) * Math.cos(phi) * speed,
        vy: Math.abs(Math.cos(theta)) * speed + 2,
        vz: Math.sin(theta) * Math.sin(phi) * speed,
        size: 0.2 + Math.random() * 0.25,
        color: i % 2 === 0 ? "#00e5ff" : "#ff3366",
        alpha: 1,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3
      });
    }
  }

  spawnConfetti(x, y, z, count = 45) {
    const colors = ["#ffd23f", "#38bdf8", "#ec4899", "#10b981", "#a855f7", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 2 + Math.random() * 3,
        z: z + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(angle) * speed,
        size: 0.16 + Math.random() * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 1.5 + Math.random() * 1.0,
        maxLife: 2.5
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt * 0.7; // Gravity
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  draw(ctx, camera, width, height) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const screen = camera.project(p.x, p.y, p.z, width, height);
      if (!screen) continue;

      const radius = Math.max(1.5, p.size * screen.scale);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

window.particleEngine = new ParticleEngine();
