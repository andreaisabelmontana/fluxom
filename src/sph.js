// 2D Smoothed-Particle Hydrodynamics (Müller et al. 2003).
//
// Each particle carries mass; the fluid's density and pressure are *smoothed*
// over neighbours within a radius H using kernel functions. Pressure pushes
// dense regions apart, viscosity smooths the velocity field, and gravity pulls
// everything down. Neighbour lookups use a uniform spatial-hash grid so the
// cost stays roughly linear in particle count.

const H = 16;            // smoothing radius (px)
const HSQ = H * H;
const MASS = 2.5;
const VISC = 200;
const REST_DENS = 300;
const POLY6 = 4 / (Math.PI * Math.pow(H, 8));
const SPIKY_GRAD = -10 / (Math.PI * Math.pow(H, 5));
const VISC_LAP = 40 / (Math.PI * Math.pow(H, 5));
const DT = 0.0007;
const BOUND_DAMP = -0.5;
const EPS = H;

export class Fluid {
  constructor(width, height) {
    this.w = width; this.h = height;
    this.cfg = { gasK: 2000, gravity: 1.0, viscosity: 1.0 };
    this.particles = [];
    this.grid = new Map();
    this.cell = H;
  }

  resize(w, h) { this.w = w; this.h = h; }

  clear() { this.particles = []; }

  // Drop a rectangular block of fluid (dam-break style).
  spawnBlock(n) {
    this.particles = [];
    const cols = Math.ceil(Math.sqrt(n * (this.w * 0.4) / (this.h * 0.8)));
    let placed = 0;
    const jitter = () => (Math.random() - 0.5) * 0.6;
    outer:
    for (let y = this.h * 0.12; y < this.h * 0.92; y += H * 0.6) {
      for (let x = EPS; x < this.w * 0.42; x += H * 0.6) {
        if (placed >= n) break outer;
        this.particles.push({ x: x + jitter(), y: y + jitter(), vx: 0, vy: 0, fx: 0, fy: 0, rho: 0, p: 0 });
        placed++;
      }
    }
  }

  add(x, y) {
    this.particles.push({ x, y, vx: 0, vy: 0, fx: 0, fy: 0, rho: 0, p: 0 });
  }

  _hash() {
    this.grid.clear();
    const cols = Math.max(1, Math.ceil(this.w / this.cell));
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.max(0, Math.min(cols - 1, Math.floor(p.x / this.cell)));
      const cy = Math.max(0, Math.floor(p.y / this.cell));
      const key = cy * cols + cx;
      let b = this.grid.get(key);
      if (!b) this.grid.set(key, (b = []));
      b.push(i);
    }
    this._cols = cols;
  }

  _neighbors(p, fn) {
    const cols = this._cols;
    const cx = Math.max(0, Math.min(cols - 1, Math.floor(p.x / this.cell)));
    const cy = Math.max(0, Math.floor(p.y / this.cell));
    for (let oy = cy - 1; oy <= cy + 1; oy++) {
      if (oy < 0) continue;
      for (let ox = cx - 1; ox <= cx + 1; ox++) {
        if (ox < 0 || ox >= cols) continue;
        const b = this.grid.get(oy * cols + ox);
        if (b) for (const j of b) fn(this.particles[j]);
      }
    }
  }

  step(mouse) {
    const P = this.particles;
    this._hash();

    // density & pressure
    for (const pi of P) {
      pi.rho = 0;
      this._neighbors(pi, (pj) => {
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < HSQ) pi.rho += MASS * POLY6 * Math.pow(HSQ - r2, 3);
      });
      pi.rho = Math.max(pi.rho, REST_DENS * 0.2);
      pi.p = this.cfg.gasK * (pi.rho - REST_DENS);
    }

    // forces
    const gy = 12000 * 9.8 * this.cfg.gravity;
    const visc = VISC * this.cfg.viscosity;
    for (const pi of P) {
      let fpx = 0, fpy = 0, fvx = 0, fvy = 0;
      this._neighbors(pi, (pj) => {
        if (pj === pi) return;
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        const r = Math.hypot(dx, dy);
        if (r < H && r > 0) {
          const nx = dx / r, ny = dy / r;
          const fp = MASS * (pi.p + pj.p) / (2 * pj.rho) * SPIKY_GRAD * Math.pow(H - r, 2);
          fpx += -nx * fp; fpy += -ny * fp;
          const vl = visc * MASS * VISC_LAP * (H - r) / pj.rho;
          fvx += vl * (pj.vx - pi.vx); fvy += vl * (pj.vy - pi.vy);
        }
      });
      pi.fx = fpx + fvx;
      pi.fy = fpy + fvy + gy * pi.rho / 1000; // gravity scaled by local density feel
      // mouse interaction
      if (mouse) {
        const dx = pi.x - mouse.x, dy = pi.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const R = 80;
        if (d2 < R * R && d2 > 1) {
          const f = mouse.mode * 90000 * (1 - Math.sqrt(d2) / R) / Math.sqrt(d2);
          pi.fx += dx * f; pi.fy += dy * f;
        }
      }
    }

    // integrate + boundaries
    for (const pi of P) {
      pi.vx += DT * pi.fx / pi.rho;
      pi.vy += DT * pi.fy / pi.rho;
      pi.x += DT * pi.vx;
      pi.y += DT * pi.vy;
      if (pi.x < EPS) { pi.vx *= BOUND_DAMP; pi.x = EPS; }
      if (pi.x > this.w - EPS) { pi.vx *= BOUND_DAMP; pi.x = this.w - EPS; }
      if (pi.y < EPS) { pi.vy *= BOUND_DAMP; pi.y = EPS; }
      if (pi.y > this.h - EPS) { pi.vy *= BOUND_DAMP; pi.y = this.h - EPS; }
    }
  }
}

export const SPH_H = H;
