/// <reference types="vite/client" />

export interface IElectronAPI {
  getComfyUIUrl: () => Promise<string>;
  setComfyUIUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  isComfyUIUrlSet: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
