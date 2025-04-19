// Application Service: ParticleInteractionService
// Responsible for handling particle interaction logic (Clean Architecture: Use Case Layer)
import * as THREE from 'three';
import { lerpVec3, easeInOutSine, clamp } from './mathUtils.js';

/**
 * Application Service for particle interaction logic.
 * Handles all user interaction and per-frame updates for the particle sphere.
 * Clean Architecture: Use Case Layer.
 */
export class ParticleInteractionService {
  constructor(particleSphere) {
    this.particleSphere = particleSphere;
    // You can add more dependencies (e.g., event bus, config) as needed
    this.morphLerp = 1;      // current morph strength (0 to 1)
    this.morphTarget = 1;    // target morph strength (0 or 1)
  }

  // Main update method for animation loop
  /**
   * Main update method called every animation frame.
   * @param {Object} params - Frame context.
   */
  update({ time, pointer, lastPointer, lastPointerEvent, points, camera }) {
    this.animateSpreadReturn();
    // Smoothly interpolate morph strength towards target
    this.morphLerp += (this.morphTarget - this.morphLerp) * 0.05;
    if (pointer && points && camera) {
      this.spreadDots({ pointer, lastPointer, lastPointerEvent, points, camera });
    }
    // Apply interaction offsets + multi-wave radial distortion pattern
    const ps = this.particleSphere;
    const positions = points.geometry.attributes.position.array;
    const orig = ps.originalPositions;
    const off = ps.spreadOffsets;
    const count = ps.DOT_COUNT;

    // Radial morph with smoothed intensity
    const waveSpeed1 = 0.002;
    const waveSpeed2 = 0.001;
    const ampRadius = ps.RADIUS * 0.15;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x0 = orig[idx], y0 = orig[idx + 1], z0 = orig[idx + 2];
      const ux = x0 / ps.RADIUS, uy = y0 / ps.RADIUS, uz = z0 / ps.RADIUS;
      const uyClamped = clamp(uy, -1, 1);
      const theta = Math.acos(uyClamped);
      const phi = Math.atan2(uz, ux);
      const wave1 = Math.sin(time * waveSpeed1 + theta * 5 + phi * 3);
      const wave2 = Math.cos(time * waveSpeed2 + theta * 3 - phi * 2);
      const baseOffset = (wave1 + wave2) * 0.5 * ampRadius;
      const radOffset = baseOffset * this.morphLerp;
      const r = ps.RADIUS + radOffset;
      positions[idx]     = ux * r + off[idx];
      positions[idx + 1] = uy * r + off[idx + 1];
      positions[idx + 2] = uz * r + off[idx + 2];
    }
    points.geometry.attributes.position.needsUpdate = true;

