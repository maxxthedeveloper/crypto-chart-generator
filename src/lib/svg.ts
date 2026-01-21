export interface SparklineOptions {
  width: number;
  height: number;
  fill: boolean;
  strokeWidth?: number;
  padding?: number;
}

export interface SparklineResult {
  svg: string;
  isUp: boolean;
}

const COLORS = {
  up: {
    stroke: '#00C853',
    fill: 'rgba(0, 200, 83, 0.15)',
  },
  down: {
    stroke: '#FF5A5A',
    fill: 'rgba(255, 90, 90, 0.15)',
  },
};

export function generateSparklineSVG(
  prices: [number, number][],
  options: SparklineOptions
): SparklineResult {
  const { width, height, fill, strokeWidth = 2, padding = 4 } = options;

  if (prices.length < 2) {
    return { svg: '', isUp: true };
  }

  const values = prices.map(p => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Generate points
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  // Build path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  // Check if price went up or down
  const isUp = values[values.length - 1] >= values[0];
  const colors = isUp ? COLORS.up : COLORS.down;

  let fillPath = '';
  if (fill) {
    fillPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${padding} ${height - padding} Z`;
  }

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
${fill ? `  <path d="${fillPath}" fill="${colors.fill}" />` : ''}
  <path d="${linePath}" stroke="${colors.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>`;

  return { svg, isUp };
}
