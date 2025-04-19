// Factory: ParticleFactory
// Responsible for creating and configuring ParticleSphere instances (Clean Architecture: Factory pattern)
import { ParticleSphere } from './ParticleSphere.js';

export class ParticleFactory {
  static createDefaultSphere() {
    return new ParticleSphere({ dotCount: 1600, radius: 2 });
  }

  // Add more factory methods if needed
}
