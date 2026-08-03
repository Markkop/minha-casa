<script lang="ts">
  import { onMount } from "svelte";
  import { getHomePrismTimeline } from "$lib/components/home/home-prism-timeline";

  let effectsRoot = $state<HTMLDivElement | null>(null);
  let surfaceWidth = $state(1);
  let surfaceHeight = $state(1);
  let incomingBeams = $state<
    Array<{
      path: string;
      gradient: { x1: number; y1: number; x2: number; y2: number };
      palette: { start: string; middle: string };
    }>
  >([]);
  let incomingProgress = $state(0);
  let outgoingConePath = $state("");
  let collisionX = $state(0);
  let collisionY = $state(0);
  let collisionPulse = $state(0);
  let prismY = $state(0);
  let prismWidth = $state(256);
  let prismScale = $state(0.82);
  let prismSpin = $state(-8);
  let prismOpacity = $state(0);
  let prismMaskPath = $state("");

  const beamPalettes = [
    { start: "#22d3ee", middle: "#67e8f9" },
    { start: "#3b82f6", middle: "#60a5fa" },
    { start: "#7dd3fc", middle: "#a5f3fc" },
    { start: "#2563eb", middle: "#38bdf8" }
  ];

  // Prism SVG viewBox is 160×220; wires meet at (80, 101).
  const PRISM_VIEWBOX_WIDTH = 160;
  const PRISM_VIEWBOX_HEIGHT = 220;
  const PRISM_WIRE_CENTER_Y = 101;
  // Prism silhouette outline (viewBox coords) expressed as fractions of the box,
  // matching the wire path `M80 8 18 108 80 212 142 108Z`.
  const PRISM_SILHOUETTE = [
    { x: 80 / PRISM_VIEWBOX_WIDTH, y: 8 / PRISM_VIEWBOX_HEIGHT },
    { x: 18 / PRISM_VIEWBOX_WIDTH, y: 108 / PRISM_VIEWBOX_HEIGHT },
    { x: 80 / PRISM_VIEWBOX_WIDTH, y: 212 / PRISM_VIEWBOX_HEIGHT },
    { x: 142 / PRISM_VIEWBOX_WIDTH, y: 108 / PRISM_VIEWBOX_HEIGHT }
  ];

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  type PrismGeometry = {
    stickyWidth: number;
    stickyHeight: number;
    stickyLeft: number;
    titleBottomY: number;
    receiverTargetY: number;
    cardsBottomY: number | null;
    beams: Array<{
      baseLeftX: number;
      baseLeftY: number;
      baseRightX: number;
      baseRightY: number;
      baseCenterX: number;
      baseCenterY: number;
    }>;
  };

  onMount(() => {
    if (!effectsRoot) return;

    const journey = effectsRoot.closest<HTMLElement>("[data-home-prism-story]");
    const sticky = effectsRoot.closest<HTMLElement>("[data-home-prism-sticky]");
    const home = effectsRoot.closest<HTMLElement>(".immersive-home");
    const receiver = home?.querySelector<HTMLElement>("[data-home-prism-receiver]");
    const listPanel = home?.querySelector<HTMLElement>("[data-home-list-panel]");
    const title = journey?.querySelector<HTMLElement>(".stage-title");
    const stageCards = journey?.querySelector<HTMLElement>("[data-home-stage-cards]");
    const cardStacks = journey
      ? [...journey.querySelectorAll<HTMLElement>("[data-home-card-stack]")]
      : [];
    const ports = journey ? [...journey.querySelectorAll<HTMLElement>("[data-home-port]")] : [];

    if (!journey || !sticky || !home || !receiver || !listPanel) return;
    const journeyElement: HTMLElement = journey;
    const stickyElement: HTMLElement = sticky;
    const receiverElement: HTMLElement = receiver;
    const listPanelElement: HTMLElement = listPanel;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 720px)");
    let frame = 0;
    let stopped = false;
    let geometryDirty = true;
    let journeyTop = 0;
    let journeyTravel = 1;
    let cachedGeometry: PrismGeometry | null = null;

    function invalidateGeometry() {
      geometryDirty = true;
      scheduleRender();
    }

    function refreshGeometry(): PrismGeometry {
      const stickyRect = stickyElement.getBoundingClientRect();
      const journeyRect = journeyElement.getBoundingClientRect();
      const receiverRect = receiverElement.getBoundingClientRect();
      const titleRect = title?.getBoundingClientRect();
      const mobile = mobileQuery.matches;

      journeyTop = window.scrollY + journeyRect.top;
      journeyTravel = Math.max(1, journeyRect.height - window.innerHeight);
      const geometry: PrismGeometry = {
        stickyWidth: Math.max(1, stickyRect.width),
        stickyHeight: Math.max(1, stickyRect.height),
        stickyLeft: stickyRect.left,
        titleBottomY: titleRect
          ? titleRect.bottom - stickyRect.top
          : stickyRect.height * (mobile ? 0.42 : 0.5),
        receiverTargetY: receiverRect.top + receiverRect.height / 2 - stickyRect.top,
        cardsBottomY: stageCards
          ? stageCards.getBoundingClientRect().bottom - stickyRect.top
          : null,
        beams: ports
          .filter((port) => port.getBoundingClientRect().width > 0)
          .map((port) => {
            const card = port.closest<HTMLElement>("[data-home-card-id]") ?? port;
            const portRect = port.getBoundingClientRect();
            const cardStyle = getComputedStyle(card);
            const cardTransform = new DOMMatrixReadOnly(cardStyle.transform);
            const horizontalScale = Math.hypot(cardTransform.a, cardTransform.b) || 1;
            const horizontalAxis = {
              x: cardTransform.a / horizontalScale,
              y: cardTransform.b / horizontalScale
            };
            const borderRadius = Number.parseFloat(cardStyle.borderBottomLeftRadius) || 0;
            const halfCardWidth = Math.max(0, card.offsetWidth / 2 - borderRadius - 1);
            const baseCenterX = portRect.left + portRect.width / 2 - stickyRect.left;
            const baseCenterY = portRect.top + portRect.height / 2 - stickyRect.top;

            return {
              baseCenterX,
              baseCenterY,
              baseLeftX: baseCenterX - horizontalAxis.x * halfCardWidth,
              baseLeftY: baseCenterY - horizontalAxis.y * halfCardWidth,
              baseRightX: baseCenterX + horizontalAxis.x * halfCardWidth,
              baseRightY: baseCenterY + horizontalAxis.y * halfCardWidth
            };
          })
      };
      cachedGeometry = geometry;
      geometryDirty = false;
      return geometry;
    }

    function scheduleRender() {
      if (stopped || frame) return;
      frame = window.requestAnimationFrame(render);
    }

    function render() {
      frame = 0;
      if (stopped) return;

      const geometry =
        geometryDirty || !cachedGeometry ? refreshGeometry() : cachedGeometry;
      const mobile = mobileQuery.matches;
      const reducedMotion = reducedMotionQuery.matches;
      const rawProgress = reducedMotion ? 1 : (window.scrollY - journeyTop) / journeyTravel;
      const timeline = getHomePrismTimeline(rawProgress, { mobile, reducedMotion });

      surfaceWidth = geometry.stickyWidth;
      surfaceHeight = geometry.stickyHeight;
      collisionX = geometry.stickyWidth / 2;
      collisionPulse = timeline.collisionPulse;
      incomingProgress = timeline.incomingBeamProgress;

      prismWidth = clamp(geometry.stickyWidth * (mobile ? 0.48 : 0.2), mobile ? 164 : 224, mobile ? 208 : 304);
      const prismHeight = prismWidth * (PRISM_VIEWBOX_HEIGHT / 160);
      // Collision target is the prism's wire convergence (not the CSS box center).
      // On mobile, clear the prism tip below the 2×2 card grid so bottom-row beams
      // have real length (tip sits ~0.42×prismHeight above the wire center).
      const tipAboveWireCenter =
        prismHeight * ((PRISM_WIRE_CENTER_Y - 8) / PRISM_VIEWBOX_HEIGHT);
      const mobileBeamClearance = Math.max(48, geometry.stickyHeight * 0.08);
      if (mobile && geometry.cardsBottomY !== null) {
        // Keep the mobile card→prism gap at twice the desktop-like composition.
        // Lista's matching vertical distance is set by the mobile story layout.
        const mobileCardToPrismGap = tipAboveWireCenter + mobileBeamClearance;
        collisionY = geometry.cardsBottomY + mobileCardToPrismGap * 2;
      } else {
        collisionY =
          geometry.titleBottomY + Math.max(0, geometry.receiverTargetY - geometry.titleBottomY) * 0.5;
      }
      const wireCenterFromCssCenter =
        prismHeight * (PRISM_WIRE_CENTER_Y / PRISM_VIEWBOX_HEIGHT - 0.5);
      const prismCssCenterTargetY = collisionY - wireCenterFromCssCenter;
      const prismStartY = -prismHeight * 0.62;
      prismY = prismStartY + (prismCssCenterTargetY - prismStartY) * timeline.prismProgress;
      prismScale = 0.82 + timeline.prismProgress * 0.18;
      prismSpin = -9 + timeline.prismProgress * 18;
      // Fade in over the prism's entire travel.
      prismOpacity = timeline.prismProgress;

      // Silhouette mask matching the prism's rendered position/size, so incoming
      // beams simply vanish behind the glass instead of shining through it.
      const maskWidth = prismWidth * prismScale;
      const maskHeight = prismHeight * prismScale;
      const maskLeft = collisionX - maskWidth / 2;
      const maskTop = prismY - maskHeight / 2;
      prismMaskPath = PRISM_SILHOUETTE.map((point, index) => {
        const x = maskLeft + point.x * maskWidth;
        const y = maskTop + point.y * maskHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ") + " Z";

      const beamProgress = timeline.incomingBeamProgress;
      incomingBeams =
        beamProgress > 0
          ? geometry.beams.map((beam, index) => {
                const direction = index < 2 ? -1 : 1;
                const depth = index === 0 || index === 3 ? 1 : 0.65;
                const lift = index % 2 === 0 ? 10 : 6;
                const translateX = direction * depth * timeline.photoParallaxProgress * 20;
                const translateY = -lift * timeline.photoParallaxProgress;
                return {
                  path: `M ${beam.baseLeftX + translateX} ${beam.baseLeftY + translateY} L ${beam.baseRightX + translateX} ${beam.baseRightY + translateY} L ${collisionX} ${collisionY} Z`,
                  gradient: {
                    x1: beam.baseCenterX + translateX,
                    y1: beam.baseCenterY + translateY,
                    x2: collisionX,
                    y2: collisionY
                  },
                  palette: beamPalettes[index % beamPalettes.length]
                };
              })
          : [];

      const listRect = listPanelElement.getBoundingClientRect();
      const listLeft = listRect.left - geometry.stickyLeft;
      const listRight = listRect.right - geometry.stickyLeft;
      const listCenterX = (listLeft + listRight) / 2;
      const halfBeamWidth = (listRight - listLeft) * (mobile ? 0.44 : 0.22);
      const beamLeft = listCenterX - halfBeamWidth;
      const beamRight = listCenterX + halfBeamWidth;
      const targetY = geometry.receiverTargetY;
      const outgoingProgress = timeline.outgoingBeamProgress;
      const frontLeftX = collisionX + (beamLeft - collisionX) * outgoingProgress;
      const frontLeftY = collisionY + (targetY - collisionY) * outgoingProgress;
      const frontRightX = collisionX + (beamRight - collisionX) * outgoingProgress;
      const frontRightY = collisionY + (targetY - collisionY) * outgoingProgress;

      outgoingConePath =
        outgoingProgress > 0
          ? `M ${collisionX} ${collisionY} L ${frontLeftX} ${frontLeftY} L ${frontRightX} ${frontRightY} Z`
          : "";

      const photoContrast = timeline.photoAtmosphere;
      cardStacks.forEach((stack, index) => {
        const direction = index < 2 ? -1 : 1;
        const depth = index === 0 || index === 3 ? 1 : 0.65;
        const lift = index % 2 === 0 ? 10 : 6;
        stack.style.setProperty(
          "--prism-parallax-x",
          `${direction * depth * timeline.photoParallaxProgress * 20}px`
        );
        stack.style.setProperty(
          "--prism-parallax-y",
          `${-lift * timeline.photoParallaxProgress}px`
        );
        stack.style.setProperty("--prism-card-opacity", String(0.56 + photoContrast * 0.44));
      });
      title?.style.setProperty("--prism-title-atmosphere", String(photoContrast));
      listPanelElement.style.setProperty(
        "--prism-list-reveal",
        String(timeline.listRevealProgress)
      );
      listPanelElement.style.setProperty("--prism-received", String(timeline.listGlowProgress));
    }

    const resizeObserver = new ResizeObserver(invalidateGeometry);
    resizeObserver.observe(journeyElement);
    resizeObserver.observe(stickyElement);
    resizeObserver.observe(receiverElement);
    resizeObserver.observe(listPanelElement);
    window.addEventListener("scroll", scheduleRender, { passive: true });
    window.addEventListener("resize", scheduleRender, { passive: true });
    reducedMotionQuery.addEventListener("change", scheduleRender);
    mobileQuery.addEventListener("change", invalidateGeometry);
    scheduleRender();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleRender);
      window.removeEventListener("resize", scheduleRender);
      reducedMotionQuery.removeEventListener("change", scheduleRender);
      mobileQuery.removeEventListener("change", scheduleRender);
      for (const stack of cardStacks) {
        stack.style.removeProperty("--prism-parallax-x");
        stack.style.removeProperty("--prism-parallax-y");
        stack.style.removeProperty("--prism-card-opacity");
      }
      title?.style.removeProperty("--prism-title-atmosphere");
      listPanelElement.style.removeProperty("--prism-list-reveal");
      listPanelElement.style.removeProperty("--prism-received");
    };
  });
