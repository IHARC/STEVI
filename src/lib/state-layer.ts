const INTERACTION_STATES =
  "hover:state-layer-hover focus-visible:state-layer-focus active:state-layer-pressed"

const STATE_LAYER_TONES = {
  primary: `state-layer-color-primary ${INTERACTION_STATES}`,
  "primary-container": `state-layer-color-primary-container ${INTERACTION_STATES}`,
  surface: `state-layer-color-surface ${INTERACTION_STATES}`,
  "surface-container": `state-layer-color-surface-container ${INTERACTION_STATES}`,
  inverse: `state-layer-color-inverse-surface ${INTERACTION_STATES}`,
  error: `state-layer-color-error ${INTERACTION_STATES}`,
} as const

export type StateLayerTone = keyof typeof STATE_LAYER_TONES

export function getStateLayerClasses(tone: StateLayerTone | null | undefined) {
  if (!tone) {
    return ""
  }
  return STATE_LAYER_TONES[tone]
}
