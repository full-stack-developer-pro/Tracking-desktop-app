import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  login: (
    userId: string,
    trackingSettings: any,
    token?: string,
    refreshToken?: string
  ) => ipcRenderer.send("login", userId, trackingSettings, token, refreshToken),
  logout: () => ipcRenderer.send("logout"),
  testConnection: () => ipcRenderer.invoke("test-api-connection"),
  getCookies: () => ipcRenderer.invoke("get-cookies"),
  openBrowserAuth: (url: string) => ipcRenderer.send("open-browser-auth", url),
  onDeepLinkLogin: (callback: (data: any) => void) =>
    ipcRenderer.on("deep-link-login", (_event, data) => callback(data)),
  removeDeepLinkListener: () =>
    ipcRenderer.removeAllListeners("deep-link-login"),
  googleOAuth: () => ipcRenderer.invoke("google-oauth"),
  confirmCheckout: () => ipcRenderer.invoke("confirm-checkout"),
  cancelClose: () => ipcRenderer.send("cancel-close"),
  onShowCloseConfirmation: (callback: (data: any) => void) =>
    ipcRenderer.on("show-close-confirmation", (_event, data) => callback(data)),
  removeCloseConfirmationListener: () =>
    ipcRenderer.removeAllListeners("show-close-confirmation"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  startDownload: () => ipcRenderer.invoke("start-download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install-update"),
  onUpdateProgress: (callback: (data: any) => void) =>
    ipcRenderer.on("download-progress", (_event, data) => callback(data)),
  removeUpdateProgressListener: () =>
    ipcRenderer.removeAllListeners("download-progress"),
  onUpdateDownloaded: (callback: (data: any) => void) =>
    ipcRenderer.on("update-downloaded", (_event, data) => callback(data)),
  removeUpdateDownloadedListener: () =>
    ipcRenderer.removeAllListeners("update-downloaded"),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel: string, ...args: any[]) => {
    const validChannels = [
      "login",
      "logout",
      "cancel-close",
      "open-browser-auth",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      "test-api-connection",
      "get-cookies",
      "confirm-checkout",
      "google-oauth",
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = [
      "main-process-message",
      "show-close-confirmation",
      "deep-link-login",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
  removeAllListeners: (channel: string) => {
    const validChannels = [
      "main-process-message",
      "show-close-confirmation",
      "deep-link-login",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