</script>

<div bind:this={effectsRoot} class="prism-effects" aria-hidden="true">
  <svg
    class="prism-beam-surface"
    viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
    preserveAspectRatio="none"
  >
    <defs>
      {#each incomingBeams as beam, index (index)}
        <linearGradient
          id={`prism-beam-${index}`}
          gradientUnits="userSpaceOnUse"
          x1={beam.gradient.x1}
          y1={beam.gradient.y1}
          x2={beam.gradient.x2}
          y2={beam.gradient.y2}
        >
          {#if incomingProgress < 1}
            <stop offset="0" stop-color={beam.palette.start} stop-opacity="0.14" />
            <stop
              offset={incomingProgress * 0.42}
              stop-color={beam.palette.start}
              stop-opacity="0.28"
            />
            <stop
              offset={incomingProgress * 0.68}
              stop-color={beam.palette.middle}
              stop-opacity="0.52"
            />
            <stop
              offset={incomingProgress * 0.82}
              stop-color="#dffbff"
              stop-opacity="0.4"
            />
            <stop offset={incomingProgress} stop-color="#ffffff" stop-opacity="0" />
            <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
          {:else}
            <stop offset="0" stop-color={beam.palette.start} stop-opacity="0.14" />
            <stop offset="0.34" stop-color={beam.palette.start} stop-opacity="0.28" />
            <stop offset="0.72" stop-color={beam.palette.middle} stop-opacity="0.52" />
            <stop offset="0.92" stop-color="#dffbff" stop-opacity="0.78" />
            <stop offset="1" stop-color="#ffffff" stop-opacity="0.96" />
          {/if}
        </linearGradient>
      {/each}
      <linearGradient id="prism-output-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e8fdff" stop-opacity="0.56" />
        <stop offset="0.26" stop-color="#67e8f9" stop-opacity="0.28" />
        <stop offset="1" stop-color="#3b82f6" stop-opacity="0" />
      </linearGradient>
      <filter id="prism-beam-soft" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
      <mask
        id="prism-cutout-mask"
        maskUnits="userSpaceOnUse"
        x={-surfaceWidth}
        y={-surfaceHeight}
        width={surfaceWidth * 3}
        height={surfaceHeight * 3}
      >
        <rect
          x={-surfaceWidth}
          y={-surfaceHeight}
          width={surfaceWidth * 3}
          height={surfaceHeight * 3}
          fill="#fff"
        />
        {#if prismMaskPath}
          <path d={prismMaskPath} fill="#000" />
        {/if}
      </mask>
      <radialGradient id="collision-bloom-fill" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
        <stop offset="28%" stop-color="#f0feff" stop-opacity="0.72" />
        <stop offset="58%" stop-color="#a5f3fc" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#22d3ee" stop-opacity="0" />
      </radialGradient>
      <filter id="collision-bloom-soft" x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="22" />
      </filter>
      <filter id="collision-bloom-core" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
    </defs>

    <g mask="url(#prism-cutout-mask)">
      {#each incomingBeams as beam, index (index)}
        <g class="incoming-beam" style:opacity={incomingProgress > 0 ? 1 : 0}>
          <path
            d={beam.path}
            class="incoming-beam__halo"
            fill={`url(#prism-beam-${index})`}
          />
          <path
            d={beam.path}
            class="incoming-beam__cone"
            fill={`url(#prism-beam-${index})`}
          />
        </g>
      {/each}
    </g>

    {#if outgoingConePath}
      <path d={outgoingConePath} class="outgoing-beam__halo" />
      <path d={outgoingConePath} class="outgoing-beam__cone" />
    {/if}

    {#if collisionPulse > 0}
      <circle
        data-home-prism-anchor
        class="collision-bloom__halo"
        cx={collisionX}
        cy={collisionY}
        r={18 + collisionPulse * 96}
        fill="url(#collision-bloom-fill)"
        style:opacity={collisionPulse * 0.72}
      />
      <circle
        class="collision-bloom__core"
        cx={collisionX}
        cy={collisionY}
        r={6 + collisionPulse * 28}
        fill="url(#collision-bloom-fill)"
        style:opacity={collisionPulse * 0.95}
      />
    {/if}
  </svg>

  <div
    data-home-prism
    class="prism-shell"
    style:width={`${prismWidth}px`}
    style:opacity={prismOpacity}
    style:transform={`translate(-50%, -50%) translate3d(0, ${prismY}px, 0) scale(${prismScale})`}
  >
    <div
      class="prism-object"
      style:transform={`rotateY(${prismSpin}deg) rotateZ(${Math.sin(prismSpin * 0.1) * 1.6}deg)`}
    >
      <svg viewBox="0 0 160 220" role="presentation">
        <defs>
          <linearGradient id="glass-upper-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.5" />
            <stop offset="1" stop-color="#22d3ee" stop-opacity="0.08" />
          </linearGradient>
          <linearGradient id="glass-upper-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#93c5fd" stop-opacity="0.4" />
            <stop offset="1" stop-color="#3b82f6" stop-opacity="0.08" />
          </linearGradient>
          <linearGradient id="glass-lower-left" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#2563eb" stop-opacity="0.12" />
            <stop offset="1" stop-color="#67e8f9" stop-opacity="0.34" />
          </linearGradient>
          <linearGradient id="glass-lower-right" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#22d3ee" stop-opacity="0.08" />
            <stop offset="1" stop-color="#dffbff" stop-opacity="0.36" />
          </linearGradient>
          <filter id="prism-glow" x="-80%" y="-60%" width="260%" height="220%">
            <feGaussianBlur stdDeviation="8" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g class="prism-faces">
          <path d="M80 8 18 108 80 101Z" fill="url(#glass-upper-left)" />
          <path d="M80 8 142 108 80 101Z" fill="url(#glass-upper-right)" />
          <path d="M18 108 80 212 80 101Z" fill="url(#glass-lower-left)" />
          <path d="M142 108 80 212 80 101Z" fill="url(#glass-lower-right)" />
        </g>
        <g class="prism-wire" filter="url(#prism-glow)">
          <path d="M80 8 18 108 80 212 142 108Z" />
          <path d="M18 108 80 101 142 108" />
          <path d="M80 8V212" />
        </g>
      </svg>
    </div>
  </div>
</div>

<style>
  .prism-effects {
    position: absolute;
    inset: 0;
    /* Keep the entire prism treatment behind the hero copy and property cards. */
    z-index: 1;
    overflow: visible;
    pointer-events: none;
  }

  .prism-beam-surface {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .incoming-beam__halo { opacity: .34; filter: url(#prism-beam-soft); }
  .incoming-beam__cone { opacity: .72; mix-blend-mode: screen; }
  .outgoing-beam__halo { fill: #22d3ee; opacity: calc(.12 * var(--beam-opacity, 1)); filter: url(#prism-beam-soft); }
  .outgoing-beam__cone { fill: url(#prism-output-fill); opacity: .9; mix-blend-mode: screen; }
  .collision-bloom__halo {
    mix-blend-mode: screen;
    filter: url(#collision-bloom-soft);
  }

  .collision-bloom__core {
    mix-blend-mode: screen;
    filter: url(#collision-bloom-core);
  }

  .prism-shell {
    position: absolute;
    top: 0;
    left: 50%;
    z-index: 5;
    aspect-ratio: 160 / 220;
    transform-origin: center;
    will-change: transform, opacity;
    perspective: 700px;
    isolation: isolate;
  }

  .prism-shell::before {
    position: absolute;
    inset: 14% -20%;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(103 232 249 / 24%), rgb(59 130 246 / 8%) 42%, transparent 70%);
    filter: blur(28px);
    content: "";
    z-index: -1;
  }

  .prism-object {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    will-change: transform;
    background: rgb(207 250 254 / 6%);
    backdrop-filter: blur(14px) saturate(1.35);
    -webkit-backdrop-filter: blur(14px) saturate(1.35);
    clip-path: polygon(50% 3.64%, 11.25% 49.09%, 50% 96.36%, 88.75% 49.09%);
  }

  .prism-object svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .prism-faces { mix-blend-mode: screen; opacity: 0.78; }
  .prism-wire { fill: none; stroke: rgb(207 250 254 / 88%); stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }

  @media (max-width: 720px) {
    /* Beams and prism remain a backdrop beneath the mobile hero stage (4). */
    .prism-effects { z-index: 1; }
    /* Avoid Gaussian blur on SVG geometry that changes throughout the scroll journey. */
    .incoming-beam__halo,
    .outgoing-beam__halo { display: none; }
    .collision-bloom__halo,
    .collision-bloom__core,
    .prism-wire { filter: none; }
    .outgoing-beam__cone { opacity: .7; }
  }

  @media (prefers-reduced-motion: reduce) {
    .prism-shell, .prism-object { will-change: auto; }
    .collision-bloom__halo,
    .collision-bloom__core { display: none; }
  }
</style>
