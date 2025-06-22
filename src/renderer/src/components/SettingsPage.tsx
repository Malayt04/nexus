import React, { useState } from 'react';
import { Page } from '../App';

interface SettingsPageProps {
  navigate: (page: Page) => void;
  setApiKey: (key: string) => void;
  setSerpApiKey: (key: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ navigate, setApiKey, setSerpApiKey }) => {
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [serpKeyInput, setSerpKeyInput] = useState('');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!geminiKeyInput || !serpKeyInput) {
      setMessage('Both API keys are required.');
      return;
    }
    await window.electronAPI.setApiKey(geminiKeyInput);
    await window.electronAPI.setSerpApiKey(serpKeyInput);
    setApiKey(geminiKeyInput);
    setSerpApiKey(serpKeyInput);
    setMessage('API Keys saved successfully!');
    setTimeout(() => {
        setMessage('');
        navigate('chat');
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col">
        <div className="draggable w-full h-8 flex-shrink-0" />
        <div className="w-full max-w-md p-8 bg-gray-800/80 rounded-xl shadow-lg animate-fade-in mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">API Settings</h2>
            <div className="space-y-6">
                <div>
                <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-300 mb-1">Your Gemini API Key</label>
                <input
                    type="password"
                    id="geminiApiKey"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your Gemini API key here"
                />
                </div>
                <div>
                <label htmlFor="serpApiKey" className="block text-sm font-medium text-gray-300 mb-1">Your SerpAPI Key</label>
                <input
                    type="password"
                    id="serpApiKey"
                    value={serpKeyInput}
                    onChange={(e) => setSerpKeyInput(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your SerpAPI key here"
                />
                </div>
                <p className="text-xs text-gray-400">Your keys are stored securely on your local machine.</p>
                {message && <p className="text-sm text-green-400 text-center">{message}</p>}
            </div>
            <div className="mt-8 flex justify-between items-center non-draggable">
                <button 
                onClick={() => navigate('landing')}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Back to Home
                </button>
                <button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Save & Continue
                </button>
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;