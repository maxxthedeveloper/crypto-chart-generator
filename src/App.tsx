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

type Timeframe = '1H' | '24H' | '7D' | '30D';
type AspectRatio = '16:9' | '3:1' | '4:1' | 'Custom';

const ASPECT_RATIOS: Record<Exclude<AspectRatio, 'Custom'>, number> = {
  '16:9': 16 / 9,
  '3:1': 3,
  '4:1': 4,
};

function App() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:1');
  const [chartWidth, setChartWidth] = useState(300);
  const [customHeight, setCustomHeight] = useState(100);
  const [fill, setFill] = useState(true);
  const [upColor, setUpColor] = useState('#00C853');
  const [downColor, setDownColor] = useState('#FF5A5A');
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
      const prices = await getMarketChart(selectedToken.id, timeframe);
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
  }, [selectedToken, timeframe, chartWidth, chartHeight, fill, upColor, downColor, strokeWidth, smooth, smoothTension]);

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
      <Card className="w-80 rounded-none border-r border-zinc-800 bg-zinc-900 h-screen overflow-y-auto">
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
                  <span className="text-zinc-400 text-sm">{token.name}</span>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>

          {/* Timeframe */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Timeframe</label>
            <Tabs
              selectedKey={timeframe}
              onSelectionChange={(key) => setTimeframe(key as Timeframe)}
              fullWidth
              size="sm"
              classNames={{ tabList: "bg-zinc-800" }}
            >
              <Tab key="1H" title="1H" />
              <Tab key="24H" title="24H" />
              <Tab key="7D" title="7D" />
              <Tab key="30D" title="30D" />
            </Tabs>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Aspect Ratio</label>
            <Tabs
              selectedKey={aspectRatio}
              onSelectionChange={(key) => setAspectRatio(key as AspectRatio)}
              fullWidth
              size="sm"
              classNames={{ tabList: "bg-zinc-800" }}
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
              endContent={<span className="text-zinc-500 text-xs">px</span>}
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
              endContent={<span className="text-zinc-500 text-xs">px</span>}
              isReadOnly={aspectRatio !== 'Custom'}
              classNames={{
                input: aspectRatio !== 'Custom' ? 'text-zinc-500' : '',
              }}
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Up Color</label>
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
              <label className="text-xs text-zinc-400 mb-2 block">Down Color</label>
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
            <label className="text-xs text-zinc-400 mb-2 block">
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
                track: "bg-zinc-700",
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
          </div>

          {/* Smooth Tension Slider */}
          {smooth && (
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">
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
                  track: "bg-zinc-700",
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
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center justify-center gap-4">
          {loading ? (
            <Spinner size="lg" />
          ) : svgCode ? (
            <>
              {selectedToken && (
                <span className="text-zinc-500 text-sm font-medium tracking-wide">
                  {selectedToken.symbol}
                </span>
              )}
              <div dangerouslySetInnerHTML={{ __html: svgCode }} />
            </>
          ) : (
            <>
              <span className="text-zinc-600 text-lg">
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
