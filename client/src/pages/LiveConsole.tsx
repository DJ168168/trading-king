import { useEffect } from "react";
import { useLocation } from "wouter";

// LiveConsole 已整合到 LiveTrading 实盘控制台
// 自动重定向到功能完整的实盘控制台页面
export default function LiveConsole() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/live-trading");
  }, []);
  return null;
}
