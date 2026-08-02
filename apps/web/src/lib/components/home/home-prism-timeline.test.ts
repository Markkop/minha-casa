import { describe, expect, it } from "vitest";
import {
  getHomePrismCollisionProgress,
  getHomePrismTimeline
} from "$lib/components/home/home-prism-timeline";

describe("home prism timeline", () => {
  it("exposes the collision point used by the responsive layout", () => {
    expect(getHomePrismCollisionProgress()).toBe(0.6);
    expect(getHomePrismCollisionProgress(true)).toBe(0.44);
  });

  it("clamps scroll progress to the scene bounds", () => {
    expect(getHomePrismTimeline(-1)).toMatchObject({
      progress: 0,
      prismProgress: 0,
      incomingBeamProgress: 0,
      outgoingBeamProgress: 0,
      listRevealProgress: 0,
      listGlowProgress: 0
    });
    expect(getHomePrismTimeline(2)).toMatchObject({
      progress: 1,
      prismProgress: 1,
      incomingBeamProgress: 1,
      outgoingBeamProgress: 1,
      listRevealProgress: 1,
      listGlowProgress: 1
    });
  });

  it("keeps the desktop introduction still through 15 percent", () => {
    expect(getHomePrismTimeline(0.15)).toMatchObject({
      prismProgress: 0,
      incomingBeamProgress: 0,
      outgoingBeamProgress: 0,
      listRevealProgress: 0,
      photoParallaxProgress: 0,
      photoAtmosphere: 1
    });

    const descending = getHomePrismTimeline(0.375);
    expect(descending.prismProgress).toBeCloseTo(0.5);
    expect(descending.incomingBeamProgress).toBeCloseTo(0.5);
    expect(descending.photoParallaxProgress).toBeCloseTo(0.5);
  });

  it("stops the prism at the collision point", () => {
    expect(getHomePrismTimeline(0.6).prismProgress).toBe(1);
    expect(getHomePrismTimeline(0.75).prismProgress).toBe(1);
    expect(getHomePrismTimeline(1).prismProgress).toBe(1);
  });

  it("ramps the collision bloom to full intensity and holds it", () => {
    expect(getHomePrismTimeline(0.6).collisionPulse).toBe(0);
    expect(getHomePrismTimeline(0.61).collisionPulse).toBeCloseTo(0.5);
    expect(getHomePrismTimeline(0.62).collisionPulse).toBe(1);
    expect(getHomePrismTimeline(1).collisionPulse).toBe(1);
  });

  it("starts the outgoing beam only after 60 percent", () => {
    expect(getHomePrismTimeline(0.59).outgoingBeamProgress).toBe(0);
    expect(getHomePrismTimeline(0.6).outgoingBeamProgress).toBe(0);
    expect(getHomePrismTimeline(0.7).outgoingBeamProgress).toBeGreaterThan(0);
    expect(getHomePrismTimeline(0.9).outgoingBeamProgress).toBe(1);
  });

  it("reveals the list with the beam, then applies its final glow", () => {
    const travelling = getHomePrismTimeline(0.75);
    expect(travelling.listRevealProgress).toBe(travelling.outgoingBeamProgress);
    expect(travelling.listRevealProgress).toBeGreaterThan(0);
    expect(travelling.listRevealProgress).toBeLessThan(1);
    expect(travelling.listGlowProgress).toBe(0);

    expect(getHomePrismTimeline(0.9)).toMatchObject({
      outgoingBeamProgress: 1,
      listRevealProgress: 1,
      listGlowProgress: 0
    });
    expect(getHomePrismTimeline(0.95).listGlowProgress).toBeCloseTo(0.5);
    expect(getHomePrismTimeline(1).listGlowProgress).toBe(1);
  });

  it("reduces the photo contrast only after collision", () => {
    expect(getHomePrismTimeline(0.6).photoAtmosphere).toBe(1);
    expect(getHomePrismTimeline(0.7).photoAtmosphere).toBeLessThan(1);
    expect(getHomePrismTimeline(0.9).photoAtmosphere).toBeCloseTo(0.42);
    expect(getHomePrismTimeline(1).photoAtmosphere).toBeCloseTo(0.42);
  });

  it("uses a shorter mobile timeline without photo parallax", () => {
    const initial = getHomePrismTimeline(0, { mobile: true });
    const arrived = getHomePrismTimeline(0.44, { mobile: true });
    const projecting = getHomePrismTimeline(0.6, { mobile: true });

    expect(initial.prismProgress).toBe(0);
    expect(arrived.prismProgress).toBe(1);
    expect(projecting.outgoingBeamProgress).toBeGreaterThan(0);

    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const timeline = getHomePrismTimeline(progress, { mobile: true });
      expect(timeline).toMatchObject({
        photoParallaxProgress: 0,
        photoAtmosphere: 0
      });
      expect(timeline.incomingBeamProgress).toBe(timeline.prismProgress);
    }
  });

  it("returns the final static composition for reduced motion", () => {
    expect(getHomePrismTimeline(0, { reducedMotion: true })).toEqual({
      progress: 1,
      prismProgress: 1,
      incomingBeamProgress: 1,
      collisionPulse: 1,
      outgoingBeamProgress: 1,
      listRevealProgress: 1,
      listGlowProgress: 1,
      photoParallaxProgress: 1,
      photoAtmosphere: 0.42
    });

    expect(getHomePrismTimeline(0.3, { mobile: true, reducedMotion: true })).toMatchObject({
      progress: 1,
      prismProgress: 1,
      incomingBeamProgress: 1,
      collisionPulse: 1,
      outgoingBeamProgress: 1,
      listRevealProgress: 1,
      listGlowProgress: 1,
      photoParallaxProgress: 0,
      photoAtmosphere: 0
    });
  });
});
