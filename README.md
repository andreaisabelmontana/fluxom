# Ripple

A real-time **2D fluid simulation** built on **smoothed-particle hydrodynamics (SPH)**. A few thousand particles, each carrying mass, collectively behave like water — sloshing, splashing, and settling under genuine pressure and viscosity forces. Stir it with your cursor.

**▶ Live:** https://andreaisabelmontana.github.io/ripple/

## How it works

SPH (Müller et al., 2003) treats the fluid as particles and *smooths* its properties over neighbours within a radius using kernel functions:

- **Density / pressure** — a poly6 kernel estimates local density; pressure rises where the fluid is compressed
- **Pressure force** — a spiky-gradient kernel pushes dense regions apart (incompressibility)
- **Viscosity** — a laplacian kernel smooths the velocity field
- **Gravity** pulls everything down; walls reflect with damping

Neighbour search uses a uniform **spatial-hash grid**, so cost stays roughly linear in particle count.

## Controls

- Particle count, **gravity**, **viscosity**, and **stiffness** — all live
- Cursor modes: **push away**, **pull in**, or **add fluid**
- **Reset** drops a fresh block of water (a dam break)

## Tech

Vanilla JS + Canvas 2D, particles drawn as additive radial blobs for a liquid look. No build step, no dependencies.

```
index.html
styles.css
src/sph.js    # SPH solver: kernels, density/pressure/viscosity, spatial-hash grid
src/main.js   # render, controls, cursor interaction
```

## License

MIT — see [LICENSE](LICENSE).
