export type HomeConnectorPolicy = {
  visible: boolean;
  animated: boolean;
};

export function homeConnectorPolicy(
  viewportWidth: number,
  reducedMotion: boolean
): HomeConnectorPolicy {
  const visible = viewportWidth > 720;

  return {
    visible,
    animated: visible && !reducedMotion
  };
}
