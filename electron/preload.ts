import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  login: (
    userId: string,
    trackingSettings: any,
    token?: string,
    refreshToken?: string,
    socketToken?: string,
    latitude?: number,
    longitude?: number,
  ) =>
    ipcRenderer.invoke(
      "login",
      userId,
      trackingSettings,
      token,
      refreshToken,
      socketToken,
      latitude,
      longitude,
    ),

  logout: () => ipcRenderer.send("logout"),
  updateActiveLeave: (leave: any) =>
    ipcRenderer.send("update-active-leave", leave),
  onUserLeaveStatus: (callback: (status: any) => void) =>
    ipcRenderer.on("user-leave-status", (_event, data) => callback(data)),
  removeUserLeaveStatusListener: () =>
    ipcRenderer.removeAllListeners("user-leave-status"),
  testConnection: () => ipcRenderer.invoke("test-api-connection"),

  getCookies: () => ipcRenderer.invoke("get-cookies"),
  openBrowserAuth: (url: string) => ipcRenderer.send("open-browser-auth", url),
  onDeepLinkLogin: (callback: (data: any) => void) =>
    ipcRenderer.on("deep-link-login", (_event, data) => callback(data)),
  removeDeepLinkListener: () =>
    ipcRenderer.removeAllListeners("deep-link-login"),
  googleOAuth: () => ipcRenderer.invoke("google-oauth"),
  confirmCheckout: () => ipcRenderer.invoke("confirm-checkout"),
  requestLocationPermissionConfirm: () =>
    ipcRenderer.invoke("request-location-permission-confirm"),
  setLocationPermissionAllowed: (allowed: boolean) =>
    ipcRenderer.invoke("set-location-permission-allowed", allowed),
  getIpLocation: () => ipcRenderer.invoke("get-ip-location"),
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
  onTrackingStoppedByAdmin: (callback: () => void) =>
    ipcRenderer.on("tracking-stopped-by-admin", () => callback()),
  removeTrackingStoppedListener: () =>
    ipcRenderer.removeAllListeners("tracking-stopped-by-admin"),
  onSettingsSyncedLive: (callback: (data: any) => void) =>
    ipcRenderer.on("settings-synced-live", (_event, data) => callback(data)),
  removeSettingsSyncedListener: () =>
    ipcRenderer.removeAllListeners("settings-synced-live"),
  onUserBreakStarted: (callback: () => void) =>
    ipcRenderer.on("user-break-started", () => callback()),
  removeUserBreakStartedListener: () =>
    ipcRenderer.removeAllListeners("user-break-started"),
  onUserBreakEnded: (callback: () => void) =>
    ipcRenderer.on("user-break-ended", () => callback()),
  removeUserBreakEndedListener: () =>
    ipcRenderer.removeAllListeners("user-break-ended"),
  onLogoutSuccess: (callback: () => void) =>
    ipcRenderer.on("logout-success", () => callback()),
  removeLogoutSuccessListener: () =>
    ipcRenderer.removeAllListeners("logout-success"),
  onForceStopTracking: (callback: (data: any) => void) =>
    ipcRenderer.on("force-stop-tracking", (_event, data) => callback(data)),
  removeForceStopTrackingListener: () =>
    ipcRenderer.removeAllListeners("force-stop-tracking"),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel: string, ...args: any[]) => {
    const validChannels = [
      "login",
      "logout",
      "cancel-close",
      "open-browser-auth",
      "update-active-leave",
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
      "session-expired",
      "logout-success",
      "user-leave-status",
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
      "logout-success",
      "user-leave-status",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
