import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  text: string;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
        <path d="M2 5a1 1 0 0 1 1-1h1v1H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
    </svg>
);

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
            code({ node, inline, className, children, ...props }) {
            const [copied, setCopied] = useState(false);
            const match = /language-(\w+)/.exec(className || '');
            const codeText = String(children).replace(/\n$/, '');

            const handleCopy = () => {
                const textArea = document.createElement('textarea');
                textArea.value = codeText;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000); 
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
                document.body.removeChild(textArea);
            };

            return !inline && match ? (
                <div className="relative">
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800/70 text-gray-300 hover:bg-gray-700/90 transition-all duration-200"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <>
                            <span>copied</span> <CheckIcon />
                        </>
                    ) : (
                        <>
                            <span>copy</span> <CopyIcon />
                        </>
                    )}
                </button>
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {codeText}
                </SyntaxHighlighter>
                </div>
            ) : (
                <code className="text-sm bg-gray-700/50 text-amber-300 py-0.5 px-1.5 rounded-md" {...props}>
                {children}
                </code>
            );
            },
        }}
        >
        {text}
        </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
