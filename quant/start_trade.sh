#!/bin/bash
set -e
cd /root/quant

echo "========================================"
echo "  TradingKing 量化系统 一键启动"
echo "========================================"

# 安装依赖
echo "[1/5] 安装 Python 依赖..."
pip3 install -q flask flask-cors requests python-dotenv ccxt 2>&1 | tail -3
echo "✅ 依赖安装完成"

# 创建日志目录
mkdir -p /root/quant/logs
touch /root/quant/trade_history.json 2>/dev/null || echo "[]" > /root/quant/trade_history.json

# 开放防火墙端口
echo "[2/5] 开放 3888 端口..."
iptables -I INPUT -p tcp --dport 3888 -j ACCEPT 2>/dev/null || true
# 如果有 ufw
ufw allow 3888/tcp 2>/dev/null || true
echo "✅ 端口已开放"

# 停止旧进程
echo "[3/5] 停止旧进程..."
pkill -f "vs_auto_token.py" 2>/dev/null || true
pkill -f "api_server.py" 2>/dev/null || true
pkill -f "strategy_engine" 2>/dev/null || true
screen -X -S vs_token quit 2>/dev/null || true
screen -X -S quant-api quit 2>/dev/null || true
screen -X -S quant-trade quit 2>/dev/null || true
sleep 2
echo "✅ 旧进程已清理"

# 启动服务
echo "[4/5] 启动三个后台服务..."

# VS Token 自动刷新（每30分钟）
screen -dmS vs_token bash -c 'cd /root/quant && python3 vs_auto_token.py >> /root/quant/logs/vs_token.log 2>&1'

# API 服务器
screen -dmS quant-api bash -c 'cd /root/quant && python3 api_server.py >> /root/quant/logs/api.log 2>&1'

# 策略引擎 + 自动交易
screen -dmS quant-trade bash -c 'cd /root/quant && python3 strategy_engine.py >> /root/quant/logs/trade.log 2>&1'

sleep 3

echo "[5/5] 验证服务状态..."
if screen -list | grep -q "vs_token"; then echo "  ✅ VS Token 服务: 运行中"; else echo "  ❌ VS Token 服务: 未启动"; fi
if screen -list | grep -q "quant-api"; then echo "  ✅ API 服务器: 运行中"; else echo "  ❌ API 服务器: 未启动"; fi
if screen -list | grep -q "quant-trade"; then echo "  ✅ 策略引擎: 运行中"; else echo "  ❌ 策略引擎: 未启动"; fi

echo ""
echo "========================================"
echo "  🚀 量化系统启动完成！"
echo "  📊 API 地址: http://47.239.72.211:3888"
echo "  📋 查看日志: screen -r quant-trade"
echo "  🔍 查看API:  screen -r quant-api"
echo "========================================"
