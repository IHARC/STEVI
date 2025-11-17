const INTERACTION_STATES =
  "hover:state-layer-hover focus-visible:state-layer-focus active:state-layer-pressed"

const BASE_STATE_LAYER_TONES = {
  primary: `state-layer-color-primary ${INTERACTION_STATES}`,
  "primary-container": `state-layer-color-primary-container ${INTERACTION_STATES}`,
  secondary: `state-layer-color-secondary ${INTERACTION_STATES}`,
  "secondary-container": `state-layer-color-secondary-container ${INTERACTION_STATES}`,
  surface: `state-layer-color-surface ${INTERACTION_STATES}`,
  "surface-container": `state-layer-color-surface-container ${INTERACTION_STATES}`,
  inverse: `state-layer-color-inverse-surface ${INTERACTION_STATES}`,
  error: `state-layer-color-error ${INTERACTION_STATES}`,
} as const

const STATE_LAYER_TONES = {
  ...BASE_STATE_LAYER_TONES,
  brand: BASE_STATE_LAYER_TONES.primary,
  "brand-soft": BASE_STATE_LAYER_TONES["primary-container"],
  supportive: BASE_STATE_LAYER_TONES.secondary,
  "supportive-container": BASE_STATE_LAYER_TONES["secondary-container"],
  destructive: BASE_STATE_LAYER_TONES.error,
  neutral: BASE_STATE_LAYER_TONES.surface,
  "neutral-container": BASE_STATE_LAYER_TONES["surface-container"],
} as const

export type StateLayerTone = keyof typeof STATE_LAYER_TONES

export function getStateLayerClasses(tone: StateLayerTone | null | undefined) {
  if (!tone) {
    return ""
  }
  return STATE_LAYER_TONES[tone]
}
