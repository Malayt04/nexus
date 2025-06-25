import React from 'react';
import { Page } from '../App';

interface LandingPageProps {
  navigate: (page: Page) => void;
}

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
    <button
        onClick={onClick}
        className={`non-draggable text-base font-semibold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${className}`}
    >
        {children}
    </button>
);

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
        {/* Draggable Header */}
        <div className="draggable w-full h-8 flex-shrink-0" />

        {/* Main Content */}
        <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
            <div className="relative mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur-lg opacity-75 animate-pulse-slow"></div>
                <h1 className="relative text-7xl font-bold bg-gray-900 rounded-full p-4">🤖</h1>
            </div>

            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 mb-3">
                Nexus AI
            </h2>
            <p className="text-gray-400 max-w-sm mb-10">
                Your intelligent desktop companion. Context-aware, always available, and ready to assist.
            </p>

            <div className="space-y-4 w-full max-w-xs">
                 <ActionButton
                    onClick={() => navigate('chat')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                >
                    Start New Chat
                </ActionButton>
                 <ActionButton
                    onClick={() => navigate('history')}
                    className="w-full bg-gray-700/80 hover:bg-gray-700/100 text-gray-200 border border-gray-600"
                >
                    View History
                </ActionButton>
                 <ActionButton
                    onClick={() => navigate('settings')}
                    className="w-full bg-transparent hover:bg-gray-800/50 text-gray-400"
                >
                    Settings
                </ActionButton>
            </div>
        </div>
        
        {/* Footer/Spacer */}
        <div className="h-8 flex-shrink-0" />
    </div>
  );
};

export default LandingPage;
