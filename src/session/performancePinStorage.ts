const PERFORMANCE_PIN_KEY = "cuedirector-performance-pin";

export function isValidPerformancePin(value: string): boolean {
  return /^\d{4,6}$/.test(value);
}

export function hasPerformancePin(): boolean {
  try {
    const pin = localStorage.getItem(PERFORMANCE_PIN_KEY);
    return typeof pin === "string" && isValidPerformancePin(pin);
  } catch {
    return false;
  }
}

export function getPerformancePin(): string | null {
  try {
    const pin = localStorage.getItem(PERFORMANCE_PIN_KEY);
    return typeof pin === "string" && isValidPerformancePin(pin) ? pin : null;
  } catch {
    return null;
  }
}

export function savePerformancePin(pin: string): void {
  if (!isValidPerformancePin(pin)) {
    throw new Error("PIN must be 4–6 digits.");
  }
  localStorage.setItem(PERFORMANCE_PIN_KEY, pin);
}

export function verifyPerformancePin(pin: string): boolean {
  const saved = getPerformancePin();
  return saved !== null && saved === pin;
}
