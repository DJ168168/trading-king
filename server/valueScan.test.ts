import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import axios from "axios";

const VS_BASE_URL = "https://api.valuescan.io/api/open/v1";
const API_KEY = process.env.VALUESCAN_API_KEY ?? "ak_e8d3e07da9b442cc8956c8d9e4c712a9";
const SECRET_KEY = process.env.VALUESCAN_SECRET_KEY ?? "sk_f20a39047f2b4434948b1415dd62705b";

function buildSignHeaders(rawBody: string) {
  const timestamp = String(Date.now());
  const sign = createHmac("sha256", SECRET_KEY)
    .update(timestamp + rawBody, "utf8")
    .digest("hex");
  return {
    "X-API-KEY": API_KEY,
    "X-TIMESTAMP": timestamp,
    "X-SIGN": sign,
    "Content-Type": "application/json; charset=utf-8",
  };
}

describe("ValueScan HMAC-SHA256 API 连接验证", () => {
  it("签名算法应生成正确格式的 64 位 hex 字符串", () => {
    const rawBody = JSON.stringify({});
    const timestamp = "1712620800000";
    const sign = createHmac("sha256", SECRET_KEY)
      .update(timestamp + rawBody, "utf8")
      .digest("hex");
    expect(sign).toHaveLength(64);
    expect(sign).toMatch(/^[0-9a-f]{64}$/);
  });

  it("API Key 格式应正确（ak_ 前缀 + 32位hex）", () => {
    expect(API_KEY).toMatch(/^ak_[a-f0-9]{32}$/);
  });

  it("Secret Key 格式应正确（sk_ 前缀 + 32位hex）", () => {
    expect(SECRET_KEY).toMatch(/^sk_[a-f0-9]{32}$/);
  });

  it("应能成功调用 getFundsCoinList 接口并返回数据", async () => {
    const rawBody = JSON.stringify({});
    const headers = buildSignHeaders(rawBody);
    const resp = await axios.post(`${VS_BASE_URL}/ai/getFundsCoinList`, rawBody, {
      headers,
      timeout: 15000,
    });
    expect(resp.status).toBe(200);
    expect(resp.data.code).toBe(200);
    expect(Array.isArray(resp.data.data)).toBe(true);
    expect(resp.data.data.length).toBeGreaterThan(0);
  }, 20000);
});
