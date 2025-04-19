// Interface Adapter: ThreeSceneController
// Responsible for setting up and controlling the Three.js scene (Clean Architecture: Interface Adapter Layer)
import * as THREE from 'three';

export class ThreeSceneController {
  constructor({ containerId = 'app', width = window.innerWidth, height = window.innerHeight }) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;
    this.camera.lookAt(this.scene.position);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x161818, 1);
    this.renderer.setSize(width, height);
    document.getElementById(containerId).appendChild(this.renderer.domElement);
  }

  addObject(object3D) {
    this.scene.add(object3D);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ... More scene control methods ...
}
