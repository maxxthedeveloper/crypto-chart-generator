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
} from '@heroui/react';
import { searchTokens, getMarketChart, Token } from './lib/api';
import { generateSparklineSVG } from './lib/svg';

type Timeframe = '1H' | '24H' | '7D' | '30D';

function App() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(60);
  const [fill, setFill] = useState(true);
  const [svgCode, setSvgCode] = useState('');
  const [isUp, setIsUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search tokens
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

  // Fetch chart data when token or timeframe changes
  const fetchChart = useCallback(async () => {
    if (!selectedToken) return;

    setLoading(true);
    try {
      const prices = await getMarketChart(selectedToken.id, timeframe);
      const result = generateSparklineSVG(prices, { width, height, fill });
      setSvgCode(result.svg);
      setIsUp(result.isUp);
    } catch (err) {
      console.error('Failed to fetch chart:', err);
      setSvgCode('');
    } finally {
      setLoading(false);
    }
  }, [selectedToken, timeframe, width, height, fill]);

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border border-zinc-800">
        <CardBody className="gap-4">
          <Autocomplete
            label="Token"
            placeholder="Search by symbol (SOL, ETH, BTC...)"
            inputValue={searchQuery}
            onInputChange={setSearchQuery}
            onSelectionChange={handleTokenSelect}
            items={tokens}
            classNames={{
              base: "w-full",
            }}
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

          <Tabs
            selectedKey={timeframe}
            onSelectionChange={(key) => setTimeframe(key as Timeframe)}
            fullWidth
            size="sm"
            classNames={{
              tabList: "bg-zinc-800",
            }}
          >
            <Tab key="1H" title="1H" />
            <Tab key="24H" title="24H" />
            <Tab key="7D" title="7D" />
            <Tab key="30D" title="30D" />
          </Tabs>

          <div className="flex gap-2 items-center">
            <Input
              type="number"
              label="W"
              size="sm"
              value={String(width)}
              onChange={(e) => setWidth(Number(e.target.value) || 200)}
              classNames={{ base: "w-24" }}
            />
            <span className="text-zinc-500">×</span>
            <Input
              type="number"
              label="H"
              size="sm"
              value={String(height)}
              onChange={(e) => setHeight(Number(e.target.value) || 60)}
              classNames={{ base: "w-24" }}
            />
            <div className="flex-1" />
            <Switch
              isSelected={fill}
              onValueChange={setFill}
              size="sm"
            >
              Fill
            </Switch>
          </div>

          <div
            className="bg-zinc-950 rounded-lg flex items-center justify-center min-h-[100px] border border-zinc-800"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : svgCode ? (
              <div dangerouslySetInnerHTML={{ __html: svgCode }} />
            ) : (
              <span className="text-zinc-600 text-sm">
                {selectedToken ? 'No data' : 'Select a token'}
              </span>
            )}
          </div>

          <Button
            onPress={handleCopy}
            isDisabled={!svgCode}
            color={isUp ? 'success' : 'danger'}
            variant="flat"
            fullWidth
          >
            {copied ? 'Copied!' : 'Copy SVG'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default App;
