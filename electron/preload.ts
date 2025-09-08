import { ipcRenderer, contextBridge } from "electron";

console.log("🔧 [PRELOAD] Preload script starting...");

// Expose ipcRenderer methods
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    console.log(`🔧 [PRELOAD] Sending IPC message: ${channel}`, omit);
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    console.log(`🔧 [PRELOAD] Invoking IPC: ${channel}`, omit);
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// Expose electronAPI
contextBridge.exposeInMainWorld("electronAPI", {
  getEnv: (key: any) => {
    console.log(`🔧 [PRELOAD] Getting env variable: ${key}`);
    return ipcRenderer.invoke("get-env-variable", key);
  },
  captureScreen: () => {
    console.log("🔧 [PRELOAD] Capture screen requested");
    return ipcRenderer.invoke("capture-screen");
  },
  login: (userId: string) => {
    console.log("🔧 [PRELOAD] Sending login-success message");
    ipcRenderer.send("login-success", userId);
  },
  logout: () => {
    console.log("🔧 [PRELOAD] Sending logout message");
    ipcRenderer.send("logout");
  },
});

console.log("✅ [PRELOAD] Context bridge setup completed");

// Test immediately after context bridge setup
console.log(
  "🌐 [PRELOAD] electronAPI exposed successfully:",
  typeof window !== "undefined"
    ? !!window.electronAPI
    : "window not available yet"
);

// Also test when DOM loads
window.addEventListener("DOMContentLoaded", () => {
  console.log("🌐 [PRELOAD] DOM loaded");
  console.log(
    "🌐 [PRELOAD] electronAPI available after DOM:",
    !!window.electronAPI
  );
  console.log(
    "🌐 [PRELOAD] electronAPI.login available:",
    typeof window.electronAPI?.login
  );
});
