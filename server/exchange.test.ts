import { describe, it, expect } from "vitest";

describe("Environment Variables", () => {
  it("should have BINANCE_API_KEY set", () => {
    expect(process.env.BINANCE_API_KEY).toBeDefined();
    expect(process.env.BINANCE_API_KEY!.length).toBeGreaterThan(10);
  });

  it("should have BINANCE_API_SECRET set", () => {
    expect(process.env.BINANCE_API_SECRET).toBeDefined();
    expect(process.env.BINANCE_API_SECRET!.length).toBeGreaterThan(10);
  });

  it("should have OKX_API_KEY set", () => {
    expect(process.env.OKX_API_KEY).toBeDefined();
    expect(process.env.OKX_API_KEY!.length).toBeGreaterThan(5);
  });

  it("should have OKX_API_SECRET set", () => {
    expect(process.env.OKX_API_SECRET).toBeDefined();
    expect(process.env.OKX_API_SECRET!.length).toBeGreaterThan(5);
  });

  it("should have OKX_PASSPHRASE set", () => {
    expect(process.env.OKX_PASSPHRASE).toBeDefined();
    expect(process.env.OKX_PASSPHRASE!.length).toBeGreaterThan(0);
  });

  it("should have BYBIT_API_KEY set", () => {
    expect(process.env.BYBIT_API_KEY).toBeDefined();
    expect(process.env.BYBIT_API_KEY!.length).toBeGreaterThan(5);
  });

  it("should have BYBIT_API_SECRET set", () => {
    expect(process.env.BYBIT_API_SECRET).toBeDefined();
    expect(process.env.BYBIT_API_SECRET!.length).toBeGreaterThan(5);
  });

  it("should have TELEGRAM_BOT_TOKEN set", () => {
    expect(process.env.TELEGRAM_BOT_TOKEN).toBeDefined();
    expect(process.env.TELEGRAM_BOT_TOKEN!.length).toBeGreaterThan(10);
  });

  it("should have TELEGRAM_CHAT_ID set", () => {
    expect(process.env.TELEGRAM_CHAT_ID).toBeDefined();
    expect(process.env.TELEGRAM_CHAT_ID!.length).toBeGreaterThan(0);
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
