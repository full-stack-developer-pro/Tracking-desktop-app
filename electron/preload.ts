import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  login: (userId: string, trackingSettings: any) =>
    ipcRenderer.send("login", userId, trackingSettings),
  logout: () => ipcRenderer.send("logout"),
  testConnection: () => ipcRenderer.invoke("test-api-connection"),
  getCookies: () => ipcRenderer.invoke("get-cookies"),
  openBrowserAuth: (url: string) => ipcRenderer.send("open-browser-auth", url),
  onDeepLinkLogin: (callback: (data: any) => void) =>
    ipcRenderer.on("deep-link-login", (event, data) => callback(data)),
  removeDeepLinkListener: () =>
    ipcRenderer.removeAllListeners("deep-link-login"),
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
});
