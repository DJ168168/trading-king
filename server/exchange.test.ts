import { describe, it, expect } from "vitest";

describe("Environment Variables (soft check)", () => {
  it("BINANCE_API_KEY is configured or skipped", () => {
    if (!process.env.BINANCE_API_KEY) {
      console.warn("BINANCE_API_KEY not set, skipping");
      return;
    }
    expect(process.env.BINANCE_API_KEY.length).toBeGreaterThan(10);
  });

  it("OKX_API_KEY is configured or skipped", () => {
    if (!process.env.OKX_API_KEY) {
      console.warn("OKX_API_KEY not set, skipping");
      return;
    }
    expect(process.env.OKX_API_KEY.length).toBeGreaterThan(5);
  });

  it("BYBIT_API_KEY is configured or skipped", () => {
    if (!process.env.BYBIT_API_KEY) {
      console.warn("BYBIT_API_KEY not set, skipping");
      return;
    }
    expect(process.env.BYBIT_API_KEY.length).toBeGreaterThan(5);
  });

  it("TELEGRAM_BOT_TOKEN is configured or skipped", () => {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not set, skipping");
      return;
    }
    expect(process.env.TELEGRAM_BOT_TOKEN.length).toBeGreaterThan(10);
  });

  it("TELEGRAM_CHAT_ID is configured or skipped", () => {
    if (!process.env.TELEGRAM_CHAT_ID) {
      console.warn("TELEGRAM_CHAT_ID not set, skipping");
      return;
    }
    expect(process.env.TELEGRAM_CHAT_ID.length).toBeGreaterThan(0);
  });
});

describe("Telegram API", () => {
  it("should be able to reach Telegram API", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("TELEGRAM_BOT_TOKEN not set, skipping test");
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(res.ok).toBe(true);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    console.log("Telegram Bot:", data.result.username);
  });
});
