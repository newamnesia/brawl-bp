import { useState } from "react";
import { useNavigate } from "react-router-dom";

const UPDATE_NOTICES = [
  {
    date: "2026-09-13",
    title: "六席赛事房上线",
    details: [
      "新增六席赛事房，支持蓝方与红方各三名选手参与完整 BP。",
      "支持额外观战席位，方便赛事组织、训练赛和复盘使用。",
      "双方队伍可共同选择比赛地图，房主可以设置蓝方或红方先手。",
      "新增完整的 Ban/Pick 流程，每个位置由对应选手完成操作与确认。",
      "增加阶段倒计时、当前席位、预选角色和操作状态提示。",
      "赛事房结束后会完整展示双方阵容与禁用结果。",
    ],
  },
  {
    date: "2026-09-09",
    title: "自定义键位布局上线",
    details: [
      "新增键位布置编辑器。",
      "可以分别调整走位训练和瞄准训练的摇杆位置。",
      "键位设置会保存在当前设备，下次进入训练时继续生效。",
      "针对手机横屏操作优化触控区域与摇杆体验。",
      "建议将网页链接复制到系统浏览器打开，以获得更稳定的横屏体验。",
      "本网站仅针对横屏进行适配，竖屏动画和布局显示问题暂不处理。",
    ],
  },
  {
    date: "2026-09-09",
    title: "训练战斗界面优化",
    details: [
      "优化训练开始倒计时和战斗 HUD。",
      "调整血量、弹药、训练时间及操作方式的显示。",
      "优化子弹素材、攻击范围和移动指示效果。",
      "新增 AI 表情和部分战斗反馈。",
      "暂停训练时可以查看当前训练数据分布。",
      "支持进入全屏模式，减少浏览器界面对训练视野的影响。",
    ],
  },
] as const;

export default function Overview() {
  const navigate = useNavigate();
  const [showUpdates, setShowUpdates] = useState(false);

  return (
    <div className="app-shell">
      <div className="overview-heading">
        <h1 className="page-title">荒野乱斗训练工具</h1>
        <p className="page-subtitle">选择要进入的功能</p>
        <button
          type="button"
          className="overview-updates-button"
          onClick={() => setShowUpdates(true)}
        >
          更新公告 📢
        </button>
      </div>

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
        <button
          className="btn-secondary"
          style={{ marginTop: "0.75rem", width: "100%" }}
          onClick={() => navigate("/character-trial")}
        >
          进入角色试用
        </button>
        <button
          className="btn-secondary overview-mini-games-button"
          style={{ marginTop: "0.75rem", width: "100%" }}
          onClick={() => navigate("/mini-games")}
        >
          小游戏关卡
        </button>
      </div>

      <div className="credits-box">
        <p className="credits-title">创作声明</p>
        <p className="credits-text credits-disclaimer">
          免责声明：本站为《荒野乱斗》(Brawl Stars) 粉丝向非商业工具，与 Supercell 无任何隶属或合作关系，未获其官方授权或背书。游戏内所有角色名称、形象、数值等内容的著作权归 Supercell 及相关权利人所有，仅用于玩家参考，不代表官方立场。如权利人提出异议，将立即下架相关内容。
        </p>
        <p className="credits-contact">
          联系方式 · QQ：3450265471 · 微信：newamnesia-1201
        </p>
        <p className="credits-contact">
          B站主页：
          <a href="https://b23.tv/s4fwjTZ" target="_blank" rel="noreferrer">
            https://b23.tv/s4fwjTZ
          </a>
        </p>
        <p className="credits-contact">
          网页共建讨论QQ群：1093717129（进群请回答我的B站 ID）
        </p>
      </div>

      {showUpdates && (
        <div
          className="training-updates-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUpdates(false);
          }}
        >
          <section
            className="training-updates-card overview-updates-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-updates-title"
          >
            <header className="training-updates-header">
              <h2 id="overview-updates-title">更新公告 📢</h2>
              <button type="button" aria-label="关闭更新公告" onClick={() => setShowUpdates(false)}>×</button>
            </header>
            <div className="training-updates-list">
              {UPDATE_NOTICES.map((notice, index) => (
                <article key={`${notice.date}-${notice.title}`} className="training-update-item">
                  <time dateTime={notice.date}>{notice.date}</time>
                  <h3>
                    {notice.title}
                    {index === 0 && <span className="overview-update-latest">最新</span>}
                  </h3>
                  <ul>
                    {notice.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
