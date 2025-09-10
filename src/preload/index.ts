import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invokeAI: (prompt: string, history: any[], file?: { path: string }) =>
    ipcRenderer.invoke('invoke-ai', prompt, history, file),
  invokeAIStream: (
    requestId: string,
    prompt: string,
    history: any[],
    file?: { path: string }
  ) => ipcRenderer.invoke('invoke-ai-stream', requestId, prompt, history, file),
  onAIStreamChunk: (callback: (event: any, data: { requestId: string; text: string }) => void) => {
    ipcRenderer.on('ai-stream-chunk', callback);
    return () => ipcRenderer.removeListener('ai-stream-chunk', callback);
  },
  onAIStreamEnd: (callback: (event: any, data: { requestId: string; finalText: string }) => void) => {
    ipcRenderer.on('ai-stream-end', callback);
    return () => ipcRenderer.removeListener('ai-stream-end', callback);
  },
  onAIStreamError: (callback: (event: any, data: { requestId: string; error: string }) => void) => {
    ipcRenderer.on('ai-stream-error', callback);
    return () => ipcRenderer.removeListener('ai-stream-error', callback);
  },
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  getSerpApiKey: () => ipcRenderer.invoke('get-serpapi-key'),
  setSerpApiKey: (key: string) => ipcRenderer.invoke('set-serpapi-key', key),
  getUserDescription: () => ipcRenderer.invoke('get-user-description'),
  setUserDescription: (desc: string) => ipcRenderer.invoke('set-user-description', desc),
  
  invokeCoach: (transcript: string, meetingContext: string) => ipcRenderer.invoke('invoke-coach', transcript, meetingContext),
  startAudioListening: () => ipcRenderer.invoke('start-audio-listening'),
  stopAudioListening: () => ipcRenderer.invoke('stop-audio-listening'),
  onCoachResponse: (callback: (event: any, ...args: any[]) => void) => ipcRenderer.on('coach-response', callback),
  onCoachResponseError: (callback: (event: any, ...args: any[]) => void) => ipcRenderer.on('coach-response-error', callback),
  
  onFocusInput: (callback: (event: any) => void) => {
    ipcRenderer.on('focus-input', callback);
    return () => ipcRenderer.removeListener('focus-input', callback);
  },
  onToggleScreenshot: (callback: (event: any) => void) => {
    ipcRenderer.on('toggle-screenshot', callback);
    return () => ipcRenderer.removeListener('toggle-screenshot', callback);
  },
  onSendMessage: (callback: (event: any) => void) => {
    ipcRenderer.on('send-message', callback);
    return () => ipcRenderer.removeListener('send-message', callback);
  },
  onNewChat: (callback: (event: any) => void) => {
    ipcRenderer.on('new-chat', callback);
    return () => ipcRenderer.removeListener('new-chat', callback);
  },
  
  history: {
    getAllChats: () => ipcRenderer.invoke('history:getAllChats'),
    getChatContent: (chatId: string) => ipcRenderer.invoke('history:getChatContent', chatId),
    saveChat: (data: { chatId: string | null, messagesToAppend: any[] }) => ipcRenderer.invoke('history:saveChat', data),
    deleteChat: (chatId: string) => ipcRenderer.invoke('history:deleteChat', chatId),
    generateTitle: (chatId: string, history: any[]) => ipcRenderer.invoke('history:generateTitle', chatId, history),
  },
  
  // Window management
  resizeWindowForPage: (pageType: string) => ipcRenderer.invoke('resize-window-for-page', pageType),
  resizeWindowMinimal: () => ipcRenderer.invoke('resize-window-minimal'),
  resizeWindowForMenu: (isExpanded: boolean) => ipcRenderer.invoke('resize-window-for-menu', isExpanded),
});