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
        <div className="draggable w-full h-8 flex-shrink-0" />
        <div className="flex-grow flex flex-col items-center justify-center animate-fade-in-up">
            <div className="relative mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-slate-8 to-slate-9 rounded-full blur-lg opacity-75 animate-pulse-slow"></div>
                <h1 className="relative text-7xl font-bold bg-slate-3 rounded-full p-4">✨</h1>
            </div>

            <h2 className="text-4xl font-bold text-gray-200 mb-3">
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
                    onClick={() => navigate('meeting')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                >
                    Meeting Assistant
                </ActionButton>
                 <ActionButton
                    onClick={() => navigate('history')}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
                >
                    View History
                </ActionButton>
                 <ActionButton
                    onClick={() => navigate('settings')}
                    className="w-full bg-transparent hover:bg-gray-800 text-gray-400"
                >
                    Settings
                </ActionButton>
            </div>
        </div>
        
        <div className="h-8 flex-shrink-0" />
    </div>
  );
};

export default LandingPage;