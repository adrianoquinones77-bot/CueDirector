export function isElectronSessionStorage(): boolean {
  return typeof window !== "undefined" && window.electronAPI !== undefined;
}
