import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invokeAI: (prompt: string, includeScreenshot: boolean, history: any[]) => ipcRenderer.invoke('invoke-ai', prompt, includeScreenshot, history),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getSerpApiKey: () => ipcRenderer.invoke('get-serpapi-key'),
  setSerpApiKey: (key: string) => ipcRenderer.invoke('set-serpapi-key', key),
  getUserDescription: () => ipcRenderer.invoke('get-user-description'),
  setUserDescription: (desc: string) => ipcRenderer.invoke('set-user-description', desc),
});