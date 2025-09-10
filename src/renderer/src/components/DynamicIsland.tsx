import React, { useState, useEffect } from "react";

declare global {
  interface Window {
    electronAPI: {
      resizeWindowForMenu: (isExpanded: boolean) => Promise<void>;
    };
  }
}

interface DynamicIslandProps {
  onNewChat: () => void;
  onShowSettings: () => void;
  onShowHistory: () => void;
  onClose: () => void;
  isPageVisible: boolean;
}

const DynamicIsland: React.FC<DynamicIslandProps> = ({
  onNewChat,
  onShowSettings,
  onShowHistory,
  onClose,
  isPageVisible,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const toggleMenu = async (newMenuState?: boolean) => {
    const nextState = newMenuState !== undefined ? newMenuState : !showMenu;
    setShowMenu(nextState);

    // Resize window to accommodate menu
    if (window.electronAPI && !isPageVisible) {
      await window.electronAPI.resizeWindowForMenu(nextState);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close any open page with Escape
      if (e.key === "Escape") {
        if (isPageVisible) {
          onClose();
        } else {
          toggleMenu(false);
        }
      }
      // Toggle menu with Ctrl+M
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        toggleMenu();
      }
      // New chat with Ctrl+N
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        // Simulate clicking the pencil: close menu, then call onNewChat
        toggleMenu(false);
        setTimeout(() => {
          onNewChat();
        }, 50);
      }
      // Quick access to history with Ctrl+H
      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        onShowHistory();
        toggleMenu(false);
      }
      // Quick access to settings with Ctrl+,
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        onShowSettings();
        toggleMenu(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPageVisible,
    onClose,
    onNewChat,
    onShowHistory,
    onShowSettings,
    toggleMenu,
  ]);

  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50">
      {/* Main Dynamic Island */}
      <div
        className={`relative backdrop-blur-xl border overflow-hidden ${
          isHovered || showMenu ? "rounded-2xl" : "rounded-full"
        } ${
          isPageVisible
            ? "bg-black/80 border-white/20 shadow-lg shadow-white/10"
            : "bg-black/70 border-white/20"
        }`}
        style={{
          width: isHovered || showMenu ? 280 : 160,
          padding: isHovered || showMenu ? "12px 24px" : "8px 16px",
          transition:
            "width 220ms ease, padding 220ms ease, border-color 220ms ease, box-shadow 220ms ease, background-color 220ms ease",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Core Content */}
        <div className="flex items-center justify-between">
          {/* Nexus Branding with Page Indicator */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isPageVisible
                  ? "bg-white/80 animate-pulse"
                  : "bg-white/50 animate-pulse"
              }`}
            ></div>
            <span className="text-white font-semibold text-sm transition-colors duration-300">
              Nexus
            </span>
          </div>

          {/* Action Buttons */}
          <div
            className={`flex items-center space-x-2 transition-opacity duration-300 ${
              isHovered || showMenu ? "opacity-100" : "opacity-70"
            }`}
          >
            {/* New Chat Button */}
            <button
              onClick={async () => {
                if (showMenu) {
                  await toggleMenu(false);
                  setTimeout(() => {
                    onNewChat();
                  }, 100);
                } else {
                  onNewChat();
                }
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 group"
              title="New Chat (Ctrl+N)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5 text-white group-hover:text-blue-300 transition-colors"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                />
              </svg>
            </button>

            {/* Always show menu button - close functionality via Escape key */}
            <button
              onClick={() => toggleMenu()}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 group"
              title={showMenu ? "Close Menu" : "Menu (Ctrl+M)"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-3.5 h-3.5 text-white transition-all duration-200 ${
                  showMenu ? "rotate-180" : ""
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded Menu */}
        {showMenu && (
          <div className="mt-3 pt-3 border-t border-white/10 animate-fade-in-up">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  console.log("History button clicked");
                  setTimeout(() => {
                    onShowHistory();
                  }, 100);
                  toggleMenu(false);
                }}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                title="History (Ctrl+H)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-gray-200">History</span>
              </button>

              <button
                onClick={() => {
                  console.log("Settings button clicked");
                  setTimeout(() => {
                    onShowSettings();
                  }, 100);
                  toggleMenu(false);
                }}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                title="Settings (Ctrl+,)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-gray-200">Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className={`mt-2 text-xs text-white/50 text-center transition-opacity duration-300 ${
          showMenu && !isPageVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        Ctrl+N: Chat • Ctrl+H: History • Ctrl+,: Settings • Esc: Close
      </div>
    </div>
  );
};

export default React.memo(DynamicIsland);
