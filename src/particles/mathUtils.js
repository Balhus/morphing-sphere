// mathUtils.js
// Utilidades matemáticas y de easing para interacción de partículas
import * as THREE from 'three';

export function lerpVec3(a, b, t) {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
