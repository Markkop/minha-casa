import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ElementHeight, ConnectionType } from '../lib/types';
import { LEVEL_BLOCKS } from '../lib/constants';
import { 
  StreetSurface, 
  HouseSurface, 
  GarageSurface, 
  GardenSurface, 
  SidewalkSurface,
  DefaultSurface 
} from './BlockRenderers';

interface WorldProps {
  waterLevel: number;
  edgeStates: Record<number, ConnectionType>;
  onToggleEdge: (index: number) => void;
  customBlocks?: ElementHeight[];
}

const Block = ({ data, showCar, showHouse }: { data: ElementHeight; showCar?: boolean; showHouse?: boolean }) => {
  
  // Factory to choose renderer based on ID
  const renderSurface = () => {
    switch (data.id) {
      case 'rua':
        return <StreetSurface data={data} />;
      case 'casa':
        return <HouseSurface data={data} showModel={showHouse} />;
      case 'garagem':
        return <GarageSurface data={data} showModel={showCar} />;
      case 'quintal':
        return <GardenSurface data={data} />;
      case 'calcada':
        return <SidewalkSurface data={data} />;
      default:
        return <DefaultSurface data={data} />;
    }
  };

  return (
    <group position={[data.x_pos, data.height_rel_creek / 2, 0]}>
      {/* Main visual block volume (Soil/Base) */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[data.width, data.height_rel_creek, data.depth]} />
        <meshStandardMaterial color={data.color} roughness={0.8} />
      </mesh>
      
      {/* Modular Surface on top */}
      <group position={[0, data.height_rel_creek / 2 + 0.01, 0]}>
        {renderSurface()}
      </group>

      {/* Label */}
      <Text
        position={[0, data.height_rel_creek / 2 + 3.0, 0]}
        fontSize={0.4}
        color="black"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="white"
      >
        {data.name}
        {'\n'}
        {data.height_rel_creek.toFixed(2)}m
      </Text>
    </group>
  );
};

const SolidConnector = ({ 
  from, 
  to, 
  type,
  onToggle
}: { 
  from: ElementHeight, 
  to: ElementHeight, 
  type: ConnectionType,
  onToggle: () => void
}) => {
  const [hovered, setHovered] = useState(false);

  // Calculate gap and positions
  const gap = to.x_pos - from.x_pos - (from.width / 2) - (to.width / 2);
  const centerX = from.x_pos + (from.width / 2) + (gap / 2);
  
  // Height Logic
  const h1 = from.height_rel_creek;
  const h2 = to.height_rel_creek;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const halfGap = gap / 2;
    
    // Start bottom left (base)
    s.moveTo(-halfGap, 0);
    
    // Up to "from" height
    s.lineTo(-halfGap, h1);
    
    if (type === ConnectionType.RAMP) {
      // RAMP: Direct slope to h2
      s.lineTo(halfGap, h2);
    } else {
      // STEP: Horizontal extension then vertical drop/rise
      // We extend the "from" level halfway, then go to "to" level
      // Actually, standard step usually extends the top level out or has a clean cut.
      // To look like a "Degrau" (Step), we extend the 'from' height to the edge of 'to' 
      // if h1 > h2, or we extend 'from' horizontally then go up if h1 < h2?
      // Simple cliff logic: Just extend 'from' height to the edge.
      s.lineTo(halfGap, h1);
      s.lineTo(halfGap, h2);
    }
    
    // Down to bottom right (base)
    s.lineTo(halfGap, 0);
    // Close at bottom left
    s.lineTo(-halfGap, 0);
    
    return s;
  }, [gap, h1, h2, type]);

  if (gap <= 0.05) return null;

  // Color logic: Use the 'from' block color to make it look like an extension, 
  // but lighten it slightly on hover
  const baseColor = new THREE.Color(from.color);
  const displayColor = hovered ? baseColor.clone().offsetHSL(0, 0, 0.1) : baseColor;

  return (
    <group position={[centerX, 0, 0]}>
       <mesh 
        position={[0, 0, -from.depth/2]} 
        receiveShadow 
        castShadow
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onToggle(); }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
       >
          <extrudeGeometry args={[shape, { depth: from.depth, bevelEnabled: false }]} />
          <meshStandardMaterial color={displayColor} roughness={0.8} />
       </mesh>
       
       {/* Hint text on hover */}
       {hovered && (
         <Text
            position={[0, Math.max(h1, h2) + 0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.05}
            outlineColor="#000"
         >
           {type === ConnectionType.RAMP ? 'RAMPA' : 'DEGRAU'}
           {'\n'}(Clique para alterar)
         </Text>
       )}
    </group>
  );
};

const SkyGradient = () => {
  const { scene } = useThree();
  
  React.useEffect(() => {
    // Create a sky gradient using a large sphere
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    // Create gradient shader material
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87CEEB) }, // Sky blue
        bottomColor: { value: new THREE.Color(0xE0F6FF) }, // Light blue/white
        offset: { value: 0.0 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
    
    return () => {
      scene.remove(sky);
      skyGeometry.dispose();
      skyMaterial.dispose();
    };
  }, [scene]);
  
  return null;
};

const Water = ({ level }: { level: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
       meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, level, 0.05);
       if (meshRef.current.position.y < 0.1) meshRef.current.position.y = 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[15, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        color="#00D9FF"
        transparent
        opacity={0.4}
        roughness={0.1}
        metalness={0.05}
      />
    </mesh>
  );
};

export const World: React.FC<WorldProps> = ({ waterLevel, edgeStates, onToggleEdge, customBlocks }) => {
  // Use custom blocks if provided, otherwise use default LEVEL_BLOCKS
  const blocksToRender = customBlocks || LEVEL_BLOCKS;
  
  // Reference values for visibility thresholds
  const GARAGE_REFERENCE_HEIGHT = 2.40;
  const CASA_REFERENCE_HEIGHT = 2.70;
  
  // Calculate visibility flags for car and house
  const garageBlock = blocksToRender.find(b => b.id === 'garagem');
  const casaBlock = blocksToRender.find(b => b.id === 'casa');
  const showCar = garageBlock ? garageBlock.height_rel_creek >= GARAGE_REFERENCE_HEIGHT : true;
  const showHouse = casaBlock ? casaBlock.height_rel_creek >= CASA_REFERENCE_HEIGHT : true;

  return (
    <group>
      <SkyGradient />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[-10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />

      {blocksToRender.map((block, index) => {
        const nextBlock = blocksToRender[index + 1];
        
        return (
          <React.Fragment key={block.id}>
            {/* Render Block */}
            <Block 
              data={block} 
              showCar={block.id === 'garagem' ? showCar : undefined}
              showHouse={block.id === 'casa' ? showHouse : undefined}
            />

            {/* Render Connector to next block if exists */}
            {nextBlock && (
              <SolidConnector 
                from={block}
                to={nextBlock}
                type={edgeStates[index] || ConnectionType.STEP}
                onToggle={() => onToggleEdge(index)}
              />
            )}
          </React.Fragment>
        );
      })}

      <Water level={waterLevel} />

      {/* Deep Ground floor for infinity */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#1c1917" />
      </mesh>
    </group>
  );
};

