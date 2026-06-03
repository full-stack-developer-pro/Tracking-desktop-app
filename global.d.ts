interface IElectronAPI {
  logout: () => void;
  openBrowserAuth: (url: string) => void;
  login: (
    userId: string,
    trackingSettings: any,
    token?: string,
    refreshToken?: string,
    socketToken?: string,
    latitude?: number,
    longitude?: number,
  ) => Promise<any>;
  onDeepLinkLogin: (callback: (data: any) => void) => void;
  testConnection: () => Promise<any>;
  removeDeepLinkListener: () => void;
  getCookies: () => Promise<any>;
  getEnv: (key: string) => Promise<string | null>;
  captureScreen: () => Promise<any>;
  updateToken: (token: string) => void;
  onTrackingStoppedByAdmin: (callback: () => void) => void;
  removeTrackingStoppedListener: () => void;
  onSettingsSyncedLive: (callback: (data: any) => void) => void;
  removeSettingsSyncedListener: () => void;
  onUserBreakStarted: (callback: () => void) => void;
  removeUserBreakStartedListener: () => void;
  onUserBreakEnded: (callback: () => void) => void;
  removeUserBreakEndedListener: () => void;
  onLogoutSuccess: (callback: () => void) => void;
  removeLogoutSuccessListener: () => void;
  onForceStopTracking: (callback: (data: any) => void) => void;
  removeForceStopTrackingListener: () => void;
  updateActiveLeave: (leave: any) => void;
  onUserLeaveStatus: (callback: (status: any) => void) => void;
  removeUserLeaveStatusListener: () => void;
  checkForUpdates: () => Promise<any>;
  startDownload: () => Promise<any>;
  quitAndInstall: () => void;
  onUpdateProgress: (callback: (data: any) => void) => void;
  removeUpdateProgressListener: () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  removeUpdateDownloadedListener: () => void;
  googleOAuth: () => Promise<any>;
  confirmCheckout: () => Promise<any>;
  requestLocationPermissionConfirm: () => Promise<boolean>;
  setLocationPermissionAllowed: (allowed: boolean) => Promise<any>;
  getIpLocation: () => Promise<{ latitude?: number; longitude?: number }>;
  cancelClose: () => void;
  onShowCloseConfirmation: (callback: (data: any) => void) => void;
  removeCloseConfirmationListener: () => void;
}

interface IIpcRenderer {
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, listener?: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  removeAllListeners: (channel: string) => void;
}

interface Window {
  electronAPI?: IElectronAPI;
  ipcRenderer?: IIpcRenderer;
}
