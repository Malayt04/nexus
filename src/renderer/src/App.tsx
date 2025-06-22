import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import SettingsPage from './components/SettingsPage';
import ChatPage from './components/ChatPage';
import SetupPage from './components/SetUp';


export type Page = 'setup' | 'landing' | 'settings' | 'chat';

declare global {
  interface Window {
    electronAPI: {
      invokeAI: (prompt: string, includeScreenshot: boolean, history: any[]) => Promise<string>;
      getApiKey: () => Promise<string>;
      setApiKey: (key: string) => Promise<void>;
      getSerpApiKey: () => Promise<string>;
      setSerpApiKey: (key: string) => Promise<void>;
      getUserDescription: () => Promise<string>;
      setUserDescription: (desc: string) => Promise<void>;
    }
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [serpApiKey, setSerpApiKey] = useState<string>('');
  const [userDescription, setUserDescription] = useState<string>('');

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

  const navigate = (page: Page) => {
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
        return (
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400">Initializing...</h2>
            </div>
        );
    }

    switch (currentPage) {
      case 'setup':
        return <SetupPage onSetupComplete={handleSetupComplete} />;
      case 'settings':
        return <SettingsPage navigate={navigate} setApiKey={setApiKey} setSerpApiKey={setSerpApiKey} />;
      case 'chat':
        return <ChatPage navigate={navigate} />;
      case 'landing':
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900/80 text-white backdrop-blur-xl flex flex-col items-center justify-center p-4 rounded-xl border border-white/10">
      {renderPage()}
    </div>
  );
}

export default App;