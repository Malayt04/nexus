import React, { useState, useEffect } from 'react';
import { Page } from '../App';

interface HistoryPageProps {
  navigate: (page: Page, chatId?: string) => void;
  onClose?: () => void;
}

interface ChatManifestEntry {
    id: string;
    title: string;
    updatedAt: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ navigate, onClose }) => {
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
    e.stopPropagation(); 
    const success = await window.electronAPI.history.deleteChat(chatId);
    if (success) {
        setChats(chats.filter(chat => chat.id !== chatId));
    } else {
        alert('Failed to delete chat.');
    }
  };


  return (
    <div className="w-full h-full flex flex-col rounded-xl shadow-2xl animate-fade-in">
        <div className="draggable flex-shrink-0 p-3 flex justify-between items-center border-b border-gray-700">
            <button onClick={onClose || (() => navigate('chat'))} className="non-draggable text-gray-400 hover:text-white transition-colors">&larr; Close</button>
            <h2 className="text-lg font-semibold text-gray-200">Chat History</h2>
            <div className="w-12"></div> {/* Spacer */}
        </div>
        <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
            {loading && <p>Loading history...</p>}
            {!loading && chats.length === 0 && <p className="text-center text-gray-400">No chat history found.</p>}
            <ul className="space-y-2">
                {chats.map(chat => (
                    <li key={chat.id} onClick={() => navigate('chat', chat.id)} 
                        className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/70 cursor-pointer transition-colors flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-200">{chat.title}</p>
                            <p className="text-xs text-gray-400">Last updated: {new Date(chat.updatedAt).toLocaleString()}</p>
                        </div>
                        <button onClick={(e) => handleDelete(e, chat.id)} className="non-draggable text-red-500 hover:text-red-400 p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default HistoryPage;