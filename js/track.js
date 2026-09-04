// 3D Perspective Track Engine - Multi-Level Theme & Finish Arch Support
class Track {
  constructor(config = null) {
    this.applyConfig(config);
    this.segmentLength = 3.2;
    this.visibleBehind = 8;
    this.visibleAhead = 150;
    this.slabDepth = 0.85;
  }

  applyConfig(config = null) {
    this.config = config || {
      width: 7.5,
      curveIntensity: 1.0,
      hillIntensity: 1.0,
      finishZ: 1500,
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
        archGlow: "#f59e0b"
      }
    };
    this.defaultWidth = this.config.width || 7.5;
    this.finishZ = this.config.finishZ || 1500;
  }

  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  sample(z) {
    if (z < 0) return { x: 0, y: 0, width: this.defaultWidth, type: "normal" };

    const cInt = this.config.curveIntensity || 1.0;
    const hInt = this.config.hillIntensity || 1.0;

    let x = 0;
    const curveWeight1 = this.smoothstep(25, 75, z);
    x += Math.sin(z * 0.022) * (3.6 * cInt) * curveWeight1;

    const curveWeight2 = this.smoothstep(110, 180, z);
    x += Math.sin(z * 0.046) * (2.4 * cInt) * curveWeight2;

    let y = 0;
    const hillWeight = this.smoothstep(40, 90, z);
    y += Math.sin(z * 0.032) * (0.85 * hInt) * hillWeight;

    let type = "normal";
    // Boost zones and ramps
    const cycle = z % 125;
    if (cycle >= 42 && cycle <= 54) {
      type = "boost";
    } else if (cycle >= 85 && cycle <= 100) {
      type = "ramp";
      const rampProgress = (cycle - 85) / 15;
      y += Math.sin(rampProgress * Math.PI) * 1.6;
    }

    return {
      x,
      y,
      width: this.defaultWidth,
      type
    };
  }

  getHalfWidth(z) {
    return this.sample(z).width / 2;
  }

  containsPlayer(x, z, radius = 0.85) {
    const track = this.sample(z);
    const halfWidth = track.width / 2;
    return Math.abs(x - track.x) <= halfWidth + radius * 0.25;
  }

  draw(ctx, camera, width, height, playerZ) {
    const startZ = Math.max(0, Math.floor((playerZ - this.visibleBehind) / this.segmentLength) * this.segmentLength);
    const endZ = Math.floor((playerZ + this.visibleAhead) / this.segmentLength) * this.segmentLength;

    const seamOverlap = 0.28;
    const theme = this.config.theme;

    for (let z = endZ; z >= startZ; z -= this.segmentLength) {
      const nextZ = z + this.segmentLength + seamOverlap;

      const p0 = this.sample(z);
      const p1 = this.sample(nextZ);

      const halfW0 = p0.width / 2;
      const halfW1 = p1.width / 2;
      const distFromPlayer = z - playerZ;

      const nearLeft = camera.project(p0.x - halfW0, p0.y, z, width, height);
      const nearRight = camera.project(p0.x + halfW0, p0.y, z, width, height);
      const farRight = camera.project(p1.x + halfW1, p1.y, nextZ, width, height);
      const farLeft = camera.project(p1.x - halfW1, p1.y, nextZ, width, height);

      if (!nearLeft || !nearRight || !farRight || !farLeft) continue;

      let alpha = 1.0;
      if (distFromPlayer > 95) {
        alpha = Math.max(0, 1 - (distFromPlayer - 95) / 50);
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // 1. 3D Under-Slab
      const nearLeftUnder = camera.project(p0.x - halfW0, p0.y - this.slabDepth, z, width, height);
      const farLeftUnder = camera.project(p1.x - halfW1, p1.y - this.slabDepth, nextZ, width, height);
      const nearRightUnder = camera.project(p0.x + halfW0, p0.y - this.slabDepth, z, width, height);
      const farRightUnder = camera.project(p1.x + halfW1, p1.y - this.slabDepth, nextZ, width, height);

      if (nearLeftUnder && farLeftUnder) {
        ctx.fillStyle = theme.slabLeft;
        ctx.beginPath();
        ctx.moveTo(nearLeft.x, nearLeft.y);
        ctx.lineTo(farLeft.x, farLeft.y);
        ctx.lineTo(farLeftUnder.x, farLeftUnder.y);
        ctx.lineTo(nearLeftUnder.x, nearLeftUnder.y);
        ctx.closePath();
        ctx.fill();
      }

      if (nearRightUnder && farRightUnder) {
        ctx.fillStyle = theme.slabRight;
        ctx.beginPath();
        ctx.moveTo(nearRight.x, nearRight.y);
        ctx.lineTo(farRight.x, farRight.y);
        ctx.lineTo(farRightUnder.x, farRightUnder.y);
        ctx.lineTo(nearRightUnder.x, nearRightUnder.y);
        ctx.closePath();
        ctx.fill();
      }

      // 2. Main Track Deck
      const segIndex = Math.floor(z / this.segmentLength);
      const lodBlend = Math.min(1, Math.max(0, (distFromPlayer - 40) / 45));

      let deckColor1, deckColor2;
      const isFinishSegment = Math.abs(z - this.finishZ) < 3.5;

      if (isFinishSegment) {
        // Checkered finish line surface
        deckColor1 = segIndex % 2 === 0 ? "#ffffff" : "#000000";
        deckColor2 = segIndex % 2 === 0 ? "#000000" : "#ffffff";
      } else if (p0.type === "boost") {
        deckColor1 = theme.boost;
        deckColor2 = theme.boost;
      } else if (p0.type === "ramp") {
        deckColor1 = theme.ramp;
        deckColor2 = theme.ramp;
      } else {
        const baseA = segIndex % 2 === 0 ? theme.deckA : theme.deckB;
        const baseB = segIndex % 2 === 0 ? theme.deckB : theme.deckA;
        deckColor1 = lodBlend > 0 ? this.lerpColor(baseA, theme.deckAvg, lodBlend) : baseA;
        deckColor2 = lodBlend > 0 ? this.lerpColor(baseB, theme.deckAvg, lodBlend) : baseB;
      }

      ctx.beginPath();
      ctx.moveTo(nearLeft.x, nearLeft.y);
      ctx.lineTo(nearRight.x, nearRight.y);
      ctx.lineTo(farRight.x, farRight.y);
      ctx.lineTo(farLeft.x, farLeft.y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(nearLeft.x, nearLeft.y, nearRight.x, nearRight.y);
      grad.addColorStop(0, deckColor1);
      grad.addColorStop(0.5, deckColor2);
      grad.addColorStop(1, deckColor1);
      ctx.fillStyle = grad;
      ctx.fill();

      // Foreground plank divider lines
      if (distFromPlayer < 45 && !isFinishSegment) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.lineWidth = Math.max(1, nearLeft.scale * 0.7);
        ctx.beginPath();
        ctx.moveTo(nearLeft.x, nearLeft.y);
        ctx.lineTo(nearRight.x, nearRight.y);
        ctx.stroke();
      }

      // Center Line & Boost Chevrons
      const nearCenter = camera.project(p0.x, p0.y, z, width, height);
      const farCenter = camera.project(p1.x, p1.y, nextZ, width, height);

      if (nearCenter && farCenter && !isFinishSegment) {
        if (p0.type === "boost") {
          const arrowTip = camera.project(p0.x, p0.y, z + this.segmentLength * 0.7, width, height);
          const arrowLeft = camera.project(p0.x - 1.2, p0.y, z + this.segmentLength * 0.2, width, height);
          const arrowRight = camera.project(p0.x + 1.2, p0.y, z + this.segmentLength * 0.2, width, height);
          if (arrowTip && arrowLeft && arrowRight) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.moveTo(arrowTip.x, arrowTip.y);
            ctx.lineTo(arrowLeft.x, arrowLeft.y);
            ctx.lineTo(arrowRight.x, arrowRight.y);
            ctx.closePath();
            ctx.fill();
          }
        } else if (segIndex % 2 === 0 || distFromPlayer > 50) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
          ctx.lineWidth = Math.max(1.5, nearCenter.scale * 0.85);
          ctx.beginPath();
          ctx.moveTo(nearCenter.x, nearCenter.y);
          ctx.lineTo(farCenter.x, farCenter.y);
          ctx.stroke();
        }
      }

      // Curbs / Guardrails
      this.drawCleanCurb(ctx, camera, p0, p1, z, nextZ, width, height, segIndex, -1, distFromPlayer);
      this.drawCleanCurb(ctx, camera, p0, p1, z, nextZ, width, height, segIndex, 1, distFromPlayer);

      // Check if Finish Arch should be rendered at this Z
      if (Math.abs(z - this.finishZ) < this.segmentLength) {
        this.drawFinishArch(ctx, camera, p0, width, height);
      }

      ctx.restore();
    }
  }

  drawCleanCurb(ctx, camera, p0, p1, z, nextZ, width, height, segIndex, side, distFromPlayer) {
    const halfW0 = p0.width / 2;
    const halfW1 = p1.width / 2;
    const curbW = 0.42;

    const x0Outer = p0.x + side * (halfW0 + curbW);
    const x0Inner = p0.x + side * halfW0;
    const x1Outer = p1.x + side * (halfW1 + curbW);
    const x1Inner = p1.x + side * halfW1;

    const pA = camera.project(x0Inner, p0.y + 0.12, z, width, height);
    const pB = camera.project(x0Outer, p0.y + 0.12, z, width, height);
    const pC = camera.project(x1Outer, p1.y + 0.12, nextZ, width, height);
    const pD = camera.project(x1Inner, p1.y + 0.12, nextZ, width, height);

    if (!pA || !pB || !pC || !pD) return;

    const theme = this.config.theme;
    let curbColor = theme.curb;
    if (distFromPlayer < 40) {
      curbColor = segIndex % 2 === 0 ? theme.curbTick : theme.curb;
    }

    ctx.fillStyle = curbColor;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.closePath();
    ctx.fill();
  }

  // Draw 3D Grand Finish Line Arch
  drawFinishArch(ctx, camera, trackPoint, width, height) {
    const halfW = trackPoint.width / 2;
    const archH = 5.2; // Height of overhead arch
    const z = this.finishZ;

    // Left pillar
    const leftBase = camera.project(trackPoint.x - halfW - 0.4, trackPoint.y, z, width, height);
    const leftTop = camera.project(trackPoint.x - halfW - 0.4, trackPoint.y + archH, z, width, height);

    // Right pillar
    const rightBase = camera.project(trackPoint.x + halfW + 0.4, trackPoint.y, z, width, height);
    const rightTop = camera.project(trackPoint.x + halfW + 0.4, trackPoint.y + archH, z, width, height);

    if (!leftBase || !leftTop || !rightBase || !rightTop) return;

    ctx.save();

    // 1. Pillars
    const pillarW = Math.max(6, leftBase.scale * 0.45);
    ctx.strokeStyle = this.config.theme.archPillar || "#ffd23f";
    ctx.lineWidth = pillarW;
    ctx.lineCap = "round";

    // Left pillar
    ctx.beginPath();
    ctx.moveTo(leftBase.x, leftBase.y);
    ctx.lineTo(leftTop.x, leftTop.y);
    ctx.stroke();

    // Right pillar
    ctx.beginPath();
    ctx.moveTo(rightBase.x, rightBase.y);
    ctx.lineTo(rightTop.x, rightTop.y);
    ctx.stroke();

    // 2. Overhead Crossbar Banner
    const barThickness = Math.max(14, leftTop.scale * 0.85);
    ctx.lineWidth = barThickness;
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(leftTop.x, leftTop.y);
    ctx.lineTo(rightTop.x, rightTop.y);
    ctx.stroke();

    // Glowing border around arch crossbar
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.config.theme.archGlow || "#f59e0b";
    ctx.stroke();

    // 3. "FINISH" Text on crossbeam
    const fontSize = Math.max(10, Math.floor(leftTop.scale * 0.45));
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const archMidX = (leftTop.x + rightTop.x) / 2;
    const archMidY = (leftTop.y + rightTop.y) / 2;
    ctx.fillText("🏁 FINISH 🏁", archMidX, archMidY);

    ctx.restore();
  }

  lerpColor(a, b, t) {
    const ah = parseInt(a.replace("#", ""), 16);
    const bh = parseInt(b.replace("#", ""), 16);

    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;

    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);

    return `rgb(${rr},${rg},${rb})`;
  }
}
