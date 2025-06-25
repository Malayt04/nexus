import React, { useState, useEffect } from 'react';
import { Page } from '../App';

interface SettingsPageProps {
  navigate: (page: Page) => void;
  setApiKey: (key: string) => void;
  setSerpApiKey: (key: string) => void;
  setUserDescription: (desc: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ navigate, setApiKey, setSerpApiKey, setUserDescription }) => {
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [serpKeyInput, setSerpKeyInput] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load existing settings when the component mounts
    const loadSettings = async () => {
        const [geminiKey, serpKey, desc] = await Promise.all([
            window.electronAPI.getApiKey(),
            window.electronAPI.getSerpApiKey(),
            window.electronAPI.getUserDescription(),
        ]);
        setGeminiKeyInput(geminiKey || '');
        setSerpKeyInput(serpKey || '');
        setDescription(desc || '');
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!geminiKeyInput || !serpKeyInput || !description) {
      setMessage('All fields are required.');
      return;
    }
    await Promise.all([
        window.electronAPI.setApiKey(geminiKeyInput),
        window.electronAPI.setSerpApiKey(serpKeyInput),
        window.electronAPI.setUserDescription(description)
    ]);
    
    // Update the parent state
    setApiKey(geminiKeyInput);
    setSerpApiKey(serpKeyInput);
    setUserDescription(description);

    setMessage('Settings saved successfully!');
    setTimeout(() => {
        setMessage('');
        navigate('home');
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col">
        <div className="draggable w-full h-8 flex-shrink-0" />
        <div className="w-full max-w-md p-8 bg-gray-800/80 rounded-xl shadow-lg animate-fade-in mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Settings</h2>
            <div className="space-y-4">
                <div>
                  <label htmlFor="userDescription" className="block text-sm font-medium text-gray-300 mb-1">Your Profile</label>
                  <textarea
                    id="userDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-24 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe yourself..."
                  />
                </div>
                <div>
                  <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
                  <input
                      type="password"
                      id="geminiApiKey"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="serpApiKey" className="block text-sm font-medium text-gray-300 mb-1">SerpAPI Key</label>
                  <input
                      type="password"
                      id="serpApiKey"
                      value={serpKeyInput}
                      onChange={(e) => setSerpKeyInput(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {message && <p className="text-sm text-green-400 text-center">{message}</p>}
            </div>
            <div className="mt-8 flex justify-between items-center non-draggable">
                <button 
                onClick={() => navigate('home')}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Back to Home
                </button>
                <button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                Save Settings
                </button>
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;