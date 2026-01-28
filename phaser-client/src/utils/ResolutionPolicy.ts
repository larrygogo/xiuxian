import type { Rect, Size } from '@/ui/safearea/types';

export enum ResolutionPolicy {
  SHOW_ALL = 'SHOW_ALL',
  NO_BORDER = 'NO_BORDER',
  FIXED_WIDTH = 'FIXED_WIDTH',
  FIXED_HEIGHT = 'FIXED_HEIGHT'
}

export type ResolutionPolicyMode = 'AUTO' | ResolutionPolicy;

export interface ResolutionPolicyOptions {
  mode?: ResolutionPolicyMode;
  epsilon?: number;
}

export interface ResolutionInfo {
  policy: ResolutionPolicy;
  scale: number;
  viewRect: Rect;
  designRect: Rect;
  designSize: Size;
  displaySize: Size;
}

const DEFAULT_EPSILON = 0.01;

export function resolveResolution(
  designSize: Size,
  displaySize: Size,
  options?: ResolutionPolicyOptions
): ResolutionInfo {
  const designWidth = designSize.width;
  const designHeight = designSize.height;
  const displayWidth = Math.max(1, displaySize.width);
  const displayHeight = Math.max(1, displaySize.height);

  const policy = resolvePolicy(designSize, displaySize, options);
  const scale = calculateScale(policy, designSize, displaySize);

  const viewWidth = displayWidth / scale;
  const viewHeight = displayHeight / scale;

  const viewRect: Rect = {
    x: (designWidth - viewWidth) / 2,
    y: (designHeight - viewHeight) / 2,
    width: viewWidth,
    height: viewHeight
  };

  return {
    policy,
    scale,
    viewRect,
    designRect: { x: 0, y: 0, width: designWidth, height: designHeight },
    designSize,
    displaySize
  };
}

function resolvePolicy(
  designSize: Size,
  displaySize: Size,
  options?: ResolutionPolicyOptions
): ResolutionPolicy {
  const mode = options?.mode || 'AUTO';
  if (mode !== 'AUTO') {
    return mode;
  }

  const epsilon = options?.epsilon ?? DEFAULT_EPSILON;
  const designRatio = designSize.width / designSize.height;
  const displayRatio = displaySize.width / displaySize.height;

  if (displayRatio < designRatio - epsilon) {
    return ResolutionPolicy.FIXED_WIDTH;
  }
  if (displayRatio > designRatio + epsilon) {
    return ResolutionPolicy.FIXED_HEIGHT;
  }

  return ResolutionPolicy.SHOW_ALL;
}

function calculateScale(
  policy: ResolutionPolicy,
  designSize: Size,
  displaySize: Size
): number {
  const scaleX = displaySize.width / designSize.width;
  const scaleY = displaySize.height / designSize.height;

  switch (policy) {
    case ResolutionPolicy.NO_BORDER:
      return Math.max(scaleX, scaleY);
    case ResolutionPolicy.FIXED_WIDTH:
      return scaleX;
    case ResolutionPolicy.FIXED_HEIGHT:
      return scaleY;
    case ResolutionPolicy.SHOW_ALL:
    default:
      return Math.min(scaleX, scaleY);
  }
}
