import type { CodexModel } from '../types';

export function reasoningLevels(model?: CodexModel) {
  return model?.supportedReasoningEfforts.filter(level => level.reasoningEffort !== 'ultra') || [];
}
