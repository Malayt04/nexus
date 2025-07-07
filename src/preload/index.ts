import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invokeAI: (prompt: string, includeScreenshot: boolean, history: any[], file?: { path: string }) =>
    ipcRenderer.invoke('invoke-ai', prompt, includeScreenshot, history, file),
  onAIResponseChunk: (callback: (chunk: string) => void) => {
    const listener = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('ai-response-chunk', listener);
    return () => ipcRenderer.removeListener('ai-response-chunk', listener);
  },
  onAIResponseEnd: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('ai-response-end', listener);
    return () => ipcRenderer.removeListener('ai-response-end', listener);
  },
  onAIResponseError: (callback: (error: string) => void) => {
    const listener = (_: any, error: string) => callback(error);
    ipcRenderer.on('ai-response-error', listener);
    return () => ipcRenderer.removeListener('ai-response-error', listener);
  },
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getSerpApiKey: () => ipcRenderer.invoke('get-serpapi-key'),
  setSerpApiKey: (key: string) => ipcRenderer.invoke('set-serpapi-key', key),
  getUserDescription: () => ipcRenderer.invoke('get-user-description'),
  setUserDescription: (desc: string) => ipcRenderer.invoke('set-user-description', desc),

  history: {
    getAllChats: () => ipcRenderer.invoke('history:getAllChats'),
    getChatContent: (chatId: string) => ipcRenderer.invoke('history:getChatContent', chatId),
    saveChat: (data: { chatId: string | null, messagesToAppend: any[] }) => ipcRenderer.invoke('history:saveChat', data),
    deleteChat: (chatId: string) => ipcRenderer.invoke('history:deleteChat', chatId),
    generateTitle: (chatId: string, history: any[]) => ipcRenderer.invoke('history:generateTitle', chatId, history),
  }
});