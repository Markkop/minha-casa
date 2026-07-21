<script lang="ts">
  import { onMount, tick } from "svelte";
  import * as THREE from "three";
  import { homeConnectorPolicy } from "$lib/components/home/home-connector-policy";

  let bgCanvas = $state<HTMLCanvasElement | null>(null);

  type ChordLink = {
    source: HTMLElement;
    sourceCard: HTMLElement | null;
    mountParent: HTMLElement;
    stackIndex: number;
    target: HTMLElement;
    svg: SVGSVGElement;
    gradient: SVGLinearGradientElement;
    cableGlow: SVGPathElement;
    cableBody: SVGPathElement;
    cable: SVGPathElement;
    signalTrail: SVGPathElement;
    signalGlow: SVGPathElement;
    pulse: SVGPathElement;
    maskFull: SVGRectElement;
    maskHoles: SVGGElement;
    opacity: number;
    speed: number;
    phase: number;
    landFraction?: number;
    lastStartX: number;
    lastStartY: number;
    lastEndX: number;
    lastEndY: number;
  };

  const ENDPOINT_EPS = 0.1;

  onMount(() => {
    if (!bgCanvas) return;
    const homeElement = bgCanvas.closest<HTMLElement>(".immersive-home");
    if (!homeElement) return;
    const home: HTMLElement = homeElement;

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;
    const documentHeight = () => Math.max(home.scrollHeight, document.documentElement.scrollHeight);
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = reducedMotionQuery.matches;
    const smallScreen = width() <= 720;
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
    const chordTimers: number[] = [];
    const links: ChordLink[] = [];
    let frame = 0;
    let chordFrame = 0;
    let chordMasksDirty = true;
    let chordResizeTimer = 0;
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

    function elementCenter(element: HTMLElement) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    let chordUid = 0;

    function createGlowFilter(id: string, blurRadius: number, includeSource: boolean) {
      const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("x", "-50%");
      filter.setAttribute("y", "-50%");
      filter.setAttribute("width", "200%");
      filter.setAttribute("height", "200%");

      const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
      blur.setAttribute("stdDeviation", String(blurRadius));
      blur.setAttribute("result", "glow");
      filter.appendChild(blur);

      if (includeSource) {
        const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
        for (const source of ["glow", "SourceGraphic"]) {
          const node = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
          node.setAttribute("in", source);
          merge.appendChild(node);
        }
        filter.appendChild(merge);
      }

      return filter;
    }

    function createChord(
      stackIndex: number,
      mountParent: HTMLElement
    ): Omit<
      ChordLink,
      | "source"
      | "sourceCard"
      | "mountParent"
      | "target"
      | "landFraction"
      | "lastStartX"
      | "lastStartY"
      | "lastEndX"
      | "lastEndY"
    > {
      const uid = `home-chord-mask-${chordUid++}`;
      const gradientUid = `${uid}-gradient`;
      const cableHaloUid = `${uid}-cable-halo`;
      const cableCoreUid = `${uid}-cable-core`;
      const signalTailUid = `${uid}-signal-tail`;
      const signalMidUid = `${uid}-signal-mid`;
      const signalHeadUid = `${uid}-signal-head`;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "home-chord");
      svg.setAttribute("aria-hidden", "true");
      svg.style.zIndex = String(stackIndex);

      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      gradient.setAttribute("id", gradientUid);
      gradient.setAttribute("gradientUnits", "userSpaceOnUse");
      for (const [offset, color, opacity] of [
        ["0%", "#67e8f9", "0.88"],
        ["48%", "#22d3ee", "0.96"],
        ["100%", "#3b82f6", "0.9"]
      ]) {
        const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop.setAttribute("offset", offset);
        stop.setAttribute("stop-color", color);
        stop.setAttribute("stop-opacity", opacity);
        gradient.appendChild(stop);
      }

      const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
      mask.setAttribute("id", uid);
      mask.setAttribute("maskUnits", "userSpaceOnUse");

      const maskFull = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      maskFull.setAttribute("x", "0");
      maskFull.setAttribute("y", "0");
      maskFull.setAttribute("fill", "#fff");

      const maskHoles = document.createElementNS("http://www.w3.org/2000/svg", "g");
      maskHoles.setAttribute("fill", "#000");

      mask.append(maskFull, maskHoles);
      defs.append(
        gradient,
        createGlowFilter(cableHaloUid, 3, false),
        createGlowFilter(cableCoreUid, 1.5, true),
        createGlowFilter(signalTailUid, 2.5, false),
        createGlowFilter(signalMidUid, 1.25, false),
        createGlowFilter(signalHeadUid, 2.5, true),
        mask
      );

      const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.setAttribute("mask", `url(#${uid})`);

      const cableGlow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      cableGlow.setAttribute("class", "home-chord-cable-glow");
      cableGlow.setAttribute("fill", "none");
      cableGlow.setAttribute("stroke", `url(#${gradientUid})`);
      cableGlow.setAttribute("stroke-linecap", "round");
      cableGlow.setAttribute("filter", `url(#${cableHaloUid})`);

      const cable = document.createElementNS("http://www.w3.org/2000/svg", "path");
      cable.setAttribute("class", "home-chord-cable");
      cable.setAttribute("fill", "none");
      cable.setAttribute("stroke", `url(#${gradientUid})`);
      cable.setAttribute("stroke-linecap", "round");
      cable.setAttribute("filter", `url(#${cableCoreUid})`);

      const cableBody = document.createElementNS("http://www.w3.org/2000/svg", "path");
      cableBody.setAttribute("class", "home-chord-cable-body");
      cableBody.setAttribute("fill", "none");
      cableBody.setAttribute("stroke", `url(#${gradientUid})`);
      cableBody.setAttribute("stroke-linecap", "round");

      const signalTrail = document.createElementNS("http://www.w3.org/2000/svg", "path");
      signalTrail.setAttribute("class", "home-chord-signal-trail");
      signalTrail.setAttribute("fill", "none");
      signalTrail.setAttribute("pathLength", "100");
      signalTrail.setAttribute("stroke-linecap", "round");
      signalTrail.setAttribute("stroke-dasharray", "45 155");
      signalTrail.setAttribute("filter", `url(#${signalTailUid})`);

      const signalGlow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      signalGlow.setAttribute("class", "home-chord-signal-glow");
      signalGlow.setAttribute("fill", "none");
      signalGlow.setAttribute("pathLength", "100");
      signalGlow.setAttribute("stroke-linecap", "round");
      signalGlow.setAttribute("stroke-dasharray", "18 182");
      signalGlow.setAttribute("filter", `url(#${signalMidUid})`);

      const pulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pulse.setAttribute("class", "home-chord-pulse");
      pulse.setAttribute("fill", "none");
      pulse.setAttribute("pathLength", "100");
      pulse.setAttribute("stroke-linecap", "round");
      pulse.setAttribute("stroke-dasharray", "5 195");
      pulse.setAttribute("filter", `url(#${signalHeadUid})`);

      layer.append(cableGlow, cableBody, cable, signalTrail, signalGlow, pulse);
      svg.append(defs, layer);
      mountParent.appendChild(svg);

      return {
        stackIndex,
        svg,
        gradient,
        cableGlow,
        cableBody,
        cable,
        signalTrail,
        signalGlow,
        pulse,
        maskFull,
        maskHoles,
        opacity: 0,
        speed: 0.9 + Math.random() * 0.5,
        phase: Math.random()
      };
    }

    function homePoint(clientX: number, clientY: number) {
      const rect = home.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function syncChordSurface(svg: SVGSVGElement, mountParent: HTMLElement, view: { w: number; h: number }) {
      const stackRect = mountParent.getBoundingClientRect();
      const homeRect = home.getBoundingClientRect();
      svg.style.left = `${homeRect.left - stackRect.left}px`;
      svg.style.top = `${homeRect.top - stackRect.top}px`;
      svg.style.width = `${view.w}px`;
      svg.style.height = `${view.h}px`;
      svg.setAttribute("viewBox", `0 0 ${view.w} ${view.h}`);
    }

    /** Opaque faces that must hide cables — z-index alone fails for overflowing SVGs. */
    function occlusionRects(excludeCard: HTMLElement | null = null) {
      const nodes = [
        ...home.querySelectorAll<HTMLElement>(".property-thumb .frame"),
        ...home.querySelectorAll<HTMLElement>(".home-panel")
      ];
      return nodes.flatMap((node) => {
        if (excludeCard && excludeCard.contains(node)) return [];
        const rect = node.getBoundingClientRect();
        const topLeft = homePoint(rect.left, rect.top);
        return [
          {
            x: topLeft.x,
            y: topLeft.y,
            w: rect.width,
            h: rect.height,
            radius: Math.min(16, rect.width * 0.08, rect.height * 0.08)
          }
        ];
      });
    }

    function applyOcclusionMask(link: ChordLink, view: { w: number; h: number }, holes: ReturnType<typeof occlusionRects>) {
      link.maskFull.setAttribute("width", String(view.w));
      link.maskFull.setAttribute("height", String(view.h));
      link.maskHoles.replaceChildren();
      for (const hole of holes) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(hole.x - 1));
        rect.setAttribute("y", String(hole.y - 1));
        rect.setAttribute("width", String(hole.w + 2));
        rect.setAttribute("height", String(hole.h + 2));
        rect.setAttribute("rx", String(hole.radius));
        rect.setAttribute("ry", String(hole.radius));
        link.maskHoles.appendChild(rect);
      }
    }

    function curvePath(
      start: { x: number; y: number },
      end: { x: number; y: number },
      toPanel: boolean
    ) {
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const controlOne = toPanel
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
          (toPanel
            ? Math.min(180, Math.max(60, Math.abs(deltaY) * 0.35))
            : Math.min(240, Math.max(90, Math.abs(deltaY) * 0.4)))
      };
      return `M ${start.x} ${start.y} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${end.x} ${end.y}`;
    }

    const landingFractions = [0.3, 0.14, 0.86, 0.7];

    async function buildChords() {
      await tick();
      if (stopped) return;
      const listPanel = home.querySelector<HTMLElement>("[data-home-list-panel]");
      const cardHost = home.querySelector<HTMLElement>("[data-home-chords]");
      const cards = [...home.querySelectorAll<HTMLElement>("[data-home-card-id]")];
      if (!listPanel || !cardHost) return;

      cards.forEach((card, index) => {
        const port = card.querySelector<HTMLElement>("[data-home-port]");
        if (!port) return;
        const chord = createChord(1, cardHost);
        links.push({
          ...chord,
          source: port,
          sourceCard: card,
          mountParent: cardHost,
          target: listPanel,
          landFraction: landingFractions[index % landingFractions.length],
          lastStartX: Number.NaN,
          lastStartY: Number.NaN,
          lastEndX: Number.NaN,
          lastEndY: Number.NaN
        });
      });

      const main = home.querySelector<HTMLElement>(".home-main") ?? home;
      home.querySelectorAll<HTMLElement>("[data-home-flow-port]").forEach((port) => {
        const flowId = port.dataset.homeFlowPort;
        const dock = flowId
          ? home.querySelector<HTMLElement>(`[data-home-flow-dock="${flowId}"]`)
          : null;
        if (!dock) return;
        const chord = createChord(1, main);
        links.push({
          ...chord,
          source: port,
          sourceCard: null,
          mountParent: main,
          target: dock,
          lastStartX: Number.NaN,
          lastStartY: Number.NaN,
          lastEndX: Number.NaN,
          lastEndY: Number.NaN
        });
      });

      chordMasksDirty = true;
      renderChords(0, false);
    }

    function relayoutLinks() {
      const policy = homeConnectorPolicy(width(), reducedMotionQuery.matches);
      if (!policy.visible) {
        for (const link of links) link.svg.style.visibility = "hidden";
        return;
      }
      const homeRect = home.getBoundingClientRect();
      const view = {
        w: Math.max(home.scrollWidth, homeRect.width, width()),
        h: Math.max(home.scrollHeight, homeRect.height, height())
      };
      const holesCache = new Map<HTMLElement | null, ReturnType<typeof occlusionRects>>();
      for (const link of links) {
        link.svg.style.visibility = "visible";
        syncChordSurface(link.svg, link.mountParent, view);
        if (chordMasksDirty) {
          const exclude = link.sourceCard;
          let holes = holesCache.get(exclude);
          if (!holes) {
            holes = occlusionRects(exclude);
            holesCache.set(exclude, holes);
          }
          applyOcclusionMask(link, view, holes);
        }

        const startClient = elementCenter(link.source);
        let endClient = elementCenter(link.target);
        if (link.landFraction !== undefined) {
          const rect = link.target.getBoundingClientRect();
          endClient = {
            x: rect.left + rect.width * link.landFraction,
            y: rect.top
          };
        }
        const start = homePoint(startClient.x, startClient.y);
        const end = homePoint(endClient.x, endClient.y);

        const moved =
          Number.isNaN(link.lastStartX) ||
          Math.abs(start.x - link.lastStartX) > ENDPOINT_EPS ||
          Math.abs(start.y - link.lastStartY) > ENDPOINT_EPS ||
          Math.abs(end.x - link.lastEndX) > ENDPOINT_EPS ||
          Math.abs(end.y - link.lastEndY) > ENDPOINT_EPS;

        link.lastStartX = start.x;
        link.lastStartY = start.y;
        link.lastEndX = end.x;
        link.lastEndY = end.y;
        if (!moved) continue;

        const d = curvePath(start, end, link.landFraction !== undefined);
        link.gradient.setAttribute("x1", String(start.x));
        link.gradient.setAttribute("y1", String(start.y));
        link.gradient.setAttribute("x2", String(end.x));
        link.gradient.setAttribute("y2", String(end.y));
        link.cableGlow.setAttribute("d", d);
        link.cableBody.setAttribute("d", d);
        link.cable.setAttribute("d", d);
        link.signalTrail.setAttribute("d", d);
        link.signalGlow.setAttribute("d", d);
        link.pulse.setAttribute("d", d);
      }
      chordMasksDirty = false;
    }

    function renderChords(time: number, animated: boolean) {
      const policy = homeConnectorPolicy(width(), reducedMotionQuery.matches);
      relayoutLinks();
      for (const link of links) {
        link.signalTrail.style.visibility = policy.animated ? "visible" : "hidden";
        link.signalGlow.style.visibility = policy.animated ? "visible" : "hidden";
        link.pulse.style.visibility = policy.animated ? "visible" : "hidden";
        if (!policy.visible) continue;
        link.opacity = animated ? link.opacity + (1 - link.opacity) * 0.06 : 1;
        link.svg.style.opacity = String(link.opacity);
        if (policy.animated) {
          const progress = (((time * link.speed * 0.16 + link.phase) % 1) * 173) - 18;
          link.signalTrail.setAttribute("stroke-dashoffset", String(-progress + 45));
          link.signalGlow.setAttribute("stroke-dashoffset", String(-progress + 18));
          link.pulse.setAttribute("stroke-dashoffset", String(-progress + 2.5));
        }
      }
    }

    function animateChords(timestamp: number) {
      const policy = homeConnectorPolicy(width(), reducedMotionQuery.matches);
      if (stopped || document.hidden || !policy.animated) {
        chordFrame = 0;
        if (!stopped) renderChords(0, false);
        return;
      }
      renderChords(timestamp / 1000, true);
      chordFrame = window.requestAnimationFrame(animateChords);
    }

    function startChordRendering() {
      window.cancelAnimationFrame(chordFrame);
      chordFrame = 0;
      const policy = homeConnectorPolicy(width(), reducedMotionQuery.matches);
      if (policy.animated && !document.hidden) {
        chordFrame = window.requestAnimationFrame(animateChords);
      } else {
        renderChords(0, false);
      }
    }

    function scheduleChordRelayout() {
      window.clearTimeout(chordResizeTimer);
      chordResizeTimer = window.setTimeout(() => {
        chordMasksDirty = true;
        for (const link of links) link.lastStartX = Number.NaN;
        renderChords(0, false);
        startChordRendering();
      }, 120);
    }

    function handleChordScroll() {
      if (!homeConnectorPolicy(width(), reducedMotionQuery.matches).animated) {
        renderChords(0, false);
      }
    }

    function handleChordVisibilityChange() {
      if (document.hidden) {
        window.cancelAnimationFrame(chordFrame);
        chordFrame = 0;
      } else {
        startChordRendering();
      }
    }

    function handleReducedMotionChange() {
      startChordRendering();
    }

    const chordObserver = new ResizeObserver(scheduleChordRelayout);
    chordObserver.observe(home);
    window.addEventListener("resize", scheduleChordRelayout, { passive: true });
    window.addEventListener("load", scheduleChordRelayout);
    window.addEventListener("scroll", handleChordScroll, { passive: true });
    document.addEventListener("visibilitychange", handleChordVisibilityChange);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    chordTimers.push(
      window.setTimeout(scheduleChordRelayout, 400),
      window.setTimeout(scheduleChordRelayout, 1500)
    );
    void buildChords();
    startChordRendering();

    function cleanupChords() {
      stopped = true;
      window.cancelAnimationFrame(chordFrame);
      window.clearTimeout(chordResizeTimer);
      for (const timer of chordTimers) window.clearTimeout(timer);
      chordObserver.disconnect();
      window.removeEventListener("resize", scheduleChordRelayout);
      window.removeEventListener("load", scheduleChordRelayout);
      window.removeEventListener("scroll", handleChordScroll);
      document.removeEventListener("visibilitychange", handleChordVisibilityChange);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      for (const link of links) link.svg.remove();
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
        const scrollWorld =
          (Math.max(documentHeight(), height()) - height()) * fieldUnitsPerPixel * backgroundParallax;
        const top = halfView + 220;
        const bottom = -scrollWorld - halfView - 220;
        const span = top - bottom;
        if (builtSpan > 0 && Math.abs(span - builtSpan) < worldHeight() * 0.5) return;
        builtSpan = span;
        const count = Math.max(
          targetParticlesPerViewport,
          Math.min(maxParticles, Math.round(targetParticlesPerViewport * (span / worldHeight())))
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

      function resize() {
        if (stopped) return;
        const viewportWidth = width();
        const viewportHeight = height();
        bgRenderer.setPixelRatio(pixelRatio);
        bgRenderer.setSize(viewportWidth, viewportHeight);
        bgCamera.aspect = viewportWidth / viewportHeight;
        bgCamera.updateProjectionMatrix();
        rebuildField();
        if (reduceMotion) {
          particleMaterial.uniforms.uTime.value = 0;
          bgCamera.position.y = 0;
          bgRenderer.render(bgScene, bgCamera);
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

      function animate(timestamp: number) {
        if (stopped || document.hidden) {
          frame = 0;
          return;
        }
        frame = window.requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
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

      resize();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      if (!reduceMotion) {
        frame = window.requestAnimationFrame(animate);
      }

      return () => {
        cleanupChords();
        window.cancelAnimationFrame(frame);
        window.clearTimeout(resizeTimer);
        for (const timer of timers) window.clearTimeout(timer);
        observer.disconnect();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("resize", scheduleResize);
        window.removeEventListener("load", resize);
        for (const disposable of disposables) disposable.dispose();
      };
    } catch (error) {
      console.warn("[home] immersive WebGL effects unavailable", error);
      bgCanvas.style.display = "none";
      for (const disposable of disposables) disposable.dispose();
      return cleanupChords;
    }
  });
</script>

<canvas bind:this={bgCanvas} class="home-bg-canvas" aria-hidden="true"></canvas>
<div class="home-vignette" aria-hidden="true"></div>

<style>
  .home-bg-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: block;
    pointer-events: none;
  }

  .home-vignette {
    position: fixed;
    inset: 0;
    z-index: 45;
    pointer-events: none;
    background: radial-gradient(120% 100% at 50% 40%, transparent 58%, rgb(0 0 0 / 36%) 100%);
  }

  :global(.home-chord) {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }

  :global(.home-chord-cable-glow) {
    stroke-width: 10;
    opacity: 0.14;
  }

  :global(.home-chord-cable-body) {
    stroke-width: 6.4;
    opacity: 0.28;
  }

  :global(.home-chord-cable) {
    stroke-width: 2.4;
    opacity: 0.82;
  }

  :global(.home-chord-signal-trail) {
    stroke: #bfe8ff;
    stroke-width: 5.5;
    opacity: 0.16;
  }

  :global(.home-chord-signal-glow) {
    stroke: #d8f5ff;
    stroke-width: 3.8;
    opacity: 0.48;
  }

  :global(.home-chord-pulse) {
    stroke: #fff;
    stroke-width: 2.6;
    opacity: 0.98;
  }
</style>
