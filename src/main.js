import { Fluid } from "./sph.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

let W, H;
let fluid;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!fluid) fluid = new Fluid(W, H); else fluid.resize(W, H);
}
resize();
window.addEventListener("resize", resize);

const cfg = { count: 900, substeps: 4 };
fluid.spawnBlock(cfg.count);

let mouse = null;
let running = true;

// ---- render ----
function render() {
  ctx.fillStyle = "#04070f";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  for (const p of fluid.particles) {
    const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 900);
    const r = 9;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    const hue = 205 - sp * 60; // fast → cyan/white
    g.addColorStop(0, `hsla(${hue}, 95%, ${60 + sp * 30}%, 0.5)`);
    g.addColorStop(1, "hsla(210, 95%, 50%, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  if (mouse) {
    ctx.strokeStyle = mouse.mode > 0 ? "rgba(255,120,120,.5)" : "rgba(120,200,255,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 80, 0, Math.PI * 2); ctx.stroke();
  }
}

function frame() {
  if (running) for (let s = 0; s < cfg.substeps; s++) fluid.step(mouse);
  render();
  requestAnimationFrame(frame);
}

// ---- controls ----
const ui = {
  count: document.getElementById("count"),
  gravity: document.getElementById("gravity"),
  visc: document.getElementById("visc"),
  stiff: document.getElementById("stiff"),
};
const out = (k) => document.querySelector(`[data-out="${k}"]`);
function sync(rebuild) {
  fluid.cfg.gravity = +ui.gravity.value;
  fluid.cfg.viscosity = +ui.visc.value;
  fluid.cfg.gasK = +ui.stiff.value;
  out("gravity").textContent = (+ui.gravity.value).toFixed(2);
  out("visc").textContent = (+ui.visc.value).toFixed(2);
  out("stiff").textContent = ui.stiff.value;
  out("count").textContent = ui.count.value;
  if (rebuild) { cfg.count = +ui.count.value; fluid.spawnBlock(cfg.count); }
}
ui.count.addEventListener("change", () => sync(true));
ui.count.addEventListener("input", () => (out("count").textContent = ui.count.value));
[ui.gravity, ui.visc, ui.stiff].forEach((el) => el.addEventListener("input", () => sync(false)));
sync(false);

const modeSel = document.getElementById("mode");
document.getElementById("reset").addEventListener("click", () => fluid.spawnBlock(cfg.count));
document.getElementById("collapse").addEventListener("click", () =>
  document.getElementById("panel").classList.toggle("hidden"));

// ---- mouse ----
function setMouse(e) {
  const t = e.touches ? e.touches[0] : e;
  const m = modeSel.value; // push | pull | add
  if (m === "add") { fluid.add(t.clientX, t.clientY); mouse = null; return; }
  mouse = { x: t.clientX, y: t.clientY, mode: m === "push" ? 1 : -1 };
}
let down = false;
canvas.addEventListener("mousedown", (e) => { down = true; setMouse(e); });
canvas.addEventListener("mousemove", (e) => { if (down) setMouse(e); });
window.addEventListener("mouseup", () => { down = false; mouse = null; });
canvas.addEventListener("touchstart", (e) => { down = true; setMouse(e); }, { passive: true });
canvas.addEventListener("touchmove", (e) => { if (down) setMouse(e); e.preventDefault(); }, { passive: false });
canvas.addEventListener("touchend", () => { down = false; mouse = null; });

frame();

window.__ripple = {
  fluid, cfg, render,
  get count() { return fluid.particles.length; },
  steps(n) { for (let i = 0; i < n; i++) fluid.step(null); },
  get dims() { return { W, H }; },
  resize, spawn: (n) => fluid.spawnBlock(n),
  avgY() { let s = 0; for (const p of fluid.particles) s += p.y; return s / fluid.particles.length; },
};
