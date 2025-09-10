import React, {
  useState,
  FormEvent,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { Page } from "../App";
import MessageBubble from "./MessageBubble";

// Lightweight unique ID for streaming requests
const cryptoRandomId = (): string => {
  try {
    // @ts-ignore - crypto is available in Chromium runtime
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      // @ts-ignore
      return (crypto as any).randomUUID();
    }
  } catch {}
  return "req_" + Math.random().toString(36).slice(2);
};

interface ChatPageProps {
  navigate: (page: Page, chatId?: string | null) => void;
  chatId: string | null;
  setChatId: (id: string | null) => void;
  onClose?: () => void;
}

export interface Message {
  sender: "user" | "ai";
  text: string;
  file?: { name: string; path: string };
}

type GeminiRole = "user" | "model";
interface GeminiHistoryEntry {
  role: GeminiRole;
  parts: [{ text: string }];
}

const ChatPage: React.FC<ChatPageProps> = ({
  navigate,
  chatId,
  setChatId,
  onClose,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [streamingRequestId, setStreamingRequestId] = useState<string | null>(
    null
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingChunkRef = useRef<string>("");
  const rafIdRef = useRef<number | null>(null);

  // Memoize speech recognition commands to prevent unnecessary re-renders
  const commands = useMemo(
    () => [
      {
        command: [
          "read my screen",
          "look at this",
          "what's on my screen",
          "analyze this screen",
        ],
        callback: () => {
          // These voice commands will be handled by the AI's take_screenshot tool automatically
          // No need for manual state management
        },
        isFuzzyMatch: true,
        fuzzyMatchingThreshold: 0.8,
      },
    ],
    []
  );

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    if (isAudioMode) setInput(transcript);
  }, [transcript, isAudioMode]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      const finalInput = input.trim();
      if ((!finalInput && !attachedFile) || isLoading) return;

      SpeechRecognition.stopListening();
      const userMessage: Message = {
        sender: "user",
        text: finalInput,
        file: attachedFile || undefined,
      };

      // Immediate UI updates for better perceived performance
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      resetTranscript();
      const currentAttachedFile = attachedFile;
      setAttachedFile(null);
      setIsLoading(true);
      setIsStreaming(true);

      try {
        // Prepare history more efficiently - limit to last 4 messages (2 exchanges)
        const currentHistory = [...messages, userMessage];
        const aiHistory: GeminiHistoryEntry[] = currentHistory
          .slice(-4) // Reduced to last 4 messages for faster processing
          .map((msg) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text.slice(0, 1000) }], // Trim long messages
          }));

        // Streamed response handling
        const reqId = cryptoRandomId();
        setStreamingRequestId(reqId);

        // Optimistically add an empty AI message; we will append chunks into it
        setMessages((prev) => [...prev, { sender: "ai", text: "" }]);

        const flushChunks = () => {
          if (!pendingChunkRef.current) {
            rafIdRef.current = null;
            return;
          }
          const chunkText = pendingChunkRef.current;
          pendingChunkRef.current = "";
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].sender === "ai") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                text: updated[lastIndex].text + chunkText,
              };
            }
            return updated;
          });
          rafIdRef.current = null;
        };

        const onChunk = (_: any, data: { requestId: string; text: string }) => {
          if (data.requestId !== reqId) return;
          pendingChunkRef.current += data.text;
          if (rafIdRef.current == null) {
            rafIdRef.current = requestAnimationFrame(flushChunks);
          }
        };
        const onEnd = (
          _: any,
          data: { requestId: string; finalText: string }
        ) => {
          if (data.requestId !== reqId) return;
          // Flush any pending chunks before finalizing
          if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
          if (pendingChunkRef.current) {
            const toAppend = pendingChunkRef.current;
            pendingChunkRef.current = "";
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0 && updated[lastIndex].sender === "ai") {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  text: updated[lastIndex].text + toAppend,
                };
              }
              return updated;
            });
          }
          cleanup();
          setIsStreaming(false);
          setIsLoading(false);
          // Persist chat after final text
          const isNewChat = !chatId;
          const finalAiMessage: Message = {
            sender: "ai",
            text: data.finalText,
          };
          setTimeout(() => {
            window.electronAPI.history
              .saveChat({
                chatId: chatId,
                messagesToAppend: [userMessage, finalAiMessage],
              })
              .then((savedChatId) => {
                if (isNewChat && savedChatId) {
                  setChatId(savedChatId);
                  const titleHistory = aiHistory.slice(-2).concat([
                    {
                      role: "model",
                      parts: [{ text: data.finalText.slice(0, 200) }],
                    },
                  ]);
                  window.electronAPI.history.generateTitle(
                    savedChatId,
                    titleHistory as any
                  );
                }
              })
              .catch((error) => console.error("Chat saving failed:", error));
          }, 0);
        };
        const onError = (
          _: any,
          data: { requestId: string; error: string }
        ) => {
          if (data.requestId !== reqId) return;
          cleanup();
          setIsStreaming(false);
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: "Sorry, something went wrong. Please try again.",
            },
          ]);
        };

        const cleanup = () => {
          if (chunkUnsub) chunkUnsub();
          if (endUnsub) endUnsub();
          if (errUnsub) errUnsub();
        };

        const chunkUnsub = window.electronAPI.onAIStreamChunk(onChunk);
        const endUnsub = window.electronAPI.onAIStreamEnd(onEnd);
        const errUnsub = window.electronAPI.onAIStreamError(onError);

        await window.electronAPI.invokeAIStream(
          reqId,
          finalInput,
          aiHistory.slice(0, -1),
          currentAttachedFile || undefined
        );
        // History saving happens on stream end
      } catch (error) {
        console.error(error);
        const errorMessage: Message = {
          sender: "ai",
          text:
            error instanceof Error && error.message.includes("timeout")
              ? "Request timed out. Please try again with a smaller image or simpler query."
              : "Sorry, something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        // keep loading true while streaming; flags handled on end/error
        if (isAudioMode) {
          resetTranscript();
          SpeechRecognition.startListening({ continuous: true });
        }
      }
    },
    [
      input,
      attachedFile,
      isLoading,
      messages,
      chatId,
      isAudioMode,
      resetTranscript,
      setChatId,
    ]
  );

  const startNewChat = useCallback(() => {
    setIsAudioMode(false);
    SpeechRecognition.stopListening();
    setChatId(null);
    setMessages([]);
    setInput("");
    resetTranscript();
    setAttachedFile(null);
    setStreamingRequestId(null);
    setIsStreaming(false);
  }, [resetTranscript, setChatId]);

  useEffect(() => {
    const handleFocusInput = () => {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
          window.focus();
        }
      }, 100);
    };

    // Register listeners and store cleanup functions
    const cleanupFocus = window.electronAPI.onFocusInput(handleFocusInput);
    const cleanupSendMessage = window.electronAPI.onSendMessage(
      handleSubmit as () => void
    );
    const cleanupNewChat = window.electronAPI.onNewChat(startNewChat);

    // Return cleanup function to remove listeners
    return () => {
      if (cleanupFocus) cleanupFocus();
      if (cleanupSendMessage) cleanupSendMessage();
      if (cleanupNewChat) cleanupNewChat();
    };
  }, [startNewChat, handleSubmit]);

  useEffect(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (isAudioMode && transcript.trim()) {
      silenceTimer.current = setTimeout(() => handleSubmit(), 1500);
    }
    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, [transcript, isAudioMode, handleSubmit]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadChat = async () => {
      if (chatId) {
        setIsLoading(true);
        const chatContent = await window.electronAPI.history.getChatContent(
          chatId
        );
        if (chatContent && chatContent.messages)
          setMessages(chatContent.messages);
        else {
          setChatId(null);
          setMessages([]);
        }
        setIsLoading(false);
      } else {
        setMessages([]);
      }
    };
    loadChat();
  }, [chatId, setChatId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) handleSubmit();
      }
    },
    [handleSubmit, isStreaming]
  );

  const toggleAudioMode = useCallback(() => {
    const nextAudioModeState = !isAudioMode;
    setIsAudioMode(nextAudioModeState);
    if (nextAudioModeState) {
      resetTranscript();
      setInput("");
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    }
  }, [isAudioMode, resetTranscript]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setAttachedFile({ name: file.name, path: (file as any).path });
      }
    },
    []
  );

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-4 text-center text-yellow-400">
        Browser does not support speech recognition.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4 py-6 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white/90 mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-white/60 max-w-md">
                Ask me anything! I can help with coding, writing, analysis, or
                just have a friendly chat.
              </p>
              <div className="mt-4 text-xs text-white/40">
                Press Ctrl+\ to focus, then start typing...
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))
          )}

          {isLoading && (
            <div className="mb-4 animate-fade-in-up flex items-start">
              <div className="bg-white/10 backdrop-blur-sm inline-flex items-center p-4 rounded-2xl border border-white/10">
                <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></span>
                <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div className="flex-shrink-0 pt-2 bg-transparent">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end p-2 bg-black/30 rounded-2xl border border-white/20 focus-within:border-blue-400/60 focus-within:shadow-lg focus-within:shadow-blue-500/20 transition-all duration-300">
            {/* Audio Mode Button */}
            <button
              type="button"
              onClick={toggleAudioMode}
              disabled={isLoading}
              className={`p-2.5 rounded-full transition-all duration-300 self-center ${
                isAudioMode
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                  : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              }`}
              title={isAudioMode ? "Exit Audio Mode" : "Enter Audio Mode"}
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
            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-300 self-center ml-2"
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

            {/* Main Input Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isAudioMode}
              className="flex-1 bg-transparent text-white text-base px-3 py-1.5 focus:outline-none disabled:opacity-50 resize-none min-h-[32px] max-h-28"
              placeholder={isAudioMode ? "Listening..." : "Ask me anything..."}
              rows={1}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className={`p-2.5 rounded-full transition-all duration-300 self-center ml-2 ${
                (!input.trim() && !attachedFile) || isLoading
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105"
              }`}
              title="Send Message (Enter)"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>

          {/* File Attachment Indicator */}
          {attachedFile && (
            <div className="absolute -top-12 left-4 text-xs text-white/80 flex items-center bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81"
                />
              </svg>
              <span>{attachedFile.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="ml-2 text-red-400 hover:text-red-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Audio Mode Indicator */}
          {isAudioMode && listening && (
            <div className="absolute -top-12 right-4 text-xs text-white/80 flex items-center bg-red-500/20 backdrop-blur-sm px-3 py-2 rounded-xl border border-red-500/30">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <span>Listening...</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
