import ccxt, os
from dotenv import load_dotenv
from tg_notify import send
from trade_logger import add
load_dotenv()

LEVERAGE = 10
AMOUNT = 20   # USDT 每单金额

exchanges = {
    "binance": {"api": os.getenv("BINANCE_API_KEY"), "sec": os.getenv("BINANCE_API_SECRET")},
    "okx":     {"api": os.getenv("OKX_API_KEY"),     "sec": os.getenv("OKX_API_SECRET"), "pwd": os.getenv("OKX_PASSPHRASE")},
    "bybit":   {"api": os.getenv("BYBIT_API_KEY"),   "sec": os.getenv("BYBIT_API_SECRET")}
}

clients = {}
for name, cfg in exchanges.items():
    try:
        cls = getattr(ccxt, name)
        opt = {
            "apiKey": cfg["api"],
            "secret": cfg["sec"],
            "enableRateLimit": True,
            "options": {"defaultType": "future"}
        }
        if name == "okx":
            opt["password"] = cfg["pwd"]
        clients[name] = cls(opt)
        print(f"✅ {name} 交易所已连接")
    except Exception as e:
        print(f"❌ {name} 连接失败: {e}")

def run(symbol, sig, stop, take, win):
    pair = "BTC/USDT:USDT" if symbol == "BTC" else f"{symbol}/USDT:USDT"
    for name, ex in clients.items():
        try:
            ticker = ex.fetch_ticker(pair)
            price = ticker["last"]
            amount = round(AMOUNT / price, 4)
            if sig == "LONG":
                ex.create_market_buy_order(pair, amount)
                sl = round(price * (1 - stop / 100), 2)
                tp = round(price * (1 + take / 100), 2)
            elif sig == "SHORT":
                ex.create_market_sell_order(pair, amount)
                sl = round(price * (1 + stop / 100), 2)
                tp = round(price * (1 - take / 100), 2)
            else:
                continue
            msg = (f"🚀 <b>{name.upper()}</b> 开仓\n"
                   f"{pair} <b>{sig}</b>\n"
                   f"价格: {price}\n"
                   f"胜率: {win}%\n"
                   f"止损: {sl}  止盈: {tp}")
            send(msg)
            add(name, pair, sig, amount, sl, tp, win)
            print(f"✅ {name} {pair} {sig} @ {price}")
        except Exception as e:
            send(f"❌ {name} 下单失败: {str(e)[:80]}")
            print(f"❌ {name} 下单失败: {e}")
