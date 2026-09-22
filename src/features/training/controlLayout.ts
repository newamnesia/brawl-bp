export type JoystickId = "movement" | "attack" | "super" | "hyper";
export type JoystickLayout = { x: number; y: number; size: number };
export type ControlLayout = { version: 1; updatedAt: number; joysticks: Record<JoystickId, JoystickLayout> };

export const JOYSTICK_DEFINITIONS: Record<JoystickId, { label: string; color: string }> = {
  movement: { label: "移动摇杆", color: "#4fc3f7" },
  attack: { label: "普攻摇杆", color: "#ff5252" },
  super: { label: "大招摇杆", color: "#ffc107" },
  hyper: { label: "超充按键", color: "#ad64ff" },
};

const STORAGE_KEY = "brawl-bp:control-layout:v1";
const DEFAULTS: ControlLayout = {
  version: 1,
  updatedAt: 0,
  joysticks: {
    movement: { x: 0.13, y: 0.78, size: 0.18 },
    attack: { x: 0.87, y: 0.78, size: 0.18 },
    super: { x: 0.74, y: 0.60, size: 0.15 },
    hyper: { x: 0.65, y: 0.43, size: 0.13 },
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const joystickDiameter = (layout: JoystickLayout, width: number, height: number) =>
  clamp(layout.size * Math.min(width, height), 96, 220);

export function clampJoystick(layout: JoystickLayout, width: number, height: number): JoystickLayout {
  const size = clamp(Number.isFinite(layout.size) ? layout.size : 0.18, 0.13, 0.32);
  const diameter = joystickDiameter({ ...layout, size }, width, height);
  const pad = diameter / 2 + 12;
  return {
    x: clamp(Number.isFinite(layout.x) ? layout.x : 0.5, pad / width, 1 - pad / width),
    y: clamp(Number.isFinite(layout.y) ? layout.y : 0.75, pad / height, 1 - pad / height),
    size,
  };
}

/** 双摇杆布局：移动摇杆完整留在左半屏，攻击摇杆完整留在右半屏。 */
export function clampJoystickToSide(layout: JoystickLayout, width: number, height: number, id: JoystickId): JoystickLayout {
  const clamped = clampJoystick(layout, width, height);
  const diameter = joystickDiameter(clamped, width, height);
  const horizontalPad = diameter / 2 + 12;
  const leftMin = horizontalPad / width;
  const leftMax = Math.max(leftMin, 0.5 - horizontalPad / width);
  const rightMax = 1 - horizontalPad / width;
  const rightMin = Math.min(rightMax, 0.5 + horizontalPad / width);
  const minX = id === "movement" ? leftMin : rightMin;
  const maxX = id === "movement" ? leftMax : rightMax;
  return { ...clamped, x: clamp(clamped.x, minX, maxX) };
}

export function loadControlLayout(): ControlLayout {
  if (typeof window === "undefined") return structuredClone(DEFAULTS);
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<ControlLayout> | null;
    if (value?.version !== 1 || !value.joysticks) return structuredClone(DEFAULTS);
    return {
      version: 1,
      updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
      joysticks: {
        movement: { ...DEFAULTS.joysticks.movement, ...value.joysticks.movement },
        attack: { ...DEFAULTS.joysticks.attack, ...value.joysticks.attack },
        super: { ...DEFAULTS.joysticks.super, ...value.joysticks.super },
        hyper: { ...DEFAULTS.joysticks.hyper, ...value.joysticks.hyper },
      },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveControlLayout(layout: ControlLayout) {
  const saved = { ...layout, version: 1 as const, updatedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // 存储被浏览器禁用时仍保留本次会话内的布局，不阻断编辑和训练。
  }
  return saved;
}

export function resetControlLayout() {
  localStorage.removeItem(STORAGE_KEY);
  return loadControlLayout();
}
