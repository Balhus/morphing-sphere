// Domain: ParticleSphere (core logic for sphere and particle interaction)
import * as THREE from 'three';

export class ParticleSphere {
  constructor({ dotCount = 800, radius = 2 }) {
    this.DOT_COUNT = dotCount;
    this.RADIUS = radius;
    this.positions = [];
    this.originalPositions = [];
    this.morphTargets = [];
    this.spreadOffsets = [];
    this.spreadTimers = [];
    this.spreadVels = [];
    this.spreadKickT = [];
    this.spreadKickDir = [];
    this.spreadKickStart = [];
    this.spreadReturnT = [];
    this.colors = [];
    this.color = new THREE.Color();
    this.initParticles();
  }

  initParticles() {
    for (let i = 0; i < this.DOT_COUNT; i++) {
      // Fibonacci sphere algorithm
      const y = 1 - (i / (this.DOT_COUNT - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = Math.PI * 2 * (i * 1.618034 % 1);
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      this.positions.push(x * this.RADIUS, y * this.RADIUS, z * this.RADIUS);
      this.originalPositions.push(x * this.RADIUS, y * this.RADIUS, z * this.RADIUS);
      this.morphTargets.push(x * this.RADIUS, y * this.RADIUS, z * this.RADIUS);
      this.spreadOffsets.push(0, 0, 0);
      this.spreadTimers.push(0);
      this.spreadVels.push(0, 0, 0);
      this.spreadKickT.push(1);
      this.spreadKickDir.push(new THREE.Vector3(0,0,0));
      this.spreadKickStart.push(new THREE.Vector3(0,0,0));
      this.spreadReturnT.push(1);
      this.color.setRGB(1, 1, 1);
      this.colors.push(this.color.r, this.color.g, this.color.b);
    }
  }

  getGeometry() {
    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.Float32BufferAttribute(this.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    return geometry;
  }

  // ... More domain logic methods will be added here ...
}
