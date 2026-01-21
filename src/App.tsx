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

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const UnlinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
  </svg>
);

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
  const [selectedToken, setSelectedToken] = useState<Token | null>(() => {
    const stored = localStorage.getItem('selectedToken');
    return stored ? JSON.parse(stored) : null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>(() =>
    (localStorage.getItem('timeframe') as Timeframe) || '24H'
  );
  const [interval, setInterval] = useState<Interval>(() =>
    (localStorage.getItem('interval') as Interval) || '5m'
  );
  const [aspectLocked, setAspectLocked] = useState(() =>
    localStorage.getItem('aspectLocked') === 'true'
  );
  const [chartWidth, setChartWidth] = useState(() =>
    Number(localStorage.getItem('chartWidth')) || 300
  );
  const [chartHeight, setChartHeight] = useState(() =>
    Number(localStorage.getItem('chartHeight')) || 100
  );
  const [lockedRatio, setLockedRatio] = useState(() =>
    Number(localStorage.getItem('lockedRatio')) || 3
  );
  const [fill, setFill] = useState(() =>
    localStorage.getItem('fill') !== 'false'
  );
  const [upColor, setUpColor] = useState(() => localStorage.getItem('upColor') || '#22C55E');
  const [downColor, setDownColor] = useState(() => localStorage.getItem('downColor') || '#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(() =>
    Number(localStorage.getItem('strokeWidth')) || 2
  );
  const [smooth, setSmooth] = useState(() =>
    localStorage.getItem('smooth') === 'true'
  );
  const [smoothTension, setSmoothTension] = useState(() =>
    Number(localStorage.getItem('smoothTension')) || 0.5
  );
  const [showKnob, setShowKnob] = useState(() =>
    localStorage.getItem('showKnob') === 'true'
  );
  const [knobSize, setKnobSize] = useState(() =>
    Number(localStorage.getItem('knobSize')) || 8
  );
  const [fadeEdges, setFadeEdges] = useState(() =>
    localStorage.getItem('fadeEdges') === 'true'
  );
  const [fadeAmount, setFadeAmount] = useState(() =>
    Number(localStorage.getItem('fadeAmount')) || 30
  );
  const [svgCode, setSvgCode] = useState('');
  const [isUp, setIsUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [priceData, setPriceData] = useState<[number, number][] | null>(null);

  // Dimension change handlers with aspect lock logic
  const handleWidthChange = (newWidth: number) => {
    setChartWidth(newWidth);
    if (aspectLocked && lockedRatio) {
      setChartHeight(Math.round(newWidth / lockedRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setChartHeight(newHeight);
    if (aspectLocked && lockedRatio) {
      setChartWidth(Math.round(newHeight * lockedRatio));
    }
  };

  const handleToggleLock = () => {
    if (!aspectLocked) {
      // Activating lock - capture current ratio
      setLockedRatio(chartWidth / chartHeight);
    }
    setAspectLocked(!aspectLocked);
  };

  // Persist all settings to localStorage
  useEffect(() => {
    localStorage.setItem('upColor', upColor);
  }, [upColor]);

  useEffect(() => {
    localStorage.setItem('downColor', downColor);
  }, [downColor]);

  useEffect(() => {
    if (selectedToken) {
      localStorage.setItem('selectedToken', JSON.stringify(selectedToken));
    }
  }, [selectedToken]);

  useEffect(() => {
    localStorage.setItem('timeframe', timeframe);
  }, [timeframe]);

  useEffect(() => {
    localStorage.setItem('interval', interval);
  }, [interval]);

  useEffect(() => {
    localStorage.setItem('aspectLocked', String(aspectLocked));
  }, [aspectLocked]);

  useEffect(() => {
    localStorage.setItem('chartWidth', String(chartWidth));
  }, [chartWidth]);

  useEffect(() => {
    localStorage.setItem('chartHeight', String(chartHeight));
  }, [chartHeight]);

  useEffect(() => {
    localStorage.setItem('lockedRatio', String(lockedRatio));
  }, [lockedRatio]);

  useEffect(() => {
    localStorage.setItem('fill', String(fill));
  }, [fill]);

  useEffect(() => {
    localStorage.setItem('strokeWidth', String(strokeWidth));
  }, [strokeWidth]);

  useEffect(() => {
    localStorage.setItem('smooth', String(smooth));
  }, [smooth]);

  useEffect(() => {
    localStorage.setItem('smoothTension', String(smoothTension));
  }, [smoothTension]);

  useEffect(() => {
    localStorage.setItem('showKnob', String(showKnob));
  }, [showKnob]);

  useEffect(() => {
    localStorage.setItem('knobSize', String(knobSize));
  }, [knobSize]);

  useEffect(() => {
    localStorage.setItem('fadeEdges', String(fadeEdges));
  }, [fadeEdges]);

  useEffect(() => {
    localStorage.setItem('fadeAmount', String(fadeAmount));
  }, [fadeAmount]);

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

  // Fetch data only when token, timeframe, or interval changes
  const fetchData = useCallback(async () => {
    if (!selectedToken) return;

    setLoading(true);
    try {
      const rawPrices = await getMarketChart(selectedToken.id, timeframe);
      const prices = sampleData(rawPrices, INTERVAL_SAMPLES[interval]);
      setPriceData(prices);
    } catch (err) {
      console.error('Failed to fetch chart:', err);
      setPriceData(null);
      setSvgCode('');
    } finally {
      setLoading(false);
    }
  }, [selectedToken, timeframe, interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate SVG when data or visual options change (no loading state)
  useEffect(() => {
    if (!priceData || priceData.length < 2) {
      setSvgCode('');
      return;
    }

    const backgroundColor = theme === 'dark' ? '#000000' : '#f4f4f5';
    const result = generateSparklineSVG(priceData, {
      width: chartWidth,
      height: chartHeight,
      fill,
      upColor,
      downColor,
      strokeWidth,
      smooth,
      smoothTension,
      showKnob,
      knobSize,
      backgroundColor,
      fadeEdges,
      fadeAmount,
    });
    setSvgCode(result.svg);
    setIsUp(result.isUp);
  }, [priceData, chartWidth, chartHeight, fill, upColor, downColor, strokeWidth, smooth, smoothTension, showKnob, knobSize, theme, fadeEdges, fadeAmount]);

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

          {/* Dimensions */}
          <div>
            <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Dimensions</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                label="W"
                size="sm"
                value={String(chartWidth)}
                onChange={(e) => handleWidthChange(Number(e.target.value) || 300)}
                endContent={<span className="text-xs text-zinc-500">px</span>}
                classNames={{ base: "flex-1" }}
              />
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={handleToggleLock}
                className={aspectLocked ? "text-primary" : "text-zinc-500"}
              >
                {aspectLocked ? <LinkIcon /> : <UnlinkIcon />}
              </Button>
              <Input
                type="number"
                label="H"
                size="sm"
                value={String(chartHeight)}
                onChange={(e) => handleHeightChange(Number(e.target.value) || 100)}
                endContent={<span className="text-xs text-zinc-500">px</span>}
                classNames={{ base: "flex-1" }}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Up Color</label>
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
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">Down Color</label>
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
              isSelected={showKnob}
              onValueChange={setShowKnob}
              size="sm"
            >
              <span className="text-sm">End Knob</span>
            </Switch>
            <Switch
              isSelected={fadeEdges}
              onValueChange={setFadeEdges}
              size="sm"
            >
              <span className="text-sm">Fade Edges</span>
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

          {/* Knob Size Slider */}
          {showKnob && (
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">
                Knob Size: {knobSize}px
              </label>
              <Slider
                size="sm"
                step={1}
                minValue={4}
                maxValue={24}
                value={knobSize}
                onChange={(v) => setKnobSize(v as number)}
                classNames={{
                  track: "dark:bg-zinc-700 bg-zinc-200",
                }}
              />
            </div>
          )}

          {/* Fade Amount Slider */}
          {fadeEdges && (
            <div>
              <label className="text-xs dark:text-zinc-400 text-zinc-600 mb-2 block">
                Fade Amount: {fadeAmount}%
              </label>
              <Slider
                size="sm"
                step={1}
                minValue={5}
                maxValue={60}
                value={fadeAmount}
                onChange={(v) => setFadeAmount(v as number)}
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
