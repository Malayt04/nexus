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
      onFocusInput: (callback: (event: any) => void) => void;
      onToggleScreenshot: (callback: (event: any) => void) => void;
      onSendMessage: (callback: (event: any) => void) => void;
      onNewChat: (callback: (event: any) => void) => void;
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

  useEffect(() => {
    const initializeApp = async () => {
        if (window.electronAPI) {
        const [storedKey, storedDesc, storedSerpKey] = await Promise.all([
            window.electronAPI.getApiKey(),
            window.electronAPI.getUserDescription(),
            window.electronAPI.getSerpApiKey(),
        ]);
        
        if (storedKey) setApiKey(storedKey);
        if (storedDesc) setUserDescription(storedDesc);
        if (storedSerpKey) setSerpApiKey(storedSerpKey);
  
          if (!storedDesc) {
            setCurrentPage('setup');
          } else if (!storedKey || !storedSerpKey) {
            setCurrentPage('settings');
          } else {
            setCurrentPage('landing');
          }
          
          
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
      {/* Keyboard Shortcuts Help */}
      <div className="ml-10 mb-3 absolute bottom-4 left-4 text-xs text-gray-400 opacity-70 space-y-1">
        <div>Ctrl+\: Focus input box</div>
        <div>Ctrl+Enter: Send message</div>
        <div>Ctrl+;: Toggle screenshot</div>
        <div>Ctrl+N: New chat</div>
        <div>Arrow keys: Move window</div>
      </div>
      
      <Suspense fallback={<div className="text-xl font-semibold text-yellow-400">Loading...</div>}>
      {renderPage()}
      </Suspense>
    </div>
  );
}

export default App;