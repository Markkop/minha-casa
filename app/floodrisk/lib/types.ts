import React from 'react';

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
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      directionalLight: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      extrudeGeometry: any;
      coneGeometry: any;
      gridHelper: any;
      cylinderGeometry: any;
      dodecahedronGeometry: any;
      circleGeometry: any;
      meshBasicMaterial: any;
      primitive: any;
      [elemName: string]: any;
    }
  }

  // Augment React.JSX namespace for newer React versions (18+)
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        ambientLight: any;
        directionalLight: any;
        group: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
        planeGeometry: any;
        extrudeGeometry: any;
        coneGeometry: any;
        gridHelper: any;
        cylinderGeometry: any;
        dodecahedronGeometry: any;
        circleGeometry: any;
        meshBasicMaterial: any;
        primitive: any;
        [elemName: string]: any;
      }
    }
  }
}

