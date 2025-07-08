import React, { useState, useEffect } from 'react';

const MeetingAssistantPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [meetingContext, setMeetingContext] = useState('');
  const [transcript, setTranscript] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    const handleCoachResponse = (_, response: string) => {
      setSuggestions(response);
    };

    const handleCoachResponseError = (_, error: string) => {
      console.error('Coach Error:', error);
    };

    window.electronAPI.onCoachResponse(handleCoachResponse);
    window.electronAPI.onCoachResponseError(handleCoachResponseError);

    return () => {
      // Clean up listeners when the component unmounts
      window.electronAPI.onCoachResponse(handleCoachResponse);
      window.electronAPI.onCoachResponseError(handleCoachResponseError);
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      window.electronAPI.stopAudioListening();
    } else {
      window.electronAPI.startAudioListening();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Meeting Assistant</h1>
      <div className="flex flex-col space-y-4">
        <button
          onClick={handleToggleListening}
          className={`px-4 py-2 rounded text-white ${isListening ? 'bg-red-500' : 'bg-green-500'}`}>
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        <input
          type="text"
          value={meetingContext}
          onChange={(e) => setMeetingContext(e.target.value)}
          placeholder="Enter meeting context..."
          className="p-2 border rounded"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-xl font-semibold">Live Transcript</h2>
            <div className="p-2 border rounded h-64 overflow-y-auto">{
              // @ts-ignore
              transcript
            }</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Suggestions</h2>
            <div className="p-2 border rounded h-64 overflow-y-auto">{suggestions}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingAssistantPage;