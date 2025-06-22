import React, { useState } from 'react';

interface SetupPageProps {
    onSetupComplete: (description: string) => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onSetupComplete }) => {
    const [description, setDescription] = useState('');

    const handleContinue = async () => {
        if (!description.trim()) {
            return;
        }
        await window.electronAPI.setUserDescription(description);
        onSetupComplete(description);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="draggable w-full h-8 flex-shrink-0" />
            <div className="flex-grow w-full max-w-lg p-8 bg-gray-800/80 rounded-xl shadow-lg animate-fade-in mx-auto flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-center">Welcome!</h2>
                <p className="text-gray-300 text-center mb-6">To personalize nexus, please describe yourself or your primary use case in a few sentences.</p>
                
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full flex-grow bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., I am a student learning web development, primarily focused on React and Node.js. I often need help with debugging code and understanding new concepts."
                    rows={6}
                />

                <div className="mt-6 flex justify-end">
                    <button 
                    onClick={handleContinue}
                    className="non-draggable bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetupPage;