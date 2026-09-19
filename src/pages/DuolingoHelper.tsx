import { useNavigate } from "react-router-dom";

const SOURCE_ROOT = "https://github.com/newamnesia/brawl-bp/tree/main/mobile-helper";

export default function DuolingoHelper() {
  const navigate = useNavigate();

  return (
    <main className="app-shell duolingo-helper-page">
      <button type="button" className="btn-secondary duolingo-helper-back" onClick={() => navigate("/")}>← 返回总主页</button>
      <h1 className="page-title">多邻国答题辅助</h1>
      <p className="page-subtitle">移动端悬浮翻译原型</p>

      <div className="card">
        <h2>Android 悬浮窗</h2>
        <p>切换到多邻国后，点击悬浮按钮，在屏幕上框选文字；识别出的中文翻译显示在悬浮窗中。</p>
        <p>需要授权显示在其他应用上层与屏幕采集。首次使用需要联网下载语言模型。</p>
        <a className="btn-primary duolingo-helper-link" href={`${SOURCE_ROOT}/android`} target="_blank" rel="noreferrer">查看 Android 项目源码</a>
      </div>

      <div className="card">
        <h2>iOS 画中画实验版</h2>
        <p>先在应用内设置识别区域，再开启系统屏幕广播与画中画；翻译结果尝试在其他应用上方显示。</p>
        <p>iOS 不能提供与 Android 相同的任意悬浮窗。该方案的后台更新和审核结果仍需真机验证。</p>
        <a className="btn-secondary duolingo-helper-link" href={`${SOURCE_ROOT}/ios`} target="_blank" rel="noreferrer">查看 iOS 项目源码</a>
      </div>

      <p className="duolingo-helper-note">目前提供项目源码，尚无可直接安装的 APK 或 iOS 安装包；3 秒内出翻译的目标尚未通过真机测试。</p>
    </main>
  );
}
