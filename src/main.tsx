import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// 全局点击特效：在点击位置生成金色波纹扩散动画
function spawnRipple(e: MouseEvent) {
  const target = e.target as HTMLElement | null;
  // 忽略输入框等可编辑元素的点击，避免干扰光标
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
    return;
  }
  const ripple = document.createElement("span");
  ripple.className = "click-ripple";
  ripple.style.left = `${e.clientX}px`;
  ripple.style.top = `${e.clientY}px`;
  document.body.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

document.addEventListener("click", spawnRipple, { passive: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
