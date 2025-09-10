import React, { useState, useEffect, Suspense } from "react";
const LandingPage = React.lazy(() => import("./components/LandingPage"));
const SettingsPage = React.lazy(() => import("./components/SettingsPage"));
const ChatPage = React.lazy(() => import("./components/ChatPage"));
const SetupPage = React.lazy(() => import("./components/SetUp"));
const HistoryPage = React.lazy(() => import("./components/HistoryPage"));
import DynamicIsland from "./components/DynamicIsland";

export type Page =
  | "setup"
  | "landing"
  | "settings"
  | "chat"
  | "history"
  | "home"
  | "meeting";

declare global {
  interface Window {
    electronAPI: {
      invokeAI: (
        prompt: string,
        history: any[],
        file?: { path: string }
      ) => Promise<string>;
      getApiKey: () => Promise<string>;
      setApiKey: (key: string) => Promise<void>;
      getSerpApiKey: () => Promise<string>;
      setSerpApiKey: (key: string) => Promise<void>;
      getUserDescription: () => Promise<string>;
      setUserDescription: (desc: string) => Promise<void>;
      invokeCoach: (
        transcript: string,
        meetingContext: string
      ) => Promise<void>;
      startAudioListening: () => Promise<void>;
      stopAudioListening: () => Promise<void>;
      onCoachResponse: (callback: (event: any, ...args: any[]) => void) => void;
      onCoachResponseError: (
        callback: (event: any, ...args: any[]) => void
      ) => void;
      onFocusInput: (callback: (event: any) => void) => void;
      onToggleScreenshot: (callback: (event: any) => void) => void;
      onSendMessage: (callback: (event: any) => void) => void;
      onNewChat: (callback: (event: any) => void) => void;
      history: {
        getAllChats: () => Promise<any[]>;
        getChatContent: (chatId: string) => Promise<{ messages: any[] } | null>;
        saveChat: (data: {
          chatId: string | null;
          messagesToAppend: any[];
        }) => Promise<string>;
        deleteChat: (chatId: string) => Promise<boolean>;
        generateTitle: (
          chatId: string,
          history: any[]
        ) => Promise<string | null>;
      };
      resizeWindowForPage: (pageType: string) => Promise<void>;
      resizeWindowMinimal: () => Promise<void>;
      resizeWindowForMenu: (isExpanded: boolean) => Promise<void>;
    };
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [serpApiKey, setSerpApiKey] = useState<string>("");
  const [userDescription, setUserDescription] = useState<string>("");
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

        // Check if setup is needed but don't automatically show pages
        if (!storedDesc) {
          // Show setup dialog on first launch
          setCurrentPage("setup");
          setIsPageVisible(true);
        }
      } else {
        console.error("Fatal Error: window.electronAPI is not defined.");
      }
    };
    initializeApp();
  }, []);

  const navigate = React.useCallback(
    async (page: Page, chatId: string | null = null) => {
      console.log(`Navigating to: ${page}, chatId: ${chatId}`);
      setCurrentChatId(chatId);
      setCurrentPage(page);

      // Resize window for the specific page first
      if (window.electronAPI) {
        await window.electronAPI.resizeWindowForPage(page);
        // Small delay to ensure window resize completes smoothly
        setTimeout(() => {
          console.log(`Showing page: ${page}`);
          setIsPageVisible(true);
        }, 150);
      } else {
        setIsPageVisible(true);
      }
    },
    []
  );

  const closePage = React.useCallback(async () => {
    // First hide the content with a fade effect
    setIsPageVisible(false);

    // Small delay to let content fade out before resizing window
    setTimeout(async () => {
      if (window.electronAPI) {
        await window.electronAPI.resizeWindowMinimal();
      }
    }, 100);
  }, []);

  const togglePage = React.useCallback(
    (page: Page, chatId: string | null = null) => {
      if (currentPage === page && isPageVisible) {
        closePage();
      } else {
        navigate(page, chatId);
      }
    },
    [closePage, currentPage, isPageVisible, navigate]
  );

  const handleSetupComplete = (description: string) => {
    setUserDescription(description);
    closePage(); // Close setup and return to minimal view
  };

  const renderPage = () => {
    console.log(
      `renderPage: isPageVisible=${isPageVisible}, currentPage=${currentPage}`
    );
    if (!isPageVisible || currentPage === null) {
      return null; // Show nothing when page is hidden
    }

    const pageProps = {
      onClose: closePage,
      navigate,
    };

    switch (currentPage) {
      case "setup":
        return (
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-fade-in"
            style={{ top: "80px", scrollbarGutter: "stable both-edges" }}
          >
            <SetupPage onSetupComplete={handleSetupComplete} />
          </div>
        );
      case "settings":
        return (
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl overflow-y-auto animate-fade-in"
            style={{ top: "80px", scrollbarGutter: "stable both-edges" }}
          >
            <SettingsPage
              {...pageProps}
              setApiKey={setApiKey}
              setSerpApiKey={setSerpApiKey}
              setUserDescription={setUserDescription}
            />
          </div>
        );
      case "history":
        return (
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl overflow-y-auto animate-fade-in"
            style={{ top: "80px", scrollbarGutter: "stable both-edges" }}
          >
            <HistoryPage {...pageProps} />
          </div>
        );
      case "chat":
      default:
        return (
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-slide-down"
            style={{ top: "80px", scrollbarGutter: "stable both-edges" }}
          >
            <ChatPage
              navigate={navigate}
              chatId={currentChatId}
              setChatId={setCurrentChatId}
              onClose={closePage}
            />
          </div>
        );
    }
  };

  return (
    <div
      className="h-screen w-screen text-white relative"
      style={{ background: "transparent" }}
    >
      {/* Always visible Dynamic Island */}
      <DynamicIsland
        onNewChat={React.useCallback(() => togglePage("chat"), [togglePage])}
        onShowSettings={React.useCallback(
          () => togglePage("settings"),
          [togglePage]
        )}
        onShowHistory={React.useCallback(
          () => togglePage("history"),
          [togglePage]
        )}
        onClose={closePage}
        isPageVisible={isPageVisible}
      />

      {/* Conditional Page Overlays */}
      <Suspense fallback={null}>{renderPage()}</Suspense>
    </div>
  );
}

export default App;
