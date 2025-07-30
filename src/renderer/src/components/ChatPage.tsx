import React, { useState, FormEvent, useRef, useEffect, useMemo, useCallback } from 'react'
import 'regenerator-runtime/runtime'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { Page } from '../App'
import MessageBubble from './MessageBubble' 

interface ChatPageProps {
  navigate: (page: Page, chatId?: string | null) => void
  chatId: string | null
  setChatId: (id: string | null) => void
}

export interface Message { 
  sender: 'user' | 'ai'
  text: string
  file?: { name: string; path: string }
}

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
  const [visionTriggered, setVisionTriggered] = useState(false)
  const [includeScreenshot, setIncludeScreenshot] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{ name: string; path: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimer = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Memoize speech recognition commands to prevent unnecessary re-renders
  const commands = useMemo(() => [
    {
      command: ['read my screen', 'look at this', "what's on my screen", 'analyze this screen'],
      callback: () => setVisionTriggered(true),
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.8
    }
  ], [])
  
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition({ commands })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  useEffect(() => {
    if (isAudioMode) setInput(transcript)
  }, [transcript, isAudioMode])

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    if (e) e.preventDefault()
    const finalInput = input.trim()
    if ((!finalInput && !attachedFile) || isLoading) return

    SpeechRecognition.stopListening()
    const userMessage: Message = {
      sender: 'user',
      text: finalInput,
      file: attachedFile || undefined
    }
    
    // Immediate UI updates for better perceived performance
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    resetTranscript()
    const currentAttachedFile = attachedFile
    setAttachedFile(null)
    setIsLoading(true)
    
    // Reset states immediately
    if (includeScreenshot) setIncludeScreenshot(false)

    const shouldIncludeScreenshot = includeScreenshot || visionTriggered
    if (visionTriggered) setVisionTriggered(false)

    try {
      // Prepare history more efficiently - limit to last 4 messages (2 exchanges)
      const currentHistory = [...messages, userMessage]
      const aiHistory: GeminiHistoryEntry[] = currentHistory
        .slice(-4) // Reduced to last 4 messages for faster processing
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text.slice(0, 1000) }] // Trim long messages
        }))

      // Start AI call and chat saving in parallel
      const aiPromise = window.electronAPI.invokeAI(
        finalInput,
        shouldIncludeScreenshot,
        aiHistory.slice(0, -1),
        currentAttachedFile || undefined
      )
      
      const aiResponse = await aiPromise
      
      // Check if response is actually an error
      if (aiResponse.startsWith('Error:')) {
        throw new Error(aiResponse.substring(6)) // Remove 'Error: ' prefix
      }
      
      const aiMessage: Message = { sender: 'ai', text: aiResponse }
      
      // Update messages immediately
      setMessages((prev) => [...prev, aiMessage])
      
      // Handle chat saving asynchronously without blocking UI
      const isNewChat = !chatId
      setTimeout(() => {
        window.electronAPI.history.saveChat({
          chatId: chatId,
          messagesToAppend: [userMessage, aiMessage]
        }).then(savedChatId => {
          if (isNewChat && savedChatId) {
            setChatId(savedChatId)
            // Generate title asynchronously with minimal history
            const titleHistory = aiHistory.slice(-2).concat([{ role: 'model', parts: [{ text: aiMessage.text.slice(0, 200) }] }])
            window.electronAPI.history.generateTitle(savedChatId, titleHistory as any)
          }
        }).catch(error => console.error('Chat saving failed:', error))
      }, 0)
      
    } catch (error) {
      console.error(error)
      const errorMessage: Message = { 
        sender: 'ai', 
        text: error instanceof Error && error.message.includes('timeout') 
          ? 'Request timed out. Please try again with a smaller image or simpler query.'
          : 'Sorry, something went wrong. Please try again.'
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      if (isAudioMode) {
        resetTranscript()
        SpeechRecognition.startListening({ continuous: true })
      }
    }
  }, [input, attachedFile, isLoading, includeScreenshot, visionTriggered, messages, chatId, isAudioMode, resetTranscript, setChatId])

  const startNewChat = useCallback(() => {
    setIsAudioMode(false)
    SpeechRecognition.stopListening()
    setChatId(null)
    setMessages([])
    setInput('')
    resetTranscript()
    setIncludeScreenshot(false)
    setAttachedFile(null)
  }, [resetTranscript, setChatId])

  useEffect(() => {
    const handleFocusInput = () => {
      if (textareaRef.current) {
        if (document.activeElement === textareaRef.current) {
          textareaRef.current.blur();
        } else {
          textareaRef.current.focus();
        }
      }
    };

    const handleToggleScreenshot = () => {
      setIncludeScreenshot(prev => !prev)
      // Focus on the input if screenshot is enabled
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }

    window.electronAPI.onFocusInput(handleFocusInput)
    window.electronAPI.onSendMessage(handleSubmit as () => void);
    window.electronAPI.onNewChat(startNewChat);
    window.electronAPI.onToggleScreenshot(handleToggleScreenshot)
    
    return () => {
      // Cleanup if needed
    }
  }, [startNewChat, handleSubmit])

  useEffect(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
    if (isAudioMode && transcript.trim()) {
      silenceTimer.current = setTimeout(() => handleSubmit(), 1500)
    }
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
    }
  }, [transcript, isAudioMode, handleSubmit])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const loadChat = async () => {
      if (chatId) {
        setIsLoading(true)
        const chatContent = await window.electronAPI.history.getChatContent(chatId)
        if (chatContent && chatContent.messages) setMessages(chatContent.messages)
        else {
          setChatId(null)
          setMessages([])
        }
        setIsLoading(false)
      } else {
        setMessages([])
      }
    }
    loadChat()
  }, [chatId, setChatId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const toggleAudioMode = useCallback(() => {
    const nextAudioModeState = !isAudioMode
    setIsAudioMode(nextAudioModeState)
    if (nextAudioModeState) {
      resetTranscript()
      setInput('')
      SpeechRecognition.startListening({ continuous: true })
    } else {
      SpeechRecognition.stopListening()
      if (silenceTimer.current) clearTimeout(silenceTimer.current)
    }
  }, [isAudioMode, resetTranscript])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFile({ name: file.name, path: (file as any).path })
    }
  }, [])

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-4 text-center text-yellow-400">
        Browser does not support speech recognition.
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col rounded-xl shadow-2xl bg-gray-900/80 border border-gray-600">
      <div className="draggable flex-shrink-0 p-3 flex justify-between items-center border-b border-gray-600">
        <button
          onClick={() => navigate('history')}
          className="non-draggable text-gray-300 hover:text-white transition-colors"
        >
          &larr; History
        </button>
        <h2 className="text-lg font-semibold text-white">Nexus AI</h2>
        <button
          onClick={startNewChat}
          className="non-draggable text-gray-300 hover:text-white transition-colors"
        >
          New Chat
        </button>
      </div>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}

        {isLoading && (
          <div className="mb-4 animate-fade-in-up flex items-start">
            <div
              className={`bg-gray-800 inline-flex items-center p-4 rounded-3xl rounded-bl-lg mt-1`}
            >
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="mb-7 relative flex items-end p-2 bg-gray-900 rounded-2xl border border-gray-700 focus-within:border-indigo-500 transition-colors">
          <button
            type="button"
            onClick={toggleAudioMode}
            disabled={isLoading}
            className={`non-draggable p-2 rounded-full transition-all duration-300 self-center ${
              isAudioMode
                ? 'bg-red-500 text-white shadow-lg scale-110'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={isAudioMode ? 'Exit Audio Mode' : 'Enter Audio Mode'}
          >
            {isAudioMode && listening && (
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping -z-10"></div>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="non-draggable p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all duration-300 self-center ml-2"
            title="Attach a file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setIncludeScreenshot(!includeScreenshot)}
            className={`non-draggable p-2 rounded-full transition-all duration-300 self-center ml-2 ${
              includeScreenshot ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={includeScreenshot ? 'Screenshot enabled' : 'Enable screenshot'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
              />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isAudioMode}
            className="non-draggable autoresize-textarea w-full bg-transparent text-gray-200 text-base pl-3 pr-10 pb-2 focus:outline-none disabled:opacity-50 max-h-40"
            placeholder={isAudioMode ? 'Listening...' : 'Type or speak...'}
            rows={1}
          />

          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !attachedFile)}
            className="non-draggable p-2 text-gray-400 hover:text-indigo-500 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors self-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 transition-colors ${isAudioMode && listening ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-1 space-x-4 h-5">
          {includeScreenshot && (
            <div className="text-xs text-green-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              Screenshot enabled
            </div>
          )}
          {attachedFile && (
            <div className="text-xs text-gray-400 flex items-center bg-gray-800 px-2 py-1 rounded-md">
              <span>{attachedFile.name}</span>
              <button type="button" onClick={() => setAttachedFile(null)} className="ml-2 text-red-500 hover:text-red-400">&times;</button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

export default ChatPage