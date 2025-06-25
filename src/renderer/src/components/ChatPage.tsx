import React, { useState, FormEvent, useRef, useEffect } from 'react'
import 'regenerator-runtime/runtime'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { Page } from '../App'
import MarkdownRenderer from './MarkdownRenderer'

// Component's props interface
interface ChatPageProps {
  navigate: (page: Page, chatId?: string | null) => void
  chatId: string | null
  setChatId: (id: string | null) => void
}

// Message data structure
interface Message {
  sender: 'user' | 'ai'
  text: string
}

// Gemini API history entry structure
type GeminiRole = 'user' | 'model'
interface GeminiHistoryEntry {
  role: GeminiRole
  parts: [{ text: string }]
}

const ChatPage: React.FC<ChatPageProps> = ({ navigate, chatId, setChatId }) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAudioMode, setIsAudioMode] = useState(false) 
  const [visionTriggered, setVisionTriggered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimer = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Recognition Commands and Hook
  const commands = [
    {
      command: ['read my screen', 'look at this', "what's on my screen", 'analyze this screen'],
      callback: () => setVisionTriggered(true),
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.8
    }
  ];
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

  // --- Auto-sizing textarea logic ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Update input with speech transcript
  useEffect(() => {
    if (isAudioMode) setInput(transcript)
  }, [transcript, isAudioMode])

  // Auto-submit on silence
  useEffect(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    if (isAudioMode && transcript.trim()) {
      silenceTimer.current = setTimeout(() => handleSubmit(), 1500)
    }
    return () => { if (silenceTimer.current) clearTimeout(silenceTimer.current) }
  }, [transcript, isAudioMode])

  // Auto-scroll chat view
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history
  useEffect(() => {
    const loadChat = async () => {
      if (chatId) {
        setIsLoading(true)
        const chatContent = await window.electronAPI.history.getChatContent(chatId)
        if (chatContent && chatContent.messages) setMessages(chatContent.messages)
        else { setChatId(null); setMessages([]) }
        setIsLoading(false)
      } else {
        setMessages([])
      }
    }
    loadChat()
  }, [chatId, setChatId])

  // Handle form submission
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const finalInput = input.trim()
    if (!finalInput || isLoading) return

    SpeechRecognition.stopListening()
    const userMessage: Message = { sender: 'user', text: finalInput }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    resetTranscript()
    setIsLoading(true)

    const shouldIncludeScreenshot = visionTriggered;
    if (visionTriggered) setVisionTriggered(false);

    try {
      const currentHistory = [...messages, userMessage];
      const aiHistory: GeminiHistoryEntry[] = currentHistory.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const aiResponse = await window.electronAPI.invokeAI(finalInput, shouldIncludeScreenshot, aiHistory.slice(0, -1))
      const aiMessage: Message = { sender: 'ai', text: aiResponse }

      // This flag checks if the chat was new *before* this turn.
      const isNewChat = !chatId;

      const savedChatId = await window.electronAPI.history.saveChat({
        chatId: chatId,
        messagesToAppend: [userMessage, aiMessage]
      })

      // **NEW** Title Generation Logic
      if (isNewChat && savedChatId) {
        setChatId(savedChatId) // Set the new ID immediately
        // Trigger title generation in the background after the first successful turn
        const historyForTitle = [...aiHistory, { role: 'model', parts: [{ text: aiMessage.text }] }];
        // Use a timeout to avoid spamming the API on rapid succession, just in case
        setTimeout(() => {
            window.electronAPI.history.generateTitle(savedChatId, historyForTitle);
        }, 1000);
      }
      
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error(error)
      const errorMessage: Message = { sender: 'ai', text: 'Sorry, something went wrong.' }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      if (isAudioMode) {
        resetTranscript()
        SpeechRecognition.startListening({ continuous: true })
      }
    }
  }
  
  // Handle keydown for textarea (Enter to submit, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleAudioMode = () => {
    const nextAudioModeState = !isAudioMode
    setIsAudioMode(nextAudioModeState)
    if (nextAudioModeState) {
      resetTranscript(); setInput('');
      SpeechRecognition.startListening({ continuous: true })
    } else {
      SpeechRecognition.stopListening()
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
    }
  }

  const startNewChat = () => {
    setIsAudioMode(false)
    SpeechRecognition.stopListening()
    setChatId(null)
    setMessages([])
    setInput('')
    resetTranscript()
  }

  if (!browserSupportsSpeechRecognition) {
    return <div className="p-4 text-center text-yellow-400">Browser does not support speech recognition.</div>
  }

  return (
    <div className="w-full h-full flex flex-col bg-black/70 rounded-xl shadow-2xl">
      <div className="draggable flex-shrink-0 p-3 flex justify-between items-center border-b border-white/10">
        <button onClick={() => navigate('history')} className="non-draggable text-gray-400 hover:text-white transition-colors">&larr; History</button>
        <h2 className="text-lg font-semibold text-gray-200">Nexus AI</h2>
        <button onClick={startNewChat} className="non-draggable text-gray-400 hover:text-white transition-colors">New Chat</button>
      </div>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 flex flex-col animate-fade-in-up ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] inline-block p-4 rounded-3xl text-left shadow-md ${msg.sender === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-lg' : 'bg-gray-800 text-gray-200 rounded-bl-lg'}`}>
              <MarkdownRenderer text={msg.text} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-4 animate-fade-in-up flex items-start">
            <div className={`bg-gray-800 inline-flex items-center p-4 rounded-3xl rounded-bl-lg mt-1`}>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="relative flex items-end p-2 bg-gray-900 rounded-2xl border border-gray-700 focus-within:border-indigo-500 transition-colors">
          <button
            type="button"
            onClick={toggleAudioMode}
            disabled={isLoading}
            className={`non-draggable p-2 rounded-full transition-all duration-300 self-center ${isAudioMode ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            title={isAudioMode ? 'Exit Audio Mode' : 'Enter Audio Mode'}
          >
            {isAudioMode && listening && <div className="absolute inset-0 rounded-full bg-red-400 animate-ping -z-10"></div>}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
          </button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isAudioMode}
            className="autoresize-textarea w-full bg-transparent text-gray-200 text-base pl-3 pr-10 focus:outline-none disabled:opacity-50 max-h-40"
            placeholder={isAudioMode ? 'Listening...' : 'Type or speak...'}
            rows={1}
          />

          <button type="submit" disabled={isLoading || !input.trim()} className="p-2 text-gray-400 hover:text-indigo-500 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors self-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 h-5">
            <div className={`flex items-center transition-opacity duration-300 ${isAudioMode ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 transition-colors ${visionTriggered ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-xs text-gray-400">
                    {visionTriggered ? 'Vision Triggered!' : 'Say "read my screen" for context.'}
                </span>
            </div>
        </div>
      </form>
    </div>
  )
}

export default ChatPage;
