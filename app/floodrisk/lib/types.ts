export interface Scenario {
  id: string;
  year: number;
  description: string;
  rain_24h_mm: number;
  level_rel_creek: number;
  level_rel_street: number;
  level_rel_house: number;
}

export interface ElementHeight {
  id: string;
  name: string;
  height_rel_creek: number;
  x_pos: number; // For 3D positioning
  width: number;
  depth: number;
  color: string;
  isRampable?: boolean; // Can this connection be a ramp?
}

export enum ConnectionType {
  STEP = 'STEP',
  RAMP = 'RAMP'
}

// Augment the JSX namespace to include Three.js elements globally
// These namespace declarations are required for TypeScript declaration merging
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: unknown;
      directionalLight: unknown;
      group: unknown;
      mesh: unknown;
      boxGeometry: unknown;
      meshStandardMaterial: unknown;
      planeGeometry: unknown;
      extrudeGeometry: unknown;
      coneGeometry: unknown;
      gridHelper: unknown;
      cylinderGeometry: unknown;
      dodecahedronGeometry: unknown;
      circleGeometry: unknown;
      meshBasicMaterial: unknown;
      primitive: unknown;
      [elemName: string]: unknown;
    }
  }

  // Augment React.JSX namespace for newer React versions (18+)
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        ambientLight: unknown;
        directionalLight: unknown;
        group: unknown;
        mesh: unknown;
        boxGeometry: unknown;
        meshStandardMaterial: unknown;
        planeGeometry: unknown;
        extrudeGeometry: unknown;
        coneGeometry: unknown;
        gridHelper: unknown;
        cylinderGeometry: unknown;
        dodecahedronGeometry: unknown;
        circleGeometry: unknown;
        meshBasicMaterial: unknown;
        primitive: unknown;
        [elemName: string]: unknown;
      }
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

