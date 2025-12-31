"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Five African Minerals color palette
const COLORS = {
  light: {
    malachite: "#004D40", // Primary - Teal
    amethyst: "#4B0082", // Secondary - Deep Purple
    amber: "#5D4037", // Accent - Warm Brown
    gold: "#8B4513", // Complementary
    jade: "#00796B", // Secondary teal
  },
  dark: {
    malachite: "#64FFDA", // Primary - Bright Teal
    amethyst: "#B388FF", // Secondary - Light Purple
    amber: "#FFD740", // Accent - Gold
    gold: "#FF6B6B", // Complementary - Coral
    jade: "#00BFA5", // Secondary teal
  },
};

interface GradientBackgroundProps {
  theme?: "light" | "dark";
  intensity?: number;
  speed?: number;
}

export function GradientBackground({
  theme = "dark",
  intensity = 0.4,
  speed = 0.5,
}: GradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Shader material for gradient animation
    const colors = COLORS[theme];
    const colorArray = Object.values(colors).map((c) => new THREE.Color(c));

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform vec3 uColor4;
      uniform vec3 uColor5;
      uniform vec2 uResolution;

      varying vec2 vUv;

      // Simplex noise functions
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        float aspectRatio = uResolution.x / uResolution.y;
        uv.x *= aspectRatio;

        // Create flowing noise patterns
        float t = uTime * 0.15;
        float noise1 = snoise(uv * 1.5 + vec2(t * 0.5, t * 0.3));
        float noise2 = snoise(uv * 2.0 + vec2(-t * 0.4, t * 0.6));
        float noise3 = snoise(uv * 0.8 + vec2(t * 0.3, -t * 0.5));

        // Combine noises for smooth transitions
        float n = (noise1 + noise2 * 0.5 + noise3 * 0.3) / 1.8;
        n = n * 0.5 + 0.5; // Normalize to 0-1

        // Create color gradient based on noise
        vec3 color;
        if (n < 0.2) {
          color = mix(uColor1, uColor2, n / 0.2);
        } else if (n < 0.4) {
          color = mix(uColor2, uColor3, (n - 0.2) / 0.2);
        } else if (n < 0.6) {
          color = mix(uColor3, uColor4, (n - 0.4) / 0.2);
        } else if (n < 0.8) {
          color = mix(uColor4, uColor5, (n - 0.6) / 0.2);
        } else {
          color = mix(uColor5, uColor1, (n - 0.8) / 0.2);
        }

        // Add blur effect through subtle noise overlay
        float blur = snoise(uv * 10.0 + t) * 0.02;
        color += blur;

        // Apply intensity
        color = mix(vec3(${theme === "dark" ? "0.04, 0.04, 0.04" : "1.0, 1.0, 1.0"}), color, uIntensity);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uColor1: { value: colorArray[0] },
        uColor2: { value: colorArray[1] },
        uColor3: { value: colorArray[2] },
        uColor4: { value: colorArray[3] },
        uColor5: { value: colorArray[4] },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
    });

    // Create full-screen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    const startTime = Date.now();
    const animate = () => {
      material.uniforms.uTime.value = ((Date.now() - startTime) / 1000) * speed;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      renderer.setSize(newWidth, newHeight);
      material.uniforms.uResolution.value.set(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, intensity, speed]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}

// Static gradient fallback for SSR
export function StaticGradientBackground({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const colors = COLORS[theme];
  const gradient =
    theme === "dark"
      ? `radial-gradient(ellipse at 20% 30%, ${colors.malachite}30 0%, transparent 50%),
         radial-gradient(ellipse at 80% 20%, ${colors.amethyst}25 0%, transparent 50%),
         radial-gradient(ellipse at 60% 80%, ${colors.amber}20 0%, transparent 50%),
         radial-gradient(ellipse at 10% 70%, ${colors.jade}15 0%, transparent 50%),
         linear-gradient(135deg, #0A0A0A 0%, #111111 100%)`
      : `radial-gradient(ellipse at 20% 30%, ${colors.malachite}20 0%, transparent 50%),
         radial-gradient(ellipse at 80% 20%, ${colors.amethyst}15 0%, transparent 50%),
         radial-gradient(ellipse at 60% 80%, ${colors.amber}10 0%, transparent 50%),
         radial-gradient(ellipse at 10% 70%, ${colors.jade}10 0%, transparent 50%),
         linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)`;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: gradient }}
      aria-hidden="true"
    />
  );
}
