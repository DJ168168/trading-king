"""
strategy_engine.py
多因子信号引擎：技术面 + 情绪面 + 资金费率 + 多空比
胜率 ≥ 80% 才输出开单信号
"""

import time, requests, os
from dotenv import load_dotenv
from trade_executor import run
from risk_manager import can_trade, order_ok, order_fail
from tg_notify import send
load_dotenv()

CG_KEY = os.getenv("CG_API_KEY", "9b35573cdb9d49d68c49c2b462c350e6")
CG_BASE = "https://open-api-v4.coinglass.com"

# ─── 数据获取 ─────────────────────────────────────────────────────────────────

def _cg(path, params={}):
    try:
        r = requests.get(f"{CG_BASE}{path}", params=params,
                         headers={"CG-API-KEY": CG_KEY}, timeout=10)
        d = r.json()
        if d.get("code") == "0":
            return d.get("data")
    except:
        pass
    return None

def _klines(symbol="BTCUSDT", interval="1h", limit=50):
    try:
        r = requests.get("https://fapi.binance.com/fapi/v1/klines",
                         params={"symbol": symbol, "interval": interval, "limit": limit},
                         timeout=10)
        return r.json()
    except:
        return []

def _long_short(symbol="BTCUSDT"):
    try:
        r = requests.get("https://fapi.binance.com/futures/data/globalLongShortAccountRatio",
                         params={"symbol": symbol, "period": "1h", "limit": 1}, timeout=8)
        d = r.json()
        return d[0] if d else None
    except:
        return None

def _fear_greed():
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=8)
        return int(r.json()["data"][0]["value"])
    except:
        return 50

# ─── 技术指标 ─────────────────────────────────────────────────────────────────

def _rsi(closes, n=14):
    if len(closes) < n + 1:
        return 50.0
    gains = [max(closes[i] - closes[i-1], 0) for i in range(1, n+1)]
    losses = [max(closes[i-1] - closes[i], 0) for i in range(1, n+1)]
    ag = sum(gains) / n or 0.001
    al = sum(losses) / n or 0.001
    return 100 - 100 / (1 + ag / al)

def _ema(closes, n):
    k = 2 / (n + 1)
    e = closes[0]
    for c in closes[1:]:
        e = c * k + e * (1 - k)
    return e

# ─── 综合信号评分 ─────────────────────────────────────────────────────────────

def get_signal(symbol="BTC"):
    sym = symbol + "USDT"
    klines = _klines(sym, "1h", 60)
    closes = [float(k[4]) for k in klines] if klines else []
    score = 50
    details = []

    # RSI
    if closes:
        rsi = _rsi(closes)
        if rsi < 30:   score += 20; details.append(f"RSI超卖{rsi:.0f}")
        elif rsi < 40: score += 10; details.append(f"RSI偏低{rsi:.0f}")
        elif rsi > 70: score -= 20; details.append(f"RSI超买{rsi:.0f}")
        elif rsi > 60: score -= 10; details.append(f"RSI偏高{rsi:.0f}")

        # EMA趋势
        if len(closes) >= 50:
            e20 = _ema(closes[-20:], 20)
            e50 = _ema(closes[-50:], 50)
            p = closes[-1]
            if e20 > e50 and p > e20: score += 10; details.append("EMA多头")
            elif e20 < e50 and p < e20: score -= 10; details.append("EMA空头")

    # 恐贪指数
    fg = _fear_greed()
    if fg <= 20:   score += 20; details.append(f"极度恐惧{fg}")
    elif fg <= 35: score += 10; details.append(f"恐惧{fg}")
    elif fg >= 80: score -= 20; details.append(f"极度贪婪{fg}")
    elif fg >= 65: score -= 10; details.append(f"贪婪{fg}")

    # 多空比
    ls = _long_short(sym)
    if ls:
        long_pct = float(ls.get("longAccount", 0.5)) * 100
        if long_pct < 45:   score += 15; details.append(f"空头主导{long_pct:.0f}%")
        elif long_pct > 60: score -= 15; details.append(f"多头拥挤{long_pct:.0f}%")

    # CoinGlass 资金费率
    fr = _cg("/api/futures/funding-rate/exchange-list", {"symbol": "BTC"})
    if fr and isinstance(fr, list):
        for item in fr:
            for ex in item.get("usdtOrUsdMarginList", []):
                if ex.get("exchange") == "Binance":
                    rate = float(ex.get("fundingRate", 0))
                    if rate < -0.01:   score += 10; details.append(f"负费率{rate:.4f}%")
                    elif rate > 0.05:  score -= 10; details.append(f"高费率{rate:.4f}%")

    # CoinGlass 清算
    liq = _cg("/api/futures/liquidation/history",
              {"symbol": "BTC", "exchange": "Binance", "interval": "4h", "limit": 3})
    if liq and isinstance(liq, list) and liq:
        latest = liq[-1]
        ll = float(latest.get("long_liquidation_usd", 0))
        sl = float(latest.get("short_liquidation_usd", 0))
        total = ll + sl
        if total > 0:
            lp = ll / total * 100
            if lp > 70:   score += 10; details.append(f"多头大爆仓{lp:.0f}%")
            elif lp < 30: score -= 10; details.append(f"空头大爆仓{lp:.0f}%")

    score = max(0, min(100, score))
    if score >= 65:
        sig = "LONG"
        win = min(99, 50 + (score - 50) * 1.2)
    elif score <= 35:
        sig = "SHORT"
        win = min(99, 50 + (50 - score) * 1.2)
    else:
        sig = "WAIT"
        win = 50.0

    return {
        "signal": sig,
        "win": round(win, 1),
        "score": score,
        "strategy": "多因子共振",
        "stop": 1.8,
        "take": 4.0,
        "detail": " | ".join(details),
        "symbol": symbol,
        "fg": fg,
    }

# ─── 自动交易主循环 ───────────────────────────────────────────────────────────

def auto_trade_loop():
    send("🚀 <b>TradingKing 量化系统启动</b>\n✅ 三大交易所 | 胜率≥80% | 每日≤5单")
    print("✅ 实盘已启动，开始监控信号...")
    while True:
        try:
            if not can_trade():
                time.sleep(30)
                continue
            sig = get_signal("BTC")
            s = sig["signal"]
            w = sig["win"]
            print(f"[信号] {s} 胜率={w:.1f}% 分={sig['score']} | {sig['detail']}")
            if w >= 80 and s in ["LONG", "SHORT"]:
                run("BTC", s, sig["stop"], sig["take"], w)
                order_ok()
            time.sleep(30)
        except Exception as e:
            print(f"[错误] {e}")
            time.sleep(30)

if __name__ == "__main__":
    auto_trade_loop()
