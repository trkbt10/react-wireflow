/**
 * @file Three.js canvas that renders a rotating teapot preview.
 */
import * as React from "react";
import {
  AdditiveBlending,
  AmbientLight,
  Color,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Mesh,
  MeshPhysicalMaterial,
  NormalBlending,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";
import { DEFAULT_MATERIAL_CONFIG, type MaterialConfig } from "./materialConfig";
import { consumeResizeRequest, createResizeQueueState, requestResize } from "./resizeQueue";

/**
 * Encapsulated Three.js scene with rotating geometry.
 * Updates mesh color and scale reactively based on props.
 */
export type ThreeSceneCanvasProps = {
  color: string;
  scale: number;
  wireframe: boolean;
  materialConfig?: MaterialConfig;
  width?: number;
  height?: number;
};

type SceneRefs = {
  renderer: WebGLRenderer;
  mesh: Mesh;
  material: MeshPhysicalMaterial;
  camera: PerspectiveCamera;
  scene: Scene;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const TEAPOT_SIZE = 0.7;
const TEAPOT_SEGMENTS = 14;

const SCENE_BACKGROUND_BY_MODE: Record<MaterialConfig["mode"], number> = {
  standard: 0x0f172a,
  glass: 0x0b1a2d,
  hologram: 0x010617,
};

type MaterialAnimationState = {
  mode: MaterialConfig["mode"];
  baseOpacity: number;
  baseEmissiveIntensity: number;
  baseTransmission: number;
  pulseSpeed: number;
  pulseStrength: number;
};

const MATERIAL_ANIMATION_KEY = "__teapotAnimation";

const clampValue = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const setMaterialAnimationState = (material: MeshPhysicalMaterial, config: MaterialConfig) => {
  const animationState: MaterialAnimationState = {
    mode: config.mode,
    baseOpacity: config.opacity,
    baseEmissiveIntensity: config.emissiveIntensity,
    baseTransmission: config.transmission,
    pulseSpeed: config.pulseSpeed,
    pulseStrength: config.pulseStrength,
  };

  (material.userData as Record<string, unknown>)[MATERIAL_ANIMATION_KEY] = animationState;
};

const getMaterialAnimationState = (material: MeshPhysicalMaterial): MaterialAnimationState | undefined => {
  const entry = (material.userData as Record<string, unknown>)[MATERIAL_ANIMATION_KEY];
  if (!entry) {
    return undefined;
  }
  return entry as MaterialAnimationState;
};

const applyMaterialConfig = (material: MeshPhysicalMaterial, config: MaterialConfig) => {
  material.metalness = config.metalness;
  material.roughness = config.roughness;
  material.clearcoat = config.clearcoat;
  material.clearcoatRoughness = config.clearcoatRoughness;
  material.transmission = config.transmission;
  material.thickness = config.thickness;
  material.envMapIntensity = config.envMapIntensity;
  material.emissive.set(config.emissive);
  material.emissiveIntensity = config.emissiveIntensity;
  material.opacity = clampValue(config.opacity, 0.1, 1);
  material.transparent = material.opacity < 0.999 || config.mode !== "standard";
  material.blending = config.mode === "hologram" ? AdditiveBlending : NormalBlending;
  material.depthWrite = config.mode !== "hologram";
  material.side = config.mode === "standard" ? FrontSide : DoubleSide;
  material.toneMapped = true;

  setMaterialAnimationState(material, config);
  material.needsUpdate = true;
};

const animateMaterial = (material: MeshPhysicalMaterial, elapsedMs: number) => {
  const animationState = getMaterialAnimationState(material);
  if (!animationState) {
    return;
  }

  const { mode, pulseSpeed, pulseStrength, baseOpacity, baseEmissiveIntensity, baseTransmission } = animationState;

  if (pulseSpeed <= 0 || pulseStrength <= 0) {
    material.opacity = baseOpacity;
    material.emissiveIntensity = baseEmissiveIntensity;
    material.transmission = baseTransmission;
    return;
  }

  const pulse = (Math.sin(elapsedMs * pulseSpeed) + 1) * 0.5;

  if (mode === "hologram") {
    material.emissiveIntensity = baseEmissiveIntensity + pulse * pulseStrength;
    material.opacity = clampValue(baseOpacity + pulse * 0.35, 0.1, 1);
    material.transmission = clampValue(baseTransmission + pulse * 0.2, 0, 1);
    return;
  }

  if (mode === "glass") {
    const shimmer = pulse * pulseStrength * 0.18;
    material.transmission = clampValue(baseTransmission + shimmer, 0, 1);
    material.opacity = clampValue(baseOpacity + shimmer * 0.45, 0.1, 1);
    material.emissiveIntensity = clampValue(baseEmissiveIntensity + shimmer * 0.2, 0, 5);
    return;
  }

  material.opacity = baseOpacity;
  material.emissiveIntensity = baseEmissiveIntensity;
  material.transmission = baseTransmission;
};

export const ThreeSceneCanvas: React.FC<ThreeSceneCanvasProps> = ({
  color,
  scale,
  wireframe,
  materialConfig,
  width,
  height,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const sceneRef = React.useRef<SceneRefs | null>(null);
  const materialMode = materialConfig?.mode ?? "standard";
  const resizeQueueRef = React.useRef(createResizeQueueState());
  const appliedSizeRef = React.useRef<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color(0x0f172a);

    const camera = new PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 1.6, 4.5);
    camera.lookAt(new Vector3(0, 0, 0));

    const geometry = new TeapotGeometry(TEAPOT_SIZE, TEAPOT_SEGMENTS, true, true, true, false, true);
    geometry.center();
    const material = new MeshPhysicalMaterial({ color: new Color(color) });
    applyMaterialConfig(material, materialConfig ?? DEFAULT_MATERIAL_CONFIG);
    material.wireframe = wireframe;
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 4, 5);
    keyLight.lookAt(new Vector3(0, 0, 0));
    scene.add(keyLight);

    const fillLight = new DirectionalLight(0x60a5fa, 0.4);
    fillLight.position.set(-2.5, -1.5, -3.5);
    scene.add(fillLight);

    appliedSizeRef.current = { width: host.clientWidth, height: host.clientHeight };

    const renderScene = (time: number) => {
      mesh.rotation.y += 0.01;
      mesh.rotation.x += 0.005;
      animateMaterial(material, time);
      const applied = appliedSizeRef.current;
      if (applied) {
        const requested = consumeResizeRequest(resizeQueueRef.current, applied);
        if (requested) {
          const nextWidth = Math.max(requested.width, 1);
          const nextHeight = Math.max(requested.height, 1);
          renderer.setSize(nextWidth, nextHeight);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          appliedSizeRef.current = { width: nextWidth, height: nextHeight };
        }
      }
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(renderScene);
    };
    renderScene(0);

    const handleResize = () => {
      if (!sceneRef.current) {
        return;
      }
      const width = host.clientWidth;
      const height = host.clientHeight || 1;
      requestResize(resizeQueueRef.current, { width, height });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);
    window.addEventListener("resize", handleResize);

    sceneRef.current = { renderer, mesh, material, camera, scene };

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);

      renderer.dispose();
      geometry.dispose();
      material.dispose();

      host.removeChild(renderer.domElement);
      scene.clear();
      sceneRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    const { material } = sceneRef.current;
    try {
      const nextColor = new Color(color);
      material.color.copy(nextColor);
    } catch {
      material.color.set(0xffffff);
    }
    material.needsUpdate = true;
  }, [color]);

  React.useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    const { mesh } = sceneRef.current;
    const clampedScale = clampValue(scale, MIN_SCALE, MAX_SCALE);
    mesh.scale.set(clampedScale, clampedScale, clampedScale);
  }, [scale]);

  React.useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    const { material } = sceneRef.current;
    material.wireframe = wireframe;
    material.needsUpdate = true;
  }, [wireframe]);

  React.useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    applyMaterialConfig(sceneRef.current.material, materialConfig ?? DEFAULT_MATERIAL_CONFIG);
  }, [materialConfig]);

  React.useEffect(() => {
    if (!sceneRef.current || !containerRef.current) {
      return;
    }

    const effectiveWidth = width ?? containerRef.current.clientWidth;
    const effectiveHeight = height ?? (containerRef.current.clientHeight || 1);
    requestResize(resizeQueueRef.current, { width: effectiveWidth, height: effectiveHeight });
  }, [width, height]);

  React.useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    const { scene } = sceneRef.current;
    scene.background = new Color(SCENE_BACKGROUND_BY_MODE[materialMode]);
  }, [materialMode]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};
