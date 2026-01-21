export interface SparklineOptions {
  width: number;
  height: number;
  fill: boolean;
  strokeWidth?: number;
  padding?: number;
  upColor?: string;
  downColor?: string;
  customColor?: string | null;
  smooth?: boolean;
  smoothTension?: number;
  showKnob?: boolean;
  knobSize?: number;
  backgroundColor?: string;
  fadeEdges?: boolean;
  fadeAmount?: number;
}

export interface SparklineResult {
  svg: string;
  isUp: boolean;
}

interface Point {
  x: number;
  y: number;
}

function catmullRomToBezier(points: Point[], tension: number = 0.5): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

function straightPath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function generateSparklineSVG(
  prices: [number, number][],
  options: SparklineOptions
): SparklineResult {
  const {
    width,
    height,
    fill,
    strokeWidth = 2,
    padding = 4,
    upColor = '#00C853',
    downColor = '#FF5A5A',
    customColor = null,
    smooth = false,
    smoothTension = 0.5,
    showKnob = false,
    knobSize = 8,
    backgroundColor = '#000000',
    fadeEdges = false,
    fadeAmount = 30,
  } = options;

  if (prices.length < 2) {
    return { svg: '', isUp: true };
  }

  const values = prices.map(p => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Add extra padding for knob to prevent clipping
  const knobRadius = knobSize / 2;
  const basePadding = showKnob
    ? Math.max(padding, knobRadius + strokeWidth / 2)
    : padding;

  // Add extra padding for smooth curves to prevent bezier overshoot clipping
  const baseChartHeight = height - basePadding * 2;
  const smoothPadding = smooth ? Math.ceil(baseChartHeight * smoothTension * 0.15) : 0;
  const effectivePadding = basePadding + smoothPadding;

  const chartWidth = width - effectivePadding * 2;
  const chartHeight = height - effectivePadding * 2;

  const points: Point[] = values.map((value, index) => ({
    x: effectivePadding + (index / (values.length - 1)) * chartWidth,
    y: effectivePadding + chartHeight - ((value - min) / range) * chartHeight,
  }));

  const isUp = values[values.length - 1] >= values[0];
  const strokeColor = customColor || (isUp ? upColor : downColor);

  const linePath = smooth ? catmullRomToBezier(points, smoothTension) : straightPath(points);

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const rgb = hexToRgb(strokeColor);
  const rgbStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '0, 0, 0';

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  let fillPath = '';
  if (fill) {
    fillPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${height - effectivePadding} L ${firstPoint.x.toFixed(2)} ${height - effectivePadding} Z`;
  }

  const knobElement = showKnob
    ? `  <circle cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="${knobRadius}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${backgroundColor}" />`
    : '';

  // Fade mask for edges
  const maskId = `fade-mask-${Math.random().toString(36).substr(2, 9)}`;
  const fadeLeftId = `fade-left-${Math.random().toString(36).substr(2, 9)}`;
  const fadeRightId = `fade-right-${Math.random().toString(36).substr(2, 9)}`;
  const fadePercent = fadeAmount / 100;
  const fadeLeft = fadeEdges;
  const fadeRight = fadeEdges && !showKnob;

  // Use alpha-based masking (stop-opacity) for universal compatibility across renderers
  // Eased gradient stops follow ease-out-sine curve for smooth perceptual fade
  const fadeMaskDef = fadeEdges ? `
    <linearGradient id="${fadeLeftId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="white" stop-opacity="0" />
      <stop offset="19%" stop-color="white" stop-opacity="0.05" />
      <stop offset="34%" stop-color="white" stop-opacity="0.15" />
      <stop offset="47%" stop-color="white" stop-opacity="0.26" />
      <stop offset="56.5%" stop-color="white" stop-opacity="0.36" />
      <stop offset="65%" stop-color="white" stop-opacity="0.48" />
      <stop offset="73%" stop-color="white" stop-opacity="0.62" />
      <stop offset="80.2%" stop-color="white" stop-opacity="0.75" />
      <stop offset="86.1%" stop-color="white" stop-opacity="0.84" />
      <stop offset="91%" stop-color="white" stop-opacity="0.91" />
      <stop offset="95.2%" stop-color="white" stop-opacity="0.96" />
      <stop offset="100%" stop-color="white" stop-opacity="1" />
    </linearGradient>
    <linearGradient id="${fadeRightId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="white" stop-opacity="1" />
      <stop offset="4.8%" stop-color="white" stop-opacity="0.96" />
      <stop offset="9%" stop-color="white" stop-opacity="0.91" />
      <stop offset="13.9%" stop-color="white" stop-opacity="0.84" />
      <stop offset="19.8%" stop-color="white" stop-opacity="0.75" />
      <stop offset="27%" stop-color="white" stop-opacity="0.62" />
      <stop offset="35%" stop-color="white" stop-opacity="0.48" />
      <stop offset="43.5%" stop-color="white" stop-opacity="0.36" />
      <stop offset="53%" stop-color="white" stop-opacity="0.26" />
      <stop offset="66%" stop-color="white" stop-opacity="0.15" />
      <stop offset="81%" stop-color="white" stop-opacity="0.05" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <mask id="${maskId}">
      ${fadeLeft ? `<rect width="${width * fadePercent}" height="${height}" fill="url(#${fadeLeftId})" />` : ''}
      <rect x="${fadeLeft ? width * fadePercent : 0}" width="${width - (fadeLeft ? width * fadePercent : 0) - (fadeRight ? width * fadePercent : 0)}" height="${height}" fill="white" />
      ${fadeRight ? `<rect x="${width * (1 - fadePercent)}" width="${width * fadePercent}" height="${height}" fill="url(#${fadeRightId})" />` : ''}
    </mask>` : '';

  const maskAttr = fadeEdges ? ` mask="url(#${maskId})"` : '';

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgb(${rgbStr})" stop-opacity="0.3" />
      <stop offset="100%" stop-color="rgb(${rgbStr})" stop-opacity="0" />
    </linearGradient>${fadeMaskDef}
  </defs>
  <g${maskAttr}>
${fill ? `    <path d="${fillPath}" fill="url(#${gradientId})" />` : ''}
    <path d="${linePath}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
${knobElement}
</svg>`;

  return { svg, isUp };
}
