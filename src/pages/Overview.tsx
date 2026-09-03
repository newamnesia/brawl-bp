import { useNavigate } from "react-router-dom";

export default function Overview() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <h1 className="page-title">荒野乱斗训练工具</h1>
      <p className="page-subtitle">选择要进入的功能</p>

      <div className="card">
        <button
          className="btn-primary"
          style={{ width: "100%" }}
          onClick={() => navigate("/bp")}
        >
          在线 BP 模拟
        </button>
        <button
          className="btn-secondary"
          style={{ marginTop: "0.75rem", width: "100%" }}
          onClick={() => navigate("/offline-training")}
        >
          进入离线走位训练
        </button>
        <button
          className="btn-secondary"
          style={{ marginTop: "0.75rem", width: "100%" }}
          onClick={() => navigate("/offline-aiming")}
        >
          进入离线瞄准训练
        </button>
      </div>

      <div className="credits-box">
        <p className="credits-title">创作声明</p>
        <p className="credits-text">
          作者 ID 辗转。本项目使用 agent 协助完成，角色头像取自 GitHub 的 Brawlify CDN 项目。
        </p>
        <p className="credits-text credits-disclaimer">
          免责声明：本站为《荒野乱斗》(Brawl Stars) 粉丝向非商业工具，与 Supercell 无任何隶属或合作关系，未获其官方授权或背书。游戏内所有角色名称、形象、数值等内容的著作权归 Supercell 及相关权利人所有，仅用于爱好者便捷参考，不代表官方立场。如权利人提出异议，将立即下架相关内容。
        </p>
        <p className="credits-contact">
          联系方式 · QQ：3450265471 · 微信：newamnesia-1201
        </p>
      </div>
    </div>
  );
}
