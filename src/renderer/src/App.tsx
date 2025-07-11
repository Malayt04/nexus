import React, { useState, useEffect, Suspense } from 'react';
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const SettingsPage = React.lazy(() => import('./components/SettingsPage'));
const ChatPage = React.lazy(() => import('./components/ChatPage'));
const SetupPage = React.lazy(() => import('./components/SetUp'));
const HistoryPage = React.lazy(() => import('./components/HistoryPage'));
const MeetingAssistantPage = React.lazy(() => import('./components/MeetingAssistantPage'));

export type Page = 'setup' | 'landing' | 'settings' | 'chat' | 'history' | 'home' | 'meeting';

declare global {
  interface Window {
    electronAPI: {
      invokeAI: (
        prompt: string,
        includeScreenshot: boolean,
        history: any[],
        file?: { path: string }
      ) => Promise<string>
      getApiKey: () => Promise<string>;
      setApiKey: (key: string) => Promise<void>;
      getSerpApiKey: () => Promise<string>;
      setSerpApiKey: (key: string) => Promise<void>;
      getUserDescription: () => Promise<string>;
      setUserDescription: (desc: string) => Promise<void>;
      invokeCoach: (transcript: string, meetingContext: string) => Promise<void>;
      startAudioListening: () => Promise<void>;
      stopAudioListening: () => Promise<void>;
      onCoachResponse: (callback: (event: any, ...args: any[]) => void) => void;
      onCoachResponseError: (callback: (event: any, ...args: any[]) => void) => void;
      // Overlay state management
      getOverlayState: () => Promise<boolean>;
      setOverlayInteractive: (interactive: boolean) => Promise<void>;
      onOverlayStateChanged: (callback: (event: any, isInteractive: boolean) => void) => void;
      onFocusInput: (callback: (event: any) => void) => void;
      history: {
        getAllChats: () => Promise<any[]>;
        getChatContent: (chatId: string) => Promise<{ messages: any[] } | null>;
        saveChat: (data: { chatId: string | null, messagesToAppend: any[] }) => Promise<string>;
        deleteChat: (chatId: string) => Promise<boolean>;
        generateTitle: (chatId: string, history: any[]) => Promise<string | null>;
      }
    }
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [serpApiKey, setSerpApiKey] = useState<string>('');
  const [userDescription, setUserDescription] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isOverlayInteractive, setIsOverlayInteractive] = useState<boolean>(false);

  useEffect(() => {
    const initializeApp = async () => {
        if (window.electronAPI) {
          const [storedKey, storedDesc, storedSerpKey, overlayState] = await Promise.all([
              window.electronAPI.getApiKey(),
              window.electronAPI.getUserDescription(),
              window.electronAPI.getSerpApiKey(),
              window.electronAPI.getOverlayState(),
          ]);
          
          if (storedKey) setApiKey(storedKey);
          if (storedDesc) setUserDescription(storedDesc);
          if (storedSerpKey) setSerpApiKey(storedSerpKey);
          setIsOverlayInteractive(overlayState);
  
          if (!storedDesc) {
            setCurrentPage('setup');
          } else if (!storedKey || !storedSerpKey) {
            setCurrentPage('settings');
          } else {
            setCurrentPage('landing');
          }
          
          // Set up overlay state change listener
          window.electronAPI.onOverlayStateChanged((_, isInteractive) => {
            setIsOverlayInteractive(isInteractive);
          });
          
        } else {
          console.error("Fatal Error: window.electronAPI is not defined.");
        }
      };
      initializeApp();
  }, []);

  const navigate = (page: Page, chatId: string | null = null) => {
    setCurrentChatId(chatId); 
    setCurrentPage(page);
  };
  
  const handleSetupComplete = (description: string) => {
    setUserDescription(description);
    if (!apiKey || !serpApiKey) {
      navigate('settings');
    } else {
      navigate('landing');
    }
  };

  const renderPage = () => {
    if (currentPage === null) {
        return <div className="text-center"><h2 className="text-xl font-semibold mb-4 text-yellow-400">Initializing...</h2></div>;
    }

    switch (currentPage) {
      case 'setup':
        return <SetupPage onSetupComplete={handleSetupComplete} />;
      case 'settings':
        return <SettingsPage navigate={navigate} setApiKey={setApiKey} setSerpApiKey={setSerpApiKey} setUserDescription={setUserDescription} />;
      case 'chat':
        return <ChatPage navigate={navigate} chatId={currentChatId} setChatId={setCurrentChatId} />;
      case 'history':
        return <HistoryPage navigate={navigate} />;
      case 'meeting':
        return <MeetingAssistantPage />;
      case 'landing':
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  return (
    <div className="h-screen w-screen text-gray-12 backdrop-blur-xl flex flex-col items-center justify-center p-4 rounded-xl border border-slate-6 relative">
      {/* Overlay State Indicator */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
        isOverlayInteractive 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}>
        {isOverlayInteractive ? 'Interactive' : 'Pass-through'}
      </div>
      
      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 opacity-70 space-y-1">
        <div>Ctrl+Enter: Toggle mode</div>
        <div>Ctrl+Shift+Enter: Activate & focus</div>
        <div>Ctrl+Esc: Pass-through mode</div>
        <div>Ctrl+S: Toggle screenshot</div>
      </div>
      
      <Suspense fallback={<div className="text-xl font-semibold text-yellow-400">Loading...</div>}>
      {renderPage()}
      </Suspense>
    </div>
  );
}

export default App;