import { ParticleFactory } from './particles/ParticleFactory.js';
import { ThreeSceneController } from './particles/ThreeSceneController.js';
import { ParticleInteractionService } from './particles/ParticleInteractionService.js';
import * as THREE from 'three';

// Clean Architecture Composition Root
// 1. Create the scene controller (Interface Adapter)
const sceneController = new ThreeSceneController({ containerId: 'app' });

// 2. Create the domain model (Entity)
const particleSphere = ParticleFactory.createDefaultSphere();

// 3. Create the application service (Use Case)
const interactionService = new ParticleInteractionService(particleSphere);

// 4. Add the sphere to the scene
const geometry = particleSphere.getGeometry();
const material = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, map: createCircleTexture(64), alphaTest: 0.5 });
const points = new THREE.Points(geometry, material);
sceneController.addObject(points);

// 4b. Toggle switch wiring
const morphToggle = document.getElementById('morphToggle');
interactionService.enableMorph = morphToggle.checked;
morphToggle.addEventListener('change', e => {
  interactionService.enableMorph = e.target.checked;
});

// 5. Animation loop and event wiring (composition root only)
let pointer = null;
let lastPointer = null;
let lastPointerEvent = null;
// (moved up, only one declaration of pointer, lastPointer, lastPointerEvent)

function animate(time) {
  requestAnimationFrame(animate);
  // Auto-rotate the sphere
  points.rotation.y += 0.002;
  // Breathing morph effect
  const breath = 1 + Math.sin(time * 0.001) * 0.05;
  if (interactionService.enableMorph) {
    points.scale.set(breath, breath, breath);
  } else {
    points.scale.set(1, 1, 1);
  }
  // All animation and interaction logic is delegated to the service
  interactionService.update({
    time,
    pointer,
    lastPointer,
    lastPointerEvent,
    points,
    camera: sceneController.camera
  });
  sceneController.render();
}
animate();

// Pointer event wiring
sceneController.renderer.domElement.addEventListener('pointermove', (event) => {
  lastPointer = pointer;
  pointer = { x: event.clientX, y: event.clientY };
  lastPointerEvent = event;
  interactionService.handlePointerMove(event);
});

function createCircleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 1.0;
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

// (All legacy code removed below this line. File ends here.)
