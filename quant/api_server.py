from flask import Flask, jsonify, request
from flask_cors import CORS
from strategy_engine import get_signal
from trade_logger import list_log
from risk_manager import can_trade, daily_count, fail
import os

app = Flask(__name__)
CORS(app)
running = True

@app.route("/api/best")
def best():
    try:
        return jsonify(get_signal())
    except Exception as e:
        return jsonify({"signal": "WAIT", "win": 0, "error": str(e)})

@app.route("/api/history")
def history():
    return jsonify(list_log())

@app.route("/api/toggle")
def toggle():
    global running
    running = not running
    return jsonify({"run": running})

@app.route("/api/status")
def status():
    return jsonify({
        "run": running,
        "can_trade": can_trade(),
        "daily_trades": daily_count.get("BTC", 0),
        "daily_max": 5,
        "consecutive_fails": fail,
    })

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "TradingKing Quant"})

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 3888))
    app.run(host="0.0.0.0", port=port, debug=False)
