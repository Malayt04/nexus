import React from 'react';
import { Page } from '../App';

interface LandingPageProps {
  navigate: (page: Page) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  return (
    <div className="w-full h-full flex flex-col">
        <div className="draggable w-full h-8 flex-shrink-0" />
        <div className="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
            <h1 className="text-6xl font-bold mb-2">🤖</h1>
            <h2 className="text-3xl font-semibold mb-4">Your AI Assistant</h2>
            <p className="text-gray-300 mb-8">Ready to help you with anything, right on your desktop.</p>
            <div className="space-x-4">
                <button 
                onClick={() => navigate('chat')}
                className="non-draggable bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Start Chatting
                </button>
                <button 
                onClick={() => navigate('settings')}
                className="non-draggable bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Settings
                </button>
            </div>
        </div>
    </div>

  );
};

export default LandingPage;