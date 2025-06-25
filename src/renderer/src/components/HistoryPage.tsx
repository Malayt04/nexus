import React, { useState, useEffect } from 'react';
import { Page } from '../App';

interface HistoryPageProps {
  navigate: (page: Page, chatId?: string) => void;
}

interface ChatManifestEntry {
    id: string;
    title: string;
    updatedAt: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ navigate }) => {
  const [chats, setChats] = useState<ChatManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const chatList = await window.electronAPI.history.getAllChats();
        setChats(chatList);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (confirm('Are you sure you want to delete this chat?')) {
        const success = await window.electronAPI.history.deleteChat(chatId);
        if (success) {
            setChats(chats.filter(chat => chat.id !== chatId));
        } else {
            alert('Failed to delete chat.');
        }
    }
  };


  return (
    <div className="w-full h-full flex flex-col bg-gray-800/50 rounded-xl shadow-2xl animate-fade-in">
        <div className="draggable flex-shrink-0 p-3 flex justify-between items-center border-b border-gray-700/50">
            <button onClick={() => navigate('landing')} className="non-draggable text-gray-400 hover:text-white transition-colors">&larr; Back</button>
            <h2 className="text-lg font-semibold">Chat History</h2>
            <div className="w-12"></div> {/* Spacer */}
        </div>
        <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
            {loading && <p>Loading history...</p>}
            {!loading && chats.length === 0 && <p className="text-center text-gray-400">No chat history found.</p>}
            <ul className="space-y-2">
                {chats.map(chat => (
                    <li key={chat.id} onClick={() => navigate('chat', chat.id)} 
                        className="p-3 bg-gray-700/60 rounded-lg hover:bg-gray-600/80 cursor-pointer transition-colors flex justify-between items-center">
                        <div>
                            <p className="font-bold">{chat.title}</p>
                            <p className="text-xs text-gray-400">Last updated: {new Date(chat.updatedAt).toLocaleString()}</p>
                        </div>
                        <button onClick={(e) => handleDelete(e, chat.id)} className="non-draggable text-red-500 hover:text-red-400 p-1">
                          &#x1F5D1;
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default HistoryPage;