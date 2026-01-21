import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  Input,
  Tabs,
  Tab,
  Switch,
  Button,
  Autocomplete,
  AutocompleteItem,
  Spinner,
  Slider,
} from '@heroui/react';
import { searchTokens, getMarketChart, Token } from './lib/api';
import { generateSparklineSVG } from './lib/svg';
import { useTheme } from './main';

type Timeframe = '1H' | '24H' | '7D' | '30D';
type Interval = '5m' | '15m' | '1h' | '4h';
type AspectRatio = '16:9' | '3:1' | '4:1' | 'Custom';

const ASPECT_RATIOS: Record<Exclude<AspectRatio, 'Custom'>, number> = {
  '16:9': 16 / 9,
  '3:1': 3,
  '4:1': 4,
};

const INTERVAL_SAMPLES: Record<Interval, number> = {
  '5m': 1,
  '15m': 3,
  '1h': 12,
  '4h': 48,
};

function sampleData(data: [number, number][], interval: number): [number, number][] {
  if (interval <= 1) return data;
  return data.filter((_, i) => i % interval === 0);
}

function App() {
  const { theme, setTheme } = useTheme();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [interval, setInterval] = useState<Interval>('5m');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:1');
  const [chartWidth, setChartWidth] = useState(300);
  const [customHeight, setCustomHeight] = useState(100);
  const [fill, setFill] = useState(true);
  const [upColor, setUpColor] = useState(() => localStorage.getItem('upColor') || '#22C55E');
  const [downColor, setDownColor] = useState(() => localStorage.getItem('downColor') || '#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [smooth, setSmooth] = useState(false);
  const [smoothTension, setSmoothTension] = useState(0.5);
  const [svgCode, setSvgCode] = useState('');
  const [isUp, setIsUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const chartHeight = aspectRatio === 'Custom'
    ? customHeight
    : Math.round(chartWidth / ASPECT_RATIOS[aspectRatio]);

  useEffect(() => {
    localStorage.setItem('upColor', upColor);
  }, [upColor]);

  useEffect(() => {
    localStorage.setItem('downColor', downColor);
  }, [downColor]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        try {
          const results = await searchTokens(searchQuery);
          setTokens(results);
        } catch {
          setTokens([]);
        }
      } else {
        setTokens([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchChart = useCallback(async () => {
    if (!selectedToken) return;

    setLoading(true);
    try {
      const rawPrices = await getMarketChart(selectedToken.id, timeframe);
      const prices = sampleData(rawPrices, INTERVAL_SAMPLES[interval]);
      const result = generateSparklineSVG(prices, {
        width: chartWidth,
        height: chartHeight,
        fill,
        upColor,
        downColor,
        strokeWidth,
        smooth,
        smoothTension,
      });
      setSvgCode(result.svg);
      setIsUp(result.isUp);
    } catch (err) {
      console.error('Failed to fetch chart:', err);
      setSvgCode('');
    } finally {
      setLoading(false);
    }
  }, [selectedToken, timeframe, interval, chartWidth, chartHeight, fill, upColor, downColor, strokeWidth, smooth, smoothTension]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const handleCopy = async () => {
    if (!svgCode) return;
    await navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTokenSelect = (key: React.Key | null) => {
    if (key) {
      const token = tokens.find(t => t.id === key);
      if (token) {
        setSelectedToken(token);
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left sidebar - Controls */}
      <Card className="w-80 rounded-none border-r dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900 bg-white h-screen overflow-y-auto">
        <CardBody className="gap-5 p-5">
          {/* Token Search */}
          <Autocomplete
            label="Token"
            placeholder="SOL, ETH, BTC..."
            inputValue={searchQuery}
            onInputChange={setSearchQuery}
            onSelectionChange={handleTokenSelect}
            items={tokens}
            size="sm"
          >
            {(token) => (
              <AutocompleteItem key={token.id} textValue={token.symbol}>
                <div className="flex gap-2 items-center">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="dark:text-zinc-400 text-zinc-600 text-sm">{token.name}</span>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>

          {/* Timeframe */}
          <div>
            <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Timeframe</label>
            <Tabs
              selectedKey={timeframe}
              onSelectionChange={(key) => setTimeframe(key as Timeframe)}
              fullWidth
              size="sm"
              classNames={{ tabList: "dark:bg-zinc-800 bg-zinc-100" }}
            >
              <Tab key="1H" title="1H" />
              <Tab key="24H" title="24H" />
              <Tab key="7D" title="7D" />
              <Tab key="30D" title="30D" />
            </Tabs>
          </div>

          {/* Interval */}
          <div>
            <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Interval</label>
            <Tabs
              selectedKey={interval}
              onSelectionChange={(key) => setInterval(key as Interval)}
              fullWidth
              size="sm"
              classNames={{ tabList: "dark:bg-zinc-800 bg-zinc-100" }}
            >
              <Tab key="5m" title="5m" />
              <Tab key="15m" title="15m" />
              <Tab key="1h" title="1h" />
              <Tab key="4h" title="4h" />
            </Tabs>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Aspect Ratio</label>
            <Tabs
              selectedKey={aspectRatio}
              onSelectionChange={(key) => setAspectRatio(key as AspectRatio)}
              fullWidth
              size="sm"
              classNames={{ tabList: "dark:bg-zinc-800 bg-zinc-100" }}
            >
              <Tab key="16:9" title="16:9" />
              <Tab key="3:1" title="3:1" />
              <Tab key="4:1" title="4:1" />
              <Tab key="Custom" title="Custom" />
            </Tabs>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              label="Width"
              size="sm"
              value={String(chartWidth)}
              onChange={(e) => setChartWidth(Number(e.target.value) || 300)}
              endContent={<span className="dark:text-zinc-500 text-zinc-400 text-xs">px</span>}
            />
            <Input
              type="number"
              label="Height"
              size="sm"
              value={String(chartHeight)}
              onChange={(e) => {
                if (aspectRatio !== 'Custom') setAspectRatio('Custom');
                setCustomHeight(Number(e.target.value) || 100);
              }}
              endContent={<span className="dark:text-zinc-500 text-zinc-400 text-xs">px</span>}
              isReadOnly={aspectRatio !== 'Custom'}
              classNames={{
                input: aspectRatio !== 'Custom' ? 'dark:text-zinc-500 text-zinc-400' : '',
              }}
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Green</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={upColor}
                  onChange={(e) => setUpColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <Input
                  size="sm"
                  value={upColor}
                  onChange={(e) => setUpColor(e.target.value)}
                  classNames={{ base: "flex-1" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Red</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={downColor}
                  onChange={(e) => setDownColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <Input
                  size="sm"
                  value={downColor}
                  onChange={(e) => setDownColor(e.target.value)}
                  classNames={{ base: "flex-1" }}
                />
              </div>
            </div>
          </div>

          {/* Line Thickness */}
          <div>
            <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">
              Line Thickness: {strokeWidth}px
            </label>
            <Slider
              size="sm"
              step={0.5}
              minValue={1}
              maxValue={5}
              value={strokeWidth}
              onChange={(v) => setStrokeWidth(v as number)}
              classNames={{
                track: "dark:bg-zinc-700 bg-zinc-200",
              }}
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <Switch
              isSelected={fill}
              onValueChange={setFill}
              size="sm"
            >
              <span className="text-sm">Gradient Fill</span>
            </Switch>
            <Switch
              isSelected={smooth}
              onValueChange={setSmooth}
              size="sm"
            >
              <span className="text-sm">Smooth Curves</span>
            </Switch>
            <Switch
              isSelected={theme === 'dark'}
              onValueChange={(isDark) => setTheme(isDark ? 'dark' : 'light')}
              size="sm"
            >
              <span className="text-sm">Dark Mode</span>
            </Switch>
          </div>

          {/* Smooth Tension Slider */}
          {smooth && (
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">
                Curve Tension: {smoothTension.toFixed(2)}
              </label>
              <Slider
                size="sm"
                step={0.05}
                minValue={0.1}
                maxValue={1}
                value={smoothTension}
                onChange={(v) => setSmoothTension(v as number)}
                classNames={{
                  track: "dark:bg-zinc-700 bg-zinc-200",
                }}
              />
            </div>
          )}

          {/* Copy Button */}
          <Button
            onPress={handleCopy}
            isDisabled={!svgCode}
            color={isUp ? 'success' : 'danger'}
            variant="flat"
            fullWidth
            className="mt-auto"
          >
            {copied ? 'Copied!' : 'Copy SVG'}
          </Button>
        </CardBody>
      </Card>

      {/* Main area - Chart centered */}
      <div className="flex-1 flex items-center justify-center dark:bg-black bg-zinc-100">
        <div className="flex flex-col items-center justify-center gap-4">
          {loading ? (
            <Spinner size="lg" />
          ) : svgCode ? (
            <>
              {selectedToken && (
                <span className="dark:text-zinc-500 text-zinc-400 text-sm font-medium tracking-wide">
                  {selectedToken.symbol}
                </span>
              )}
              <div dangerouslySetInnerHTML={{ __html: svgCode }} />
            </>
          ) : (
            <>
              <span className="dark:text-zinc-600 text-zinc-400 text-lg">
                {selectedToken ? 'No data' : 'Select a token'}
              </span>
              {!selectedToken && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setSelectedToken({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' })}
                  >
                    BTC
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setSelectedToken({ id: 'ethereum', symbol: 'ETH', name: 'Ethereum' })}
                  >
                    ETH
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setSelectedToken({ id: 'solana', symbol: 'SOL', name: 'Solana' })}
                  >
                    SOL
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
