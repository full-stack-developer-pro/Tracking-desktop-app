export {};

interface IElectronAPI {
  logout: () => void;
  openBrowserAuth: (url: string) => void;
  login: (userId: string, trackingSettings: any) => void;
  onDeepLinkLogin: (callback: (data: any) => void) => void;
  testConnection: () => Promise<any>;
  removeDeepLinkListener: () => void;
  getCookies: () => Promise<any>;
  getEnv: (key: string) => Promise<string | null>;
  captureScreen: () => Promise<any>;
}

interface IIpcRenderer {
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, listener?: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
    ipcRenderer?: IIpcRenderer;
  }
}
