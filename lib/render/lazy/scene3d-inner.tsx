"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars as DreiStars,
  Text as DreiText,
} from "@react-three/drei";
import type * as THREE from "three";

// =============================================================================
// 3D Helper Types & Components
// =============================================================================

type Vec3Tuple = [number, number, number];

interface Animation3D {
  rotate?: number[] | null;
}

interface Mesh3DProps {
  position?: number[] | null;
  rotation?: number[] | null;
  scale?: number[] | null;
  color?: string | null;
  args?: number[] | null;
  metalness?: number | null;
  roughness?: number | null;
  emissive?: string | null;
  emissiveIntensity?: number | null;
  wireframe?: boolean | null;
  opacity?: number | null;
  animation?: Animation3D | null;
}

export function toVec3(v: number[] | null | undefined): Vec3Tuple | undefined {
  if (!v || v.length < 3) return undefined;
  return v.slice(0, 3) as Vec3Tuple;
}

function toGeoArgs<T extends unknown[]>(
  v: number[] | null | undefined,
  fallback: T,
): T {
  if (!v || v.length === 0) return fallback;
  return v as unknown as T;
}

/** Shared hook for continuous rotation animation */
export function useRotationAnimation(
  ref: React.RefObject<THREE.Object3D | null>,
  animation?: Animation3D | null,
) {
  useFrame(() => {
    if (!ref.current || !animation?.rotate) return;
    const [rx, ry, rz] = animation.rotate;
    ref.current.rotation.x += rx ?? 0;
    ref.current.rotation.y += ry ?? 0;
    ref.current.rotation.z += rz ?? 0;
  });
}

/** Standard material props shared by all mesh primitives */
function StandardMaterial({
  color,
  metalness,
  roughness,
  emissive,
  emissiveIntensity,
  wireframe,
  opacity,
}: Mesh3DProps) {
  return (
    <meshStandardMaterial
      color={color ?? "#cccccc"}
      metalness={metalness ?? 0.1}
      roughness={roughness ?? 0.8}
      emissive={emissive ?? undefined}
      emissiveIntensity={emissiveIntensity ?? 1}
      wireframe={wireframe ?? false}
      transparent={opacity != null && opacity < 1}
      opacity={opacity ?? 1}
    />
  );
}

/** Generic mesh wrapper for all geometry primitives */
function MeshPrimitive({
  meshProps,
  children,
  onClick,
}: {
  meshProps: Mesh3DProps;
  children: ReactNode;
  onClick?: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useRotationAnimation(ref, meshProps.animation);
  return (
    <mesh
      ref={ref}
      position={toVec3(meshProps.position)}
      rotation={toVec3(meshProps.rotation)}
      scale={toVec3(meshProps.scale)}
      onClick={onClick}
    >
      {children}
      <StandardMaterial {...meshProps} />
    </mesh>
  );
}

/** Animated group wrapper */
function AnimatedGroup({
  position,
  rotation,
  scale,
  animation,
  children,
}: {
  position?: number[] | null;
  rotation?: number[] | null;
  scale?: number[] | null;
  animation?: Animation3D | null;
  children?: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useRotationAnimation(ref, animation);
  return (
    <group
      ref={ref}
      position={toVec3(position)}
      rotation={toVec3(rotation)}
      scale={toVec3(scale)}
    >
      {children}
    </group>
  );
}

// =============================================================================
// Exported 3D Components
// =============================================================================

export function Scene3DInner({
  height,
  background,
  cameraPosition,
  cameraFov,
  autoRotate,
  children,
}: {
  height?: string | null;
  background?: string | null;
  cameraPosition?: number[] | null;
  cameraFov?: number | null;
  autoRotate?: boolean | null;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        height: height ?? "400px",
        width: "100%",
        background: background ?? "#111111",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{
          position: toVec3(cameraPosition) ?? [0, 10, 30],
          fov: cameraFov ?? 50,
        }}
      >
        <OrbitControls
          autoRotate={autoRotate ?? false}
          enablePan
          enableZoom
        />
        {children}
      </Canvas>
    </div>
  );
}

export function Group3DInner({
  position,
  rotation,
  scale,
  animation,
  children,
}: {
  position?: number[] | null;
  rotation?: number[] | null;
  scale?: number[] | null;
  animation?: Record<string, unknown> | null;
  children?: ReactNode;
}) {
  return (
    <AnimatedGroup
      position={position}
      rotation={rotation}
      scale={scale}
      animation={animation}
    >
      {children}
    </AnimatedGroup>
  );
}

export function BoxInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <boxGeometry args={toGeoArgs<[number, number, number]>(props.args, [1, 1, 1])} />
    </MeshPrimitive>
  );
}

export function SphereInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <sphereGeometry args={toGeoArgs<[number, number, number]>(props.args, [1, 32, 32])} />
    </MeshPrimitive>
  );
}

export function CylinderInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <cylinderGeometry args={toGeoArgs<[number, number, number, number]>(props.args, [1, 1, 2, 32])} />
    </MeshPrimitive>
  );
}

export function ConeInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <coneGeometry args={toGeoArgs<[number, number, number]>(props.args, [1, 2, 32])} />
    </MeshPrimitive>
  );
}

export function TorusInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <torusGeometry args={toGeoArgs<[number, number, number, number]>(props.args, [1, 0.4, 16, 100])} />
    </MeshPrimitive>
  );
}

export function PlaneInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <planeGeometry args={toGeoArgs<[number, number]>(props.args, [10, 10])} />
    </MeshPrimitive>
  );
}

export function RingInner({ props, onClick }: { props: Mesh3DProps; onClick?: () => void }) {
  return (
    <MeshPrimitive meshProps={props} onClick={onClick}>
      <ringGeometry args={toGeoArgs<[number, number, number]>(props.args, [0.5, 1, 64])} />
    </MeshPrimitive>
  );
}

export function AmbientLightInner({ color, intensity }: { color?: string | null; intensity?: number | null }) {
  return <ambientLight color={color ?? undefined} intensity={intensity ?? 0.5} />;
}

export function PointLightInner({ position, color, intensity, distance }: { position?: number[] | null; color?: string | null; intensity?: number | null; distance?: number | null }) {
  return <pointLight position={toVec3(position)} color={color ?? undefined} intensity={intensity ?? 1} distance={distance ?? 0} />;
}

export function DirectionalLightInner({ position, color, intensity }: { position?: number[] | null; color?: string | null; intensity?: number | null }) {
  return <directionalLight position={toVec3(position)} color={color ?? undefined} intensity={intensity ?? 1} />;
}

export function StarsInner({ radius, depth, count, factor, fade, speed }: { radius?: number | null; depth?: number | null; count?: number | null; factor?: number | null; fade?: boolean | null; speed?: number | null }) {
  return <DreiStars radius={radius ?? 100} depth={depth ?? 50} count={count ?? 5000} factor={factor ?? 4} fade={fade ?? true} speed={speed ?? 1} />;
}

export function Label3DInner({ position, rotation, color, fontSize, anchorX, anchorY, text }: { position?: number[] | null; rotation?: number[] | null; color?: string | null; fontSize?: number | null; anchorX?: string | null; anchorY?: string | null; text?: string | null }) {
  return (
    <DreiText
      position={toVec3(position)}
      rotation={toVec3(rotation)}
      color={color ?? "#ffffff"}
      fontSize={fontSize ?? 1}
      anchorX={(anchorX ?? "center") as any}
      anchorY={(anchorY ?? "middle") as any}
    >
      {text}
    </DreiText>
  );
}