    // Blink particles blue/white
    const colorArr = points.geometry.attributes.color.array;
    const blinkSpeed = 0.01;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const flick = Math.sin(time * blinkSpeed + i) > 0;
      if (flick) {
        colorArr[idx]     = 0.1176; // blue
        colorArr[idx + 1] = 0.5647;
        colorArr[idx + 2] = 1.0;
      } else {
        colorArr[idx]     = 1.0; // white
        colorArr[idx + 1] = 1.0;
        colorArr[idx + 2] = 1.0;
      }
    }
    points.geometry.attributes.color.needsUpdate = true;
  }

  // Animate spread return for all dots
  /**
   * Animate the smooth return and kick of all dots.
   * Handles arc-out-and-return and lerp home.
   */
  animateSpreadReturn() {
    const ps = this.particleSphere;
    for (let i = 0; i < ps.DOT_COUNT; i++) {
      if (ps.spreadKickT[i] < 1) {
        ps.spreadKickT[i] += 0.035;
        if (ps.spreadKickT[i] > 1) ps.spreadKickT[i] = 1;
        const ease = easeInOutSine(ps.spreadKickT[i]);
        ps.spreadOffsets[i * 3] = ps.spreadKickStart[i].x + ps.spreadKickDir[i].x * ease;
        ps.spreadOffsets[i * 3 + 1] = ps.spreadKickStart[i].y + ps.spreadKickDir[i].y * ease;
        ps.spreadOffsets[i * 3 + 2] = ps.spreadKickStart[i].z + ps.spreadKickDir[i].z * ease;
        continue;
      }
      if (ps.spreadTimers[i] > 0) {
        ps.spreadTimers[i] -= 0.017;
        if (ps.spreadTimers[i] < 0) ps.spreadTimers[i] = 0;
      } else {
        // Lerp offsets back to zero (smooth return)
        ps.spreadOffsets[i * 3] += (0 - ps.spreadOffsets[i * 3]) * 0.03;
        ps.spreadOffsets[i * 3 + 1] += (0 - ps.spreadOffsets[i * 3 + 1]) * 0.03;
        ps.spreadOffsets[i * 3 + 2] += (0 - ps.spreadOffsets[i * 3 + 2]) * 0.03;
      }
    }
  }

  // Spread dots according to cursor interaction
  /**
   * Spread and gather dots according to cursor interaction for this frame.
   * @param {Object} params - Interaction context (pointer, lastPointer, etc.)
   */
  spreadDots({ pointer, lastPointer, lastPointerEvent, points, camera }) {
    const ps = this.particleSphere;
    // Calculate cursor position in world space
    const mouseNDC = new THREE.Vector2(
      (pointer.x / window.innerWidth) * 2 - 1,
      -(pointer.y / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseNDC, camera);
    const rayOrigin = raycaster.ray.origin.clone();
    const rayDir = raycaster.ray.direction.clone();
    // Find intersection with sphere
    const a = rayDir.dot(rayDir);
    const b = 2 * rayOrigin.dot(rayDir);
    const c = rayOrigin.dot(rayOrigin) - ps.RADIUS * ps.RADIUS;
    const discriminant = b * b - 4 * a * c;
    let cursorWorld;
    if (discriminant >= 0) {
      const t = (-b - Math.sqrt(discriminant)) / (2 * a);
      cursorWorld = rayOrigin.clone().add(rayDir.clone().multiplyScalar(t));
    } else {
      // Fallback: project pointer onto sphere surface from camera
      const camToPointer = rayOrigin.clone().add(rayDir.clone().multiplyScalar(5));
      const dir = camToPointer.clone().sub(camera.position).normalize();
      cursorWorld = camera.position.clone().add(dir.multiplyScalar(ps.RADIUS));
    }
    // Sphere rotation
    const sphereQuat = points.quaternion.clone();
    const invQuat = sphereQuat.clone().invert();
    const CURSOR_RADIUS = ps.RADIUS * 0.38;
    // Interpolate between last and current cursor for robust exclusion
    let prevCursorWorld = null;
    if (lastPointer && lastPointerEvent) {
      const prevMouseNDC = new THREE.Vector2(
        (lastPointer.x / window.innerWidth) * 2 - 1,
        -(lastPointer.y / window.innerHeight) * 2 + 1
      );
      const prevRaycaster = new THREE.Raycaster();
      prevRaycaster.setFromCamera(prevMouseNDC, camera);
      const prevRayOrigin = prevRaycaster.ray.origin.clone();
      const prevRayDir = prevRaycaster.ray.direction.clone();
      const a2 = prevRayDir.dot(prevRayDir);
      const b2 = 2 * prevRayOrigin.dot(prevRayDir);
      const c2 = prevRayOrigin.dot(prevRayOrigin) - ps.RADIUS * ps.RADIUS;
      const discriminant2 = b2 * b2 - 4 * a2 * c2;
      if (discriminant2 >= 0) {
        const t2 = (-b2 - Math.sqrt(discriminant2)) / (2 * a2);
        prevCursorWorld = prevRayOrigin.clone().add(prevRayDir.clone().multiplyScalar(t2));
      } else {
        const camToPointer = prevRayOrigin.clone().add(prevRayDir.clone().multiplyScalar(5));
        const dir2 = camToPointer.clone().sub(camera.position).normalize();
        prevCursorWorld = camera.position.clone().add(dir2.multiplyScalar(ps.RADIUS));
      }
    }
    // Interpolate for robust exclusion
    const steps = 12;
    const touchedThisFrame = new Array(ps.DOT_COUNT).fill(false);
    for (let s = 0; s <= steps; s++) {
      let kicksThisStep = 0;
      const MAX_KICKS_PER_STEP = 2;
      const lerpT = prevCursorWorld && cursorWorld ? s / steps : 1;
      const interpCursor = prevCursorWorld && cursorWorld
        ? lerpVec3(prevCursorWorld, cursorWorld, lerpT)
        : cursorWorld;
      const sphereQuat = points.quaternion.clone();
      const invQuat = sphereQuat.clone().invert();
      for (let i = 0; i < ps.DOT_COUNT; i++) {
        if (ps.spreadKickT[i] < 1) continue; // skip kicked dots
        // Get dot's world position
        const px = ps.originalPositions[i * 3];
        const py = ps.originalPositions[i * 3 + 1];
        const pz = ps.originalPositions[i * 3 + 2];
        const dotLocal = new THREE.Vector3(px, py, pz);
        const dotWorld = dotLocal.clone().applyQuaternion(sphereQuat);
        const toCursor = dotWorld.clone().sub(interpCursor);
        const dist = toCursor.length();
        if (dist < CURSOR_RADIUS) {
          // Calculate exclusion boundary
          const exclusionSurfaceWorld = interpCursor.clone().add(toCursor.clone().normalize().multiplyScalar(CURSOR_RADIUS + 0.001));
          const exclusionSurfaceLocal = exclusionSurfaceWorld.clone().applyQuaternion(invQuat);
          // Compute dynamic force based on pointer movement
          const dx = lastPointer ? pointer.x - lastPointer.x : 0;
          const dy = lastPointer ? pointer.y - lastPointer.y : 0;
          const pointerSpeed = Math.sqrt(dx * dx + dy * dy);
          const force = pointerSpeed / 5;
          // trigger spread only if force exceeds lower threshold for slower movement
          if (force > 0.5 && kicksThisStep < MAX_KICKS_PER_STEP) {
            const spreadAmt = clamp(0.7 * Math.pow(Math.max(0, force - 1.0), 1.15), 0, ps.RADIUS * 0.7);
            const radial = toCursor.clone().normalize();
            ps.spreadKickStart[i].set(
              exclusionSurfaceLocal.x - px,
              exclusionSurfaceLocal.y - py,
              exclusionSurfaceLocal.z - pz
            );
            ps.spreadKickT[i] = 0;
            const kickDirWorld = radial.clone().multiplyScalar(spreadAmt);
            ps.spreadKickDir[i] = kickDirWorld.clone().applyQuaternion(invQuat);
            ps.spreadOffsets[i * 3] = exclusionSurfaceLocal.x - px;
            ps.spreadOffsets[i * 3 + 1] = exclusionSurfaceLocal.y - py;
            ps.spreadOffsets[i * 3 + 2] = exclusionSurfaceLocal.z - pz;
            kicksThisStep++;
          } else {
            ps.spreadOffsets[i * 3] = exclusionSurfaceLocal.x - px;
            ps.spreadOffsets[i * 3 + 1] = exclusionSurfaceLocal.y - py;
            ps.spreadOffsets[i * 3 + 2] = exclusionSurfaceLocal.z - pz;
          }
          touchedThisFrame[i] = true;
        } else if (dist < CURSOR_RADIUS + 0.18) {
          const target = cursorWorld.clone().add(toCursor.clone().normalize().multiplyScalar(CURSOR_RADIUS + 0.001));
          const targetLocal = target.clone().applyQuaternion(invQuat);
          ps.spreadOffsets[i * 3] += (targetLocal.x - (px + ps.spreadOffsets[i * 3])) * 0.18;
          ps.spreadOffsets[i * 3 + 1] += (targetLocal.y - (py + ps.spreadOffsets[i * 3 + 1])) * 0.18;
          ps.spreadOffsets[i * 3 + 2] += (targetLocal.z - (pz + ps.spreadOffsets[i * 3 + 2])) * 0.18;
          ps.spreadTimers[i] = 0.4;
          touchedThisFrame[i] = true;
        }
      }
    }
    for (let i = 0; i < ps.DOT_COUNT; i++) {
      if (!touchedThisFrame[i]) {
        ps.spreadTimers[i] = 0;
      }
    }
  }

  // Handle pointer move event
  /**
   * Handle pointer move event (optional, for future extensibility).
   * @param {PointerEvent} event
   */
  handlePointerMove(event) {
    // Optionally handle pointer state here if needed
  }
}
