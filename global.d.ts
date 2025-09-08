declare global {
  interface Window {
    electronAPI: {
      login: () => void;
      logout: () => void;
      getEnv: (key: string) => Promise<string | null>;
      captureScreen: () => Promise<any>;
    };
    ipcRenderer: {
      on: (
        channel: string,
        listener: (event: any, ...args: any[]) => void
      ) => void;
      off: (channel: string, listener?: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export {};
