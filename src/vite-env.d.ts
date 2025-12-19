/// <reference types="vite/client" />

interface Window {
  ipcRenderer: any;
  electronAPI: {
    login: (
      userId: string,
      trackingSettings: any,
      token?: string,
      refreshToken?: string
    ) => void;
    logout: () => void;
    testConnection: () => Promise<any>;
    getCookies: () => Promise<any>;
    openBrowserAuth: (url: string) => void;
    onDeepLinkLogin: (callback: (data: any) => void) => void;
    removeDeepLinkListener: () => void;
    googleOAuth: () => Promise<any>;
    confirmCheckout: () => Promise<any>;
    cancelClose: () => void;
    onShowCloseConfirmation: (callback: (data: any) => void) => void;
    removeCloseConfirmationListener: () => void;
  };
}
