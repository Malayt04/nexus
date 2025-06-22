import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { Page } from '../App';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPageProps {
  navigate: (page: Page) => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

type GeminiRole = 'user' | 'model';

interface GeminiHistoryEntry {
    role: GeminiRole;
    parts: [{ text: string }];
}

const ChatPage: React.FC<ChatPageProps> = ({ navigate }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const promptToSend = input;
    const shouldIncludeScreenshot = includeScreenshot;
    
    const chatHistory: GeminiHistoryEntry[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    const userMessage: Message = { sender: 'user', text: promptToSend };
    setMessages((prev) => [...prev, userMessage]);

    setInput('');
    setIncludeScreenshot(false);
    setIsLoading(true);

    try {
      const aiResponse = await window.electronAPI.invokeAI(promptToSend, shouldIncludeScreenshot, chatHistory);
      const aiMessage: Message = { sender: 'ai', text: aiResponse };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = { sender: 'ai', text: 'Sorry, something went wrong.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-800/50 rounded-xl shadow-2xl animate-fade-in">
      <div className="draggable flex-shrink-0 p-3 flex justify-between items-center border-b border-gray-700/50">
        <button onClick={() => navigate('landing')} className="non-draggable text-gray-400 hover:text-white transition-colors">&larr; Back</button>
        <h2 className="text-lg font-semibold">AI Chat</h2>
        <button onClick={() => navigate('settings')} className="non-draggable text-gray-400 hover:text-white transition-colors">&#9881;</button>
      </div>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 ${msg.sender === 'user' ? 'text-right' : ''}`}>
            {msg.sender === 'ai' && <div className="text-sm text-gray-400 mb-1">AI Assistant</div>}
            <div className={`inline-block p-2 rounded-lg mt-1 ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>
              {msg.sender === 'ai' ? <MarkdownRenderer text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">AI Assistant</div>
              <div className="bg-gray-700 inline-flex items-center p-2 rounded-lg mt-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-gray-700/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-4 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Type your message..."
          />
          <button type="submit" disabled={isLoading} className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-blue-500 disabled:opacity-50">
            <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </button>
        </div>
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="screenshot"
            checked={includeScreenshot}
            onChange={(e) => setIncludeScreenshot(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700"
          />
          <label htmlFor="screenshot" className="ml-2 block text-sm text-gray-300">
            Include Screenshot
          </label>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;