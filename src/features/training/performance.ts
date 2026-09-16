/** 限制触控设备的战斗画布像素密度，避免 32 位浏览器在特效帧产生巨大离屏缓冲。 */
export function battleCanvasDpr(devicePixelRatio: number, coarsePointer: boolean) {
  const safe = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return coarsePointer ? Math.min(2, safe) : safe;
}
