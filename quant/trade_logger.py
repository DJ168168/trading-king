import json, time, os

LOG = "/root/quant/trade_history.json"

def init():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    if not os.path.exists(LOG):
        with open(LOG, "w") as f:
            json.dump([], f)

def add(ex, sym, side, amt, sl, tp, win):
    init()
    with open(LOG) as f:
        arr = json.load(f)
    arr.append({
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "ex": ex, "sym": sym, "side": side,
        "amount": amt, "sl": sl, "tp": tp, "win": win
    })
    with open(LOG, "w") as f:
        json.dump(arr, f, ensure_ascii=False)

def list_log():
    init()
    try:
        with open(LOG) as f:
            return json.load(f)
    except:
        return []
