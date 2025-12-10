import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  login: (userId: string, trackingSettings: any) =>
    ipcRenderer.send("login", userId, trackingSettings),
  logout: () => ipcRenderer.send("logout"),
  testConnection: () => ipcRenderer.invoke("test-api-connection"),
  getCookies: () => ipcRenderer.invoke("get-cookies"),
  openBrowserAuth: (url: string) => ipcRenderer.send("open-browser-auth", url),
  onDeepLinkLogin: (callback: (data: any) => void) =>
    ipcRenderer.on("deep-link-login", (_event, data) => callback(data)),
  removeDeepLinkListener: () =>
    ipcRenderer.removeAllListeners("deep-link-login"),
  googleOAuth: () => ipcRenderer.invoke("google-oauth"),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel: string, ...args: any[]) => {
    const validChannels = ["login", "logout"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = ["test-api-connection", "get-cookies"];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ["main-process-message"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
  removeAllListeners: (channel: string) => {
    const validChannels = ["main-process-message"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
