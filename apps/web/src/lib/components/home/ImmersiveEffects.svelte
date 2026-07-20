<script lang="ts">
  import { onMount } from "svelte";
  import * as THREE from "three";

  let bgCanvas = $state<HTMLCanvasElement | null>(null);
  let fxCanvas = $state<HTMLCanvasElement | null>(null);

  type BeamUniforms = {
    uTime: { value: number };
    uColorA: { value: THREE.Color };
    uColorB: { value: THREE.Color };
    uOpacity: { value: number };
    uSpeed: { value: number };
    uPhase: { value: number };
  };

  type BeamLink = {
    source: HTMLElement;
    target?: HTMLElement;
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial & { uniforms: BeamUniforms };
    opacity: number;
    landFraction?: number;
    lastStartX: number;
    lastStartY: number;
    lastEndX: number;
    lastEndY: number;
  };

  const ENDPOINT_EPS = 0.1;

  onMount(() => {
    if (!bgCanvas || !fxCanvas) return;
    const home = bgCanvas.closest<HTMLElement>(".immersive-home");
    if (!home) return;

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;
    const documentHeight = () => Math.max(home.scrollHeight, document.documentElement.scrollHeight);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = Math.min(width(), height()) < 700;
    const hardwareThreads = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const constrainedDevice = hardwareThreads <= 4 || (deviceMemory !== undefined && deviceMemory <= 4);
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      reduceMotion || smallScreen || constrainedDevice ? 1 : 1.25
    );
    const targetParticlesPerViewport = reduceMotion
      ? 200
      : smallScreen
        ? 400
        : constrainedDevice
          ? 600
          : 800;
    const targetFrameRate = constrainedDevice ? 30 : 60;
    const disposables: Array<{ dispose: () => void }> = [];
    const timers: number[] = [];
    let frame = 0;
    let resizeTimer = 0;
    let stopped = false;

    function radialSprite() {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      if (!context) return new THREE.Texture();
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.25, "#bffcff");
      gradient.addColorStop(1, "rgba(34,211,238,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function beamMaterial() {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(0x67e8f9) },
          uColorB: { value: new THREE.Color(0x3b82f6) },
          uOpacity: { value: 0 },
          uSpeed: { value: 0.5 },
          uPhase: { value: 0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime, uOpacity, uSpeed, uPhase;
          uniform vec3 uColorA, uColorB;
          void main() {
            float t = vUv.x;
            vec3 base = mix(uColorA, uColorB, t);
            float edge = smoothstep(1.0, 0.0, abs(vUv.y - 0.5) * 2.0);
            float body = smoothstep(0.0, 0.34, edge);
            float glow = pow(edge, 0.7);
            vec3 cableColor = base * 0.72 + vec3(0.02, 0.05, 0.09);
            const float LEAD = 0.18;
            const float TRAIL = 0.55;
            float cycle = fract(uTime * uSpeed * 0.16 + uPhase);
            float position = cycle * (1.0 + LEAD + TRAIL) - LEAD;
            float distanceToHead = t - position;
            float bright = exp(-pow(distanceToHead * 9.0, 2.0));
            float tail = exp(min(distanceToHead, 0.0) * 6.0) * step(distanceToHead, 0.0) * 0.6;
            float pulse = clamp(bright + tail, 0.0, 1.0);
            vec3 signalColor = mix(vec3(0.75, 0.92, 1.0), vec3(1.0), 0.25);
            vec3 color = cableColor + base * glow * 0.18;
            color = mix(color, signalColor, pulse * 0.95);
            float alpha = uOpacity * clamp(body + glow * 0.12 + pulse * 0.35, 0.0, 1.0);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending
      }) as THREE.ShaderMaterial & { uniforms: BeamUniforms };
    }

    try {
      const sprite = radialSprite();
      disposables.push(sprite);

      const bgRenderer = new THREE.WebGLRenderer({
        canvas: bgCanvas,
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: "high-performance"
      });
      bgRenderer.setPixelRatio(pixelRatio);
      bgRenderer.setClearColor(0x03060f, 0);
      disposables.push(bgRenderer);

      const bgScene = new THREE.Scene();
      bgScene.fog = new THREE.FogExp2(0x03060f, 0.00085);
      const bgCamera = new THREE.PerspectiveCamera(60, width() / height(), 1, 3000);
      bgCamera.position.set(0, 0, 620);

      const backgroundDistance = 620;
      const backgroundFov = 60;
      const backgroundParallax = 0.12;
      const worldHeight = () =>
        2 * backgroundDistance * Math.tan(((backgroundFov * Math.PI) / 180) / 2);
      const unitsPerPixel = () => worldHeight() / height();
      let fieldUnitsPerPixel = unitsPerPixel();

      const maxParticles = reduceMotion ? 500 : smallScreen ? 900 : constrainedDevice ? 1200 : 1800;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(maxParticles * 3);
      const colors = new Float32Array(maxParticles * 3);
      const sizes = new Float32Array(maxParticles);
      const cyan = new THREE.Color(0x22d3ee);
      const blue = new THREE.Color(0x3b82f6);
      const ice = new THREE.Color(0xbfe8ff);
      for (let index = 0; index < maxParticles; index += 1) {
        const random = Math.random();
        const color = random < 0.5 ? cyan : random < 0.85 ? blue : ice;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
        sizes[index] = Math.random() * 3 + 2.3;
      }
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      disposables.push(particleGeometry);

      let builtSpan = -1;
      function rebuildField() {
        fieldUnitsPerPixel = unitsPerPixel();
        const halfView = worldHeight() / 2;
        const scrollWorld = (Math.max(documentHeight(), height()) - height()) * fieldUnitsPerPixel * backgroundParallax;
        const top = halfView + 220;
        const bottom = -scrollWorld - halfView - 220;
        const span = top - bottom;
        if (builtSpan > 0 && Math.abs(span - builtSpan) < worldHeight() * 0.5) return;
        builtSpan = span;
        const count = Math.max(
          targetParticlesPerViewport,
          Math.min(
            maxParticles,
            Math.round(targetParticlesPerViewport * (span / worldHeight()))
          )
        );
        for (let index = 0; index < count; index += 1) {
          positions[index * 3] = (Math.random() - 0.5) * 3000;
          positions[index * 3 + 1] = bottom + Math.random() * span;
          positions[index * 3 + 2] = 0;
        }
        const attribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
        attribute.needsUpdate = true;
        particleGeometry.setDrawRange(0, count);
      }

      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTex: { value: sprite },
          uPix: { value: pixelRatio }
        },
        vertexShader: `
          attribute float aSize;
          varying vec3 vColor;
          uniform float uTime, uPix;
          void main() {
            vColor = color;
            vec3 p = position;
            p.x += sin(uTime * 0.28 + position.y * 0.012) * 9.0;
            p.y += cos(uTime * 0.22 + position.x * 0.012) * 8.0;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float twinkle = 0.75 + 0.25 * sin(uTime * 1.4 + position.x * 0.7 + position.y * 0.3);
            gl_PointSize = aSize * uPix * (640.0 / -mv.z) * twinkle;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform sampler2D uTex;
          void main() {
            vec4 textureColor = texture2D(uTex, gl_PointCoord);
            if (textureColor.a < 0.02) discard;
            vec3 luminousColor = mix(vColor, vec3(1.0), 0.22);
            gl_FragColor = vec4(luminousColor, textureColor.a * 0.94);
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });
      disposables.push(particleMaterial);
      bgScene.add(new THREE.Points(particleGeometry, particleMaterial));

      let fxWidth = width();
      let fxHeight = height();
      const fxPixelRatio = 1;
      const connectionsEnabled = !smallScreen && !reduceMotion;
      const fxRenderer = connectionsEnabled
        ? new THREE.WebGLRenderer({
            canvas: fxCanvas,
            antialias: true,
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: "high-performance"
          })
        : null;
      if (fxRenderer) {
        fxRenderer.setPixelRatio(fxPixelRatio);
        fxRenderer.setClearColor(0x000000, 0);
        disposables.push(fxRenderer);
      } else {
        fxCanvas.style.display = "none";
      }
      const fxScene = new THREE.Scene();
      // Fixed to the viewport — never pan with scroll (chords use getBoundingClientRect coords).
      const fxCamera = new THREE.OrthographicCamera(
        -fxWidth / 2,
        fxWidth / 2,
        fxHeight / 2,
        -fxHeight / 2,
        -1000,
        1000
      );
      fxCamera.position.z = 10;

      const landingFractions = [0.3, 0.14, 0.86, 0.7];
      const listPanel = home.querySelector<HTMLElement>("[data-home-list-panel]");
      const links: BeamLink[] = [];

      if (connectionsEnabled) home.querySelectorAll<HTMLElement>("[data-home-card-id]").forEach((card, index) => {
        const port = card.querySelector<HTMLElement>("[data-home-port]");
        if (!port || !listPanel) return;
        const material = beamMaterial();
        material.uniforms.uSpeed.value = 0.9 + Math.random() * 0.5;
        material.uniforms.uPhase.value = Math.random();
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        mesh.frustumCulled = false;
        fxScene.add(mesh);
        links.push({
          source: port,
          target: listPanel,
          mesh,
          material,
          opacity: 0,
          landFraction: landingFractions[index % landingFractions.length],
          lastStartX: Number.NaN,
          lastStartY: Number.NaN,
          lastEndX: Number.NaN,
          lastEndY: Number.NaN
        });
      });

      if (connectionsEnabled) home.querySelectorAll<HTMLElement>("[data-home-flow-port]").forEach((port) => {
        const flowId = port.dataset.homeFlowPort;
        const dock = flowId
          ? home.querySelector<HTMLElement>(`[data-home-flow-dock="${flowId}"]`)
          : null;
        if (!dock) return;
        const material = beamMaterial();
        material.uniforms.uSpeed.value = 0.9 + Math.random() * 0.5;
        material.uniforms.uPhase.value = Math.random();
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
        mesh.frustumCulled = false;
        fxScene.add(mesh);
        links.push({
          source: port,
          target: dock,
          mesh,
          material,
          opacity: 0,
          lastStartX: Number.NaN,
          lastStartY: Number.NaN,
          lastEndX: Number.NaN,
          lastEndY: Number.NaN
        });
      });

      for (const link of links) {
        disposables.push(link.mesh.geometry, link.material);
      }

      function worldPoint(x: number, y: number) {
        return new THREE.Vector3(x - fxWidth / 2, fxHeight / 2 - y, 0);
      }

      /** Viewport-space center from getBoundingClientRect (no scrollX/scrollY). */
      function elementCenter(element: HTMLElement) {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }

      let cordsMinY = 0;
      let cordsMaxY = 0;
      function relayoutLinks() {
        if (width() <= 720) {
          for (const link of links) link.mesh.visible = false;
          cordsMinY = Number.POSITIVE_INFINITY;
          cordsMaxY = Number.NEGATIVE_INFINITY;
          return;
        }

        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const link of links) {
          if (!link.target) continue;
          link.mesh.visible = true;
          const start = elementCenter(link.source);
          let end = elementCenter(link.target);
          if (link.landFraction !== undefined) {
            const rect = link.target.getBoundingClientRect();
            end = {
              x: rect.left + rect.width * link.landFraction,
              y: rect.top
            };
          }
          minY = Math.min(minY, start.y, end.y);
          maxY = Math.max(maxY, start.y, end.y);

          const moved =
            Number.isNaN(link.lastStartX) ||
            Math.abs(start.x - link.lastStartX) > ENDPOINT_EPS ||
            Math.abs(start.y - link.lastStartY) > ENDPOINT_EPS ||
            Math.abs(end.x - link.lastEndX) > ENDPOINT_EPS ||
            Math.abs(end.y - link.lastEndY) > ENDPOINT_EPS;
          if (!moved) continue;

          link.lastStartX = start.x;
          link.lastStartY = start.y;
          link.lastEndX = end.x;
          link.lastEndY = end.y;

          const deltaX = end.x - start.x;
          const deltaY = end.y - start.y;
          const controlOne =
            link.landFraction !== undefined
              ? {
                  x: start.x + deltaX * 0.05,
                  y: start.y + Math.max(70, Math.abs(deltaY) * 0.4)
                }
              : {
                  x: start.x,
                  y: start.y + Math.max(90, Math.abs(deltaY) * 0.45)
                };
          const controlTwo = {
            x: end.x,
            y:
              end.y -
              (link.landFraction !== undefined
                ? Math.min(180, Math.max(60, Math.abs(deltaY) * 0.35))
                : Math.min(240, Math.max(90, Math.abs(deltaY) * 0.4)))
          };
          const curve = new THREE.CubicBezierCurve3(
            worldPoint(start.x, start.y),
            worldPoint(controlOne.x, controlOne.y),
            worldPoint(controlTwo.x, controlTwo.y),
            worldPoint(end.x, end.y)
          );
          link.mesh.geometry.dispose();
          link.mesh.geometry = new THREE.TubeGeometry(curve, 56, 3.2, 5, false);
        }
        cordsMinY = minY;
        cordsMaxY = maxY;
      }

      function resize() {
        if (stopped) return;
        const viewportWidth = width();
        const viewportHeight = height();
        bgRenderer.setPixelRatio(pixelRatio);
        bgRenderer.setSize(viewportWidth, viewportHeight);
        bgCamera.aspect = viewportWidth / viewportHeight;
        bgCamera.updateProjectionMatrix();
        fxWidth = viewportWidth;
        fxHeight = viewportHeight;
        fxRenderer?.setPixelRatio(fxPixelRatio);
        fxRenderer?.setSize(viewportWidth, viewportHeight);
        fxCamera.left = -fxWidth / 2;
        fxCamera.right = fxWidth / 2;
        fxCamera.top = fxHeight / 2;
        fxCamera.bottom = -fxHeight / 2;
        fxCamera.updateProjectionMatrix();
        // Force geometry rebuild after size change (worldPoint depends on fxWidth/fxHeight).
        for (const link of links) {
          link.lastStartX = Number.NaN;
        }
        rebuildField();
        relayoutLinks();
        if (reduceMotion) {
          particleMaterial.uniforms.uTime.value = 0;
          bgCamera.position.y = 0;
          bgRenderer.render(bgScene, bgCamera);
          renderFxFrame(0, false);
        }
      }

      function scheduleResize() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 120);
      }

      const observer = new ResizeObserver(scheduleResize);
      observer.observe(home);
      window.addEventListener("resize", scheduleResize, { passive: true });
      window.addEventListener("load", resize);
      timers.push(window.setTimeout(resize, 400), window.setTimeout(resize, 1500));

      const clock = new THREE.Clock();
      const frameInterval = 1000 / targetFrameRate;
      let lastFrameTime = 0;
      let fxHasVisibleFrame = false;
      function renderFxFrame(time: number, animated: boolean) {
        if (!fxRenderer) return;
        relayoutLinks();
        // cordsMinY/cordsMaxY are viewport Y from getBoundingClientRect.
        if (cordsMaxY > -240 && cordsMinY < height() + 240) {
          for (const link of links) {
            link.opacity = animated ? link.opacity + (1 - link.opacity) * 0.06 : 1;
            link.material.uniforms.uOpacity.value = link.opacity;
            link.material.uniforms.uTime.value = time;
          }
          fxRenderer.render(fxScene, fxCamera);
          fxHasVisibleFrame = true;
        } else if (fxHasVisibleFrame) {
          fxRenderer.clear();
          fxHasVisibleFrame = false;
        }
      }

      function animate(timestamp: number) {
        if (stopped || document.hidden) {
          frame = 0;
          return;
        }
        frame = window.requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        // FX path is unthrottled so chords stay glued to ports during scroll.
        renderFxFrame(time, true);
        if (timestamp - lastFrameTime < frameInterval) return;
        lastFrameTime = timestamp - ((timestamp - lastFrameTime) % frameInterval);
        const scroll = window.scrollY;
        particleMaterial.uniforms.uTime.value = time;
        bgCamera.position.y = -scroll * fieldUnitsPerPixel * backgroundParallax;
        bgRenderer.render(bgScene, bgCamera);
      }

      function handleVisibilityChange() {
        if (reduceMotion || stopped) return;
        if (document.hidden) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        } else if (frame === 0) {
          lastFrameTime = performance.now();
          frame = window.requestAnimationFrame(animate);
        }
      }

      function handleReducedScroll() {
        renderFxFrame(0, false);
      }

      resize();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      if (reduceMotion) {
        window.addEventListener("scroll", handleReducedScroll, { passive: true });
      } else {
        frame = window.requestAnimationFrame(animate);
      }

      return () => {
        stopped = true;
        window.cancelAnimationFrame(frame);
        window.clearTimeout(resizeTimer);
        for (const timer of timers) window.clearTimeout(timer);
        observer.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("scroll", handleReducedScroll);
        window.removeEventListener("resize", scheduleResize);
        window.removeEventListener("load", resize);
        for (const link of links) link.mesh.geometry.dispose();
        for (const disposable of disposables) disposable.dispose();
      };
    } catch (error) {
      console.warn("[home] immersive WebGL effects unavailable", error);
      bgCanvas.style.display = "none";
      fxCanvas.style.display = "none";
    }
  });
</script>

<canvas bind:this={bgCanvas} class="home-bg-canvas" aria-hidden="true"></canvas>
<canvas bind:this={fxCanvas} class="home-fx-canvas" aria-hidden="true"></canvas>
<div class="home-vignette" aria-hidden="true"></div>

<style>
  .home-bg-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: block;
    pointer-events: none;
  }

  .home-fx-canvas {
    position: fixed;
    inset: 0;
    z-index: 3;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .home-vignette {
    position: fixed;
    inset: 0;
    z-index: 45;
    pointer-events: none;
    background: radial-gradient(120% 100% at 50% 40%, transparent 58%, rgb(0 0 0 / 36%) 100%);
  }
</style>
