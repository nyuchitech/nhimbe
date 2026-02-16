"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { brandColors } from "@/lib/themes";

interface GradientBackgroundProps {
  theme?: "light" | "dark";
  intensity?: number;
  speed?: number;
}

export function GradientBackground({
  theme = "dark",
  intensity = 0.15,
  speed = 0.3,
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

    const colors = brandColors[theme];
    const primaryColor = new THREE.Color(colors.primary);
    const secondaryColor = new THREE.Color(colors.secondary);
    const bgColor = new THREE.Color(colors.background);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Contour lines shader - subtle flowing lines
    const fragmentShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uBgColor;
      uniform vec2 uResolution;

      varying vec2 vUv;

      // Simplex noise
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

        float t = uTime * 0.1;

        // Create flowing contour field
        float noise1 = snoise(uv * 0.8 + vec2(t * 0.2, t * 0.15));
        float noise2 = snoise(uv * 1.2 + vec2(-t * 0.15, t * 0.1));
        float field = (noise1 + noise2 * 0.5) / 1.5;

        // Create contour lines
        float contourFreq = 8.0;
        float contourValue = fract(field * contourFreq);

        // Smooth contour lines
        float lineWidth = 0.08;
        float line = smoothstep(0.0, lineWidth, contourValue) * smoothstep(lineWidth * 2.0, lineWidth, contourValue);

        // Secondary contour lines (offset)
        float contourValue2 = fract((field + 0.5) * contourFreq);
        float line2 = smoothstep(0.0, lineWidth * 0.5, contourValue2) * smoothstep(lineWidth, lineWidth * 0.5, contourValue2);

        // Combine lines with different opacities
        float primaryLine = line * 0.6;
        float secondaryLine = line2 * 0.3;

        // Color mixing
        vec3 color = uBgColor;
        color = mix(color, uPrimaryColor, primaryLine * uIntensity);
        color = mix(color, uSecondaryColor, secondaryLine * uIntensity * 0.5);

        // Add subtle gradient glow in corners
        float glow = smoothstep(1.5, 0.0, length(uv - vec2(0.2, 0.8))) * 0.15;
        glow += smoothstep(1.5, 0.0, length(uv - vec2(aspectRatio * 0.8, 0.2))) * 0.1;
        color = mix(color, uPrimaryColor, glow * uIntensity);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uPrimaryColor: { value: primaryColor },
        uSecondaryColor: { value: secondaryColor },
        uBgColor: { value: bgColor },
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
  const colors = brandColors[theme];
  const gradient =
    theme === "dark"
      ? `radial-gradient(ellipse at 20% 80%, ${colors.primary}15 0%, transparent 50%),
         radial-gradient(ellipse at 80% 20%, ${colors.secondary}10 0%, transparent 50%),
         linear-gradient(135deg, #0A0A0A 0%, #0F0F0F 100%)`
      : `radial-gradient(ellipse at 20% 80%, ${colors.primary}10 0%, transparent 50%),
         radial-gradient(ellipse at 80% 20%, ${colors.secondary}08 0%, transparent 50%),
         linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)`;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: gradient }}
      aria-hidden="true"
    />
  );
}
