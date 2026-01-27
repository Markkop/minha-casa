import React from 'react';
import { ElementHeight } from '../lib/types';

// -- Shared / Utility Components --

const BaseSurface = ({ width, depth, color }: { width: number, depth: number, color: string }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[width, depth]} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

// -- Specific Block Renderers --

export const StreetSurface = ({ data }: { data: ElementHeight }) => {
  const { width, depth } = data;
  const stripLength = 1.0;
  const stripGap = 1.0;
  const stripCount = Math.floor(depth / (stripLength + stripGap));

  return (
    <group>
      {/* Asphalt Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#334155" roughness={0.6} /> {/* Slate 700 */}
      </mesh>

      {/* Surface Details (Lines) - Raised slightly above asphalt (y=0.02) */}
      <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        
        {/* Left Edge Line (White) */}
        <mesh position={[-width / 2 + 0.2, 0, 0]}>
           <planeGeometry args={[0.1, depth]} />
           <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Right Edge Line (White) */}
        <mesh position={[width / 2 - 0.2, 0, 0]}>
           <planeGeometry args={[0.1, depth]} />
           <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Dashed Line (Yellow or White - going White for standard contrast) */}
        {Array.from({ length: stripCount + 2 }).map((_, i) => {
           // Calculate z-position to center the strips along the depth
           const z = -depth / 2 + (i * (stripLength + stripGap));
           if (z > depth / 2) return null;
           
           return (
             <mesh key={i} position={[0, z, 0]}>
                <planeGeometry args={[0.15, stripLength]} />
                <meshBasicMaterial color="#ffffff" />
             </mesh>
           );
        })}
      </group>
    </group>
  );
};

export const HouseSurface = ({ data, showModel = true }: { data: ElementHeight; showModel?: boolean }) => {
  return (
    <group>
      {/* Dark Green Terrain Base */}
      <BaseSurface width={data.width} depth={data.depth} color={data.color} />
      
      {/* House Geometry - only render if showModel is true */}
      {showModel && (
        <group position={[0, 1, -1]}>
           {/* Main body */}
           <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[4, 2, 4]} />
              <meshStandardMaterial color="#fcd34d" />
           </mesh>
           {/* Roof - made bigger to cover corners */}
           <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[4.2, 1.5, 4]} />
              <meshStandardMaterial color="#c2410c" />
           </mesh>
           {/* Door */}
           <mesh position={[0, -0.5, 2.01]}>
               <planeGeometry args={[1, 1.5]} />
               <meshStandardMaterial color="#451a03" />
           </mesh>
           {/* Window */}
           <mesh position={[1.2, 0.2, 2.01]}>
               <planeGeometry args={[0.8, 0.8]} />
               <meshStandardMaterial color="#93c5fd" />
           </mesh>
        </group>
      )}
    </group>
  );
};

export const GarageSurface = ({ data, showModel = true }: { data: ElementHeight; showModel?: boolean }) => {
  return (
    <group>
      {/* Concrete floor */}
      <BaseSurface width={data.width} depth={data.depth} color="#94a3b8" />
      
      {/* Car Model - Rotated 90 degrees ("Vertical") and aligned with Z axis - only render if showModel is true */}
      {showModel && (
        <group position={[0, 0.4, 0]} rotation={[0, Math.PI / 2, 0]}>
           <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[3, 0.8, 1.8]} />
              <meshStandardMaterial color="#3b82f6" />
           </mesh>
           <mesh position={[-0.2, 0.7, 0]} castShadow>
              <boxGeometry args={[1.8, 0.6, 1.6]} />
              <meshStandardMaterial color="#93c5fd" />
           </mesh>
           {/* Wheels */}
           <mesh position={[1, -0.2, 1]} rotation={[Math.PI/2,0,0]}>
               <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[-1, -0.2, 1]} rotation={[Math.PI/2,0,0]}>
               <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[1, -0.2, -1]} rotation={[Math.PI/2,0,0]}>
               <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
           </mesh>
           <mesh position={[-1, -0.2, -1]} rotation={[Math.PI/2,0,0]}>
               <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
               <meshStandardMaterial color="#1e293b" />
           </mesh>
        </group>
      )}
    </group>
  );
};

export const GardenSurface = ({ data }: { data: ElementHeight }) => {
  return (
    <group>
      <BaseSurface width={data.width} depth={data.depth} color={data.color} />
      
      {/* Random vegetation */}
      <group position={[-1, 0, -2]}>
          <mesh position={[0, 0.5, 0]} castShadow>
              <dodecahedronGeometry args={[0.5]} />
              <meshStandardMaterial color="#15803d" />
          </mesh>
          <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.4]} />
              <meshStandardMaterial color="#78350f" />
          </mesh>
      </group>
      
      <group position={[1.2, 0, 3]}>
          <mesh position={[0, 0.4, 0]} castShadow>
              <dodecahedronGeometry args={[0.4]} />
              <meshStandardMaterial color="#166534" />
          </mesh>
          <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.3]} />
              <meshStandardMaterial color="#78350f" />
          </mesh>
      </group>

      {/* Stepping stones */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.4, 8]} />
         <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0.5, 0.01, 1.5]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.3, 8]} />
         <meshStandardMaterial color="#e5e7eb" />
      </mesh>
    </group>
  );
};

export const SidewalkSurface = ({ data }: { data: ElementHeight }) => {
    return (
        <group>
             <BaseSurface width={data.width} depth={data.depth} color={data.color} />
             {/* Simple visual texture via noise or grid if needed, keeping it clean dark gray for now */}
        </group>
    )
}

export const DefaultSurface = ({ data }: { data: ElementHeight }) => (
  <BaseSurface width={data.width} depth={data.depth} color={data.color} />
);

