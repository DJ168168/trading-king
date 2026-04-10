import TelegramBot from "node-telegram-bot-api";

let bot: TelegramBot | null = null;

function getBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] BOT_TOKEN not configured");
    return null;
  }
  if (!bot) {
    bot = new TelegramBot(token, { polling: false });
  }
  return bot;
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn("[Telegram] CHAT_ID not configured");
    return false;
  }
  const b = getBot();
  if (!b) return false;
  try {
    await b.sendMessage(chatId, message, { parse_mode: "HTML" });
    return true;
  } catch (err: any) {
    console.error("[Telegram] sendMessage error:", err.message);
    return false;
  }
}

export async function sendSignalAlert(signal: {
  exchange: string;
  symbol: string;
  type: "LONG" | "SHORT" | "CLOSE";
  source: string;
  price: number;
  score: number;
  reason?: string;
}): Promise<boolean> {
  const emoji = signal.type === "LONG" ? "🟢" : signal.type === "SHORT" ? "🔴" : "⚪";
  const typeLabel = signal.type === "LONG" ? "做多" : signal.type === "SHORT" ? "做空" : "平仓";
  const exchangeLabel: Record<string, string> = {
    binance: "币安",
    okx: "欧易",
    bybit: "Bybit",
  };

  const msg = `${emoji} <b>交易信号 - ${typeLabel}</b>

📊 <b>交易对：</b>${signal.symbol}
🏦 <b>交易所：</b>${exchangeLabel[signal.exchange] ?? signal.exchange}
💰 <b>当前价格：</b>$${signal.price.toFixed(4)}
🎯 <b>信号来源：</b>${signal.source}
⭐ <b>评分：</b>${signal.score}/100
${signal.reason ? `📝 <b>理由：</b>${signal.reason}` : ""}

⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
🤖 <i>勇少交易之王 - 量化交易系统</i>`;

  return sendTelegramMessage(msg);
}

export async function sendTradeAlert(trade: {
  exchange: string;
  symbol: string;
  side: string;
  price: number;
  amount: number;
  pnl?: number;
  isSimulated?: boolean;
}): Promise<boolean> {
  const emoji = trade.side === "buy" ? "📈" : "📉";
  const sideLabel = trade.side === "buy" ? "买入" : "卖出";
  const simLabel = trade.isSimulated ? "【模拟盘】" : "【实盘】";
  const pnlStr =
    trade.pnl !== undefined
      ? `\n💵 <b>盈亏：</b>${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`
      : "";

  const msg = `${emoji} <b>${simLabel} 成交通知 - ${sideLabel}</b>

📊 <b>交易对：</b>${trade.symbol}
🏦 <b>交易所：</b>${trade.exchange}
💰 <b>成交价格：</b>$${trade.price.toFixed(4)}
📦 <b>数量：</b>${trade.amount}${pnlStr}

⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
🤖 <i>勇少交易之王 - 量化交易系统</i>`;

  return sendTelegramMessage(msg);
}

export async function sendSystemAlert(title: string, content: string): Promise<boolean> {
  const msg = `⚠️ <b>系统通知 - ${title}</b>\n\n${content}\n\n⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  return sendTelegramMessage(msg);
}

export async function testTelegram(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendTelegramMessage(
      `✅ <b>Telegram 推送测试成功！</b>\n\n🤖 勇少交易之王 - 量化交易系统\n⏰ ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`
    );
    return { success: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
