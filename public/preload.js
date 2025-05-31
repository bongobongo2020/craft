const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getComfyUIUrl: () => ipcRenderer.invoke('get-comfyui-url'),
  setComfyUIUrl: (url) => ipcRenderer.invoke('set-comfyui-url', url),
  isComfyUIUrlSet: () => ipcRenderer.invoke('is-comfyui-url-set')
});
