export const PIERCE_SHELL = {
  lifetimeSeconds: 8,
  pickupRadius: 300,
  minDistance: 350,
  maxDistance: 700,
  visualRadius: 78,
} as const;

type Projection = {
  projectX: (x: number, y: number) => number;
  projectY: (y: number) => number;
};

export function drawPierceAimCorridor(ctx: CanvasRenderingContext2D, player: { x: number; y: number },
  angle: number, range: number, halfWidth: number, projection: Projection) {
  const directionX = Math.cos(angle), directionY = Math.sin(angle);
  const perpendicularX = -directionY * halfWidth, perpendicularY = directionX * halfWidth;
  const endX = player.x + directionX * range, endY = player.y + directionY * range;
  const corners = [
    { x: player.x + perpendicularX, y: player.y + perpendicularY },
    { x: endX + perpendicularX, y: endY + perpendicularY },
    { x: endX - perpendicularX, y: endY - perpendicularY },
    { x: player.x - perpendicularX, y: player.y - perpendicularY },
  ];
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  corners.forEach((corner, index) => {
    const x = projection.projectX(corner.x, corner.y), y = projection.projectY(corner.y);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPierceShell(ctx: CanvasRenderingContext2D, shell: { x: number; y: number },
  scaleX: number, scaleY: number, projection: Projection) {
  const radiusX = PIERCE_SHELL.visualRadius * scaleX;
  const radiusY = PIERCE_SHELL.visualRadius * scaleY;
  ctx.save();
  ctx.translate(projection.projectX(shell.x, shell.y), projection.projectY(shell.y));
  ctx.fillStyle = "#ffe35b";
  ctx.strokeStyle = "#8b5b17";
  ctx.lineWidth = Math.max(1.5, 18 * Math.min(scaleX, scaleY));
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, Math.PI * 0.2, Math.PI * 1.8);
  ctx.lineTo(radiusX * 0.12, radiusY * 0.48);
  ctx.ellipse(0, 0, radiusX * 0.48, radiusY * 0.48, 0, Math.PI * 1.7, Math.PI * 0.3, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
