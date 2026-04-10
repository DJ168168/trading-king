import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

const COINS = ["BTC", "ETH", "SOL", "BNB"];

export default function LongShortPanel() {
  const [selectedCoin, setSelectedCoin] = useState("BTC");

  const { data, isLoading, refetch, isFetching } = trpc.freeData.bullBearScore.useQuery(
    { symbol: selectedCoin },
    { refetchInterval: 60000 }
  );

  const scoreObj = data?.score ?? null;
  // BullBearScore 对象：totalScore(-100~+100), bullScore(0~100), bearScore(0~100)
  const score = scoreObj ? Math.round((scoreObj.bullScore + 50 + scoreObj.totalScore / 2) / 2) : null;
  const raw = data?.rawData;

  const dataSources = raw
    ? [
        {
          name: "恐慌贪婪指数",
          score: raw.fng ?? 50,
          signal: (raw.fng ?? 50) < 30 ? "极度恐惧" : (raw.fng ?? 50) < 50 ? "恐惧" : (raw.fng ?? 50) < 70 ? "贪婪" : "极度贪婪",
          desc: `当前指数 ${raw.fng ?? "N/A"}，${(raw.fng ?? 50) < 40 ? "逆向做多信号" : "市场情绪偏热"}`,
          source: "Alternative.me",
        },
        {
          name: "多空比",
          score: raw.longShortRatio > 1 ? Math.min(50 + (raw.longShortRatio - 1) * 30, 90) : Math.max(50 - (1 - raw.longShortRatio) * 30, 10),
          signal: raw.longShortRatio > 1.1 ? "偏多" : raw.longShortRatio < 0.9 ? "偏空" : "中性",
          desc: `多空比 ${raw.longShortRatio?.toFixed(3) ?? "N/A"}，多头 ${raw.longPct?.toFixed(1) ?? "N/A"}% / 空头 ${raw.shortPct?.toFixed(1) ?? "N/A"}%`,
          source: raw.dataSource?.longShort ?? "OKX",
        },
        {
          name: "主动买卖比",
          score: raw.takerBuySellRatio > 1 ? Math.min(50 + (raw.takerBuySellRatio - 1) * 30, 90) : Math.max(50 - (1 - raw.takerBuySellRatio) * 30, 10),
          signal: raw.takerBuySellRatio > 1.05 ? "偏多" : raw.takerBuySellRatio < 0.95 ? "偏空" : "中性",
          desc: `Taker 买卖比 ${raw.takerBuySellRatio?.toFixed(3) ?? "N/A"}，买入量 ${((raw.takerBuyVol ?? 0) / 1e6).toFixed(1)}M`,
          source: raw.dataSource?.taker ?? "OKX",
        },
        {
          name: "资金费率",
          score: raw.fundingRate > 0 ? Math.min(50 + raw.fundingRate * 5000, 85) : Math.max(50 + raw.fundingRate * 5000, 15),
          signal: raw.fundingRate > 0.0005 ? "偏多" : raw.fundingRate < -0.0005 ? "偏空" : "中性",
          desc: `资金费率 ${((raw.fundingRate ?? 0) * 100).toFixed(4)}%，${raw.fundingRate > 0 ? "多头支付空头" : "空头支付多头"}`,
          source: "Binance",
        },
        {
          name: "持仓量变化",
          score: raw.oiChange > 0 ? Math.min(50 + raw.oiChange * 5, 85) : Math.max(50 + raw.oiChange * 5, 15),
          signal: raw.oiChange > 1 ? "偏多" : raw.oiChange < -1 ? "偏空" : "中性",
          desc: `1h OI 变化 ${raw.oiChange?.toFixed(2) ?? "N/A"}%，24h 变化 ${raw.oiChange24h?.toFixed(2) ?? "N/A"}%`,
          source: "CoinGlass",
        },
        {
          name: "BTC 主导地位",
          score: raw.btcDominance > 50 ? Math.min(50 + (raw.btcDominance - 50) * 1.5, 80) : Math.max(50 - (50 - raw.btcDominance) * 1.5, 20),
          signal: raw.btcDominance > 55 ? "避险" : raw.btcDominance < 45 ? "山寨季" : "中性",
          desc: `BTC 主导率 ${raw.btcDominance?.toFixed(1) ?? "N/A"}%，24h 变化 ${raw.marketCapChange24h?.toFixed(2) ?? "N/A"}%`,
          source: "CoinGecko",
        },
        {
          name: "新闻情绪",
          score: raw.news ? Math.min(Math.max(50 + raw.news.sentimentScore / 2, 10), 90) : 50,
          signal: raw.news ? (raw.news.sentimentScore > 20 ? "偏多" : raw.news.sentimentScore < -20 ? "偏空" : "中性") : "N/A",
          desc: raw.news
            ? `利多 ${raw.news.bullishCount} / 利空 ${raw.news.bearishCount} / 中性 ${raw.news.neutralCount}`
            : "暂无新闻数据",
          source: raw.dataSource?.news ?? "RSS",
        },
      ]
    : [];

  const getSignalBg = (signal: string) => {
    if (signal.includes("多") || signal.includes("贪婪") || signal.includes("买")) return "bg-green-400/10 text-green-400";
    if (signal.includes("空") || signal.includes("恐惧") || signal.includes("卖")) return "bg-red-400/10 text-red-400";
    return "bg-yellow-400/10 text-yellow-400";
  };

  const getScoreColor = (s: number) => s >= 60 ? "text-green-400" : s >= 40 ? "text-yellow-400" : "text-red-400";
  const getBarColor = (s: number) => s >= 60 ? "bg-green-400" : s >= 40 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div>
      <PageHeader
        title="📊 多空综合面板"
        description="7大免费数据源 · 综合评分"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={`mr-1 ${isFetching ? "animate-spin" : ""}`} /> 刷新
          </Button>
        }
      />

      {/* Coin Selector */}
      <div className="flex gap-2 mb-4">
        {COINS.map((c) => (
          <Button
            key={c}
            variant={selectedCoin === c ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setSelectedCoin(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {/* Overall Score */}
      <div className="terminal-card p-6 mb-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">综合多空评分 · {selectedCoin}</p>
        {isLoading ? (
          <p className="text-4xl font-bold text-muted-foreground animate-pulse">加载中...</p>
        ) : score !== null ? (
          <>
            <p className={`text-5xl stat-number font-bold ${getScoreColor(score)}`}>{score}</p>
            <p className={`text-sm mt-2 flex items-center justify-center gap-1 ${getScoreColor(score)}`}>
              {score !== null && (score >= 60 ? <TrendingUp size={16} /> : score >= 40 ? <Minus size={16} /> : <TrendingDown size={16} />)}
              {score !== null && (score >= 60 ? "偏多 — 建议做多" : score >= 40 ? "中性 — 建议观望" : "偏空 — 建议做空")}
              {scoreObj && <span className="text-[10px] ml-2 opacity-70">{scoreObj.signal}</span>}
            </p>
            <div className="w-full max-w-md mx-auto mt-4 h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between max-w-md mx-auto mt-1">
              <span className="text-[10px] text-red-400">极度看空 0</span>
              <span className="text-[10px] text-muted-foreground">中性 50</span>
              <span className="text-[10px] text-green-400">极度看多 100</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">数据加载失败，请检查 API 配置</p>
        )}
      </div>

      {/* Data Sources */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="terminal-card p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
              <div className="h-2 bg-secondary rounded w-full mb-2" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dataSources.map((d) => (
            <div key={d.name} className="terminal-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{d.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{d.source}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getSignalBg(d.signal)}`}>{d.signal}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(Math.round(d.score))}`}
                    style={{ width: `${Math.round(d.score)}%` }}
                  />
                </div>
                <span className={`text-sm stat-number font-bold w-8 text-right ${getScoreColor(Math.round(d.score))}`}>
                  {Math.round(d.score)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{d.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* All Exchange Funding Rates */}
      {raw?.allExchangeFR && raw.allExchangeFR.length > 0 && (
        <div className="terminal-card p-4 mt-4">
          <h3 className="text-sm font-medium mb-3">各交易所资金费率</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(raw.allExchangeFR as Array<{ exchange: string; fundingRate: number }>).map((ex) => (
              <div key={ex.exchange} className="p-2 bg-secondary/30 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">{ex.exchange}</p>
                <p className={`text-sm font-bold stat-number mt-1 ${ex.fundingRate > 0 ? "text-green-400" : "text-red-400"}`}>
                  {(ex.fundingRate * 100).toFixed(4)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
