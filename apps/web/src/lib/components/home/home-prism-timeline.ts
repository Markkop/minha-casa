export type HomePrismTimelineOptions = {
  mobile?: boolean;
  reducedMotion?: boolean;
};

export type HomePrismTimelineState = {
  progress: number;
  prismProgress: number;
  incomingBeamProgress: number;
  collisionPulse: number;
  outgoingBeamProgress: number;
  listRevealProgress: number;
  photoParallaxProgress: number;
  photoAtmosphere: number;
};

type TimelinePhases = {
  prismStart: number;
  collision: number;
  pulseEnd: number;
  outgoingEnd: number;
  listStart: number;
};

const DESKTOP_PHASES: TimelinePhases = {
  prismStart: 0.15,
  collision: 0.6,
  pulseEnd: 0.62,
  outgoingEnd: 0.88,
  listStart: 0.88
};

// Mobile has no photo cards, so it can omit the desktop introduction hold.
const MOBILE_PHASES: TimelinePhases = {
  prismStart: 0,
  collision: 0.44,
  pulseEnd: 0.48,
  outgoingEnd: 0.78,
  listStart: 0.72
};

export function getHomePrismCollisionProgress(mobile = false): number {
  return (mobile ? MOBILE_PHASES : DESKTOP_PHASES).collision;
}

const FINAL_PHOTO_ATMOSPHERE = 0.42;

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const progress = clampUnit(value);
  return progress * progress * (3 - 2 * progress);
}

function phaseProgress(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return smoothstep((progress - start) / (end - start));
}

function collisionPulse(progress: number, collision: number, pulseEnd: number): number {
  if (progress <= collision) return 0;
  if (progress >= pulseEnd) return 1;

  return smoothstep((progress - collision) / (pulseEnd - collision));
}

function finalState(mobile: boolean): HomePrismTimelineState {
  return {
    progress: 1,
    prismProgress: 1,
    incomingBeamProgress: mobile ? 0 : 1,
    collisionPulse: 1,
    outgoingBeamProgress: 1,
    listRevealProgress: 1,
    photoParallaxProgress: mobile ? 0 : 1,
    photoAtmosphere: mobile ? 0 : FINAL_PHOTO_ATMOSPHERE
  };
}

/**
 * Maps normalized page scroll to presentation-only values for the home prism scene.
 * Every returned value is constrained to 0..1 and can be applied directly to CSS/SVG.
 */
export function getHomePrismTimeline(
  scrollProgress: number,
  options: HomePrismTimelineOptions = {}
): HomePrismTimelineState {
  const mobile = options.mobile ?? false;
  if (options.reducedMotion) return finalState(mobile);

  const progress = clampUnit(scrollProgress);
  const phases = mobile ? MOBILE_PHASES : DESKTOP_PHASES;
  const prismProgress = phaseProgress(progress, phases.prismStart, phases.collision);
  const outgoingBeamProgress = phaseProgress(
    progress,
    phases.collision,
    phases.outgoingEnd
  );
  const listRevealProgress = phaseProgress(progress, phases.listStart, 1);

  if (mobile) {
    return {
      progress,
      prismProgress,
      incomingBeamProgress: 0,
      collisionPulse: collisionPulse(progress, phases.collision, phases.pulseEnd),
      outgoingBeamProgress,
      listRevealProgress,
      photoParallaxProgress: 0,
      photoAtmosphere: 0
    };
  }

  const photoAtmosphereProgress = phaseProgress(
    progress,
    phases.collision,
    phases.outgoingEnd
  );

  return {
    progress,
    prismProgress,
    incomingBeamProgress: prismProgress,
    collisionPulse: collisionPulse(progress, phases.collision, phases.pulseEnd),
    outgoingBeamProgress,
    listRevealProgress,
    photoParallaxProgress: prismProgress,
    photoAtmosphere: 1 - photoAtmosphereProgress * (1 - FINAL_PHOTO_ATMOSPHERE)
  };
}
