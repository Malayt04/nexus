import React from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface Message {
  sender: "user" | "ai";
  text: string;
  file?: { name: string; path: string };
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  return (
    <div
      className={`mb-4 flex flex-col animate-fade-in-up ${
        message.sender === "user" ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`max-w-[85%] inline-block p-4 rounded-3xl text-left shadow-md ${
          message.sender === "user"
            ? "bg-black/60 text-white rounded-br-lg border border-white/10"
            : "bg-black/40 text-gray-200 rounded-bl-lg border border-white/10"
        }`}
      >
        <MarkdownRenderer text={message.text} />
        {message.file && (
          <div className="mt-2 p-2 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-300 font-medium">Attached File:</p>
            <p className="text-xs text-gray-400">{message.file.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MessageBubble);
