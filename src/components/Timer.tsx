import { useEffect, useState } from "react";

interface TimerProps {
  endsAt: number | null;
  label?: string;
}

export default function Timer({ endsAt, label }: TimerProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  return (
    <div>
      {label && (
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "0.25rem" }}>
          {label}
        </p>
      )}
      <div className={`timer ${remaining <= 5 ? "urgent" : ""}`}>{remaining}s</div>
    </div>
  );
}
