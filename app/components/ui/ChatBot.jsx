"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { MessageSquare, X, Send, Sparkles, Minimize2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function ChatBot({ isFullPage = false }) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(isFullPage);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isDark = theme === "dark";
  const isChatPage = pathname === "/loria-ai-bot";

  useEffect(() => {
    setMounted(true);
    // Remove default message to show empty state with logo
    setMessages([]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ((isOpen || isFullPage) && inputRef.current && !isMinimized) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, isFullPage]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Set loading state (add placeholder or spinner if desired, but for now we just wait)
    const currentMessages = [...messages, userMessage];

    // Add a temporary loading message or just wait? 
    // Let's add a temporary invisible loading state or just handle it in the UI if needed
    // For now, we just fetch.

    try {
      const response = await fetch('/api/loria-ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: inputValue })
      });

      const data = await response.json();

      if (data.answer) {
        const botMessage = {
          id: messages.length + 2,
          text: data.answer,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        // Handle error or empty response
        const errorMessage = {
          id: messages.length + 2,
          text: data.error || "I'm having trouble connecting right now. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, something went wrong. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) return null;

  // Logic for Floating Button Mode
  if (!isFullPage) {
    // If we are already on the chat page, don't show the floating button
    if (isChatPage) return null;

    return (
      <button
        onClick={() => router.push("/loria-ai-bot")}
        className={`fixed bottom-6 right-6 z-50 group flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-orange-500/50 ${isDark
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          : "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          }`}
        aria-label="Open chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" color="white" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 16C4 11.5817 7.58172 8 12 8C16.4183 8 20 11.5817 20 16V18.1818C20 18.9423 20 19.3225 19.9314 19.6377C19.6818 20.7854 18.7854 21.6818 17.6377 21.9314C17.3225 22 16.9423 22 16.1818 22H7.81818C7.05771 22 6.67747 22 6.3623 21.9314C5.21464 21.6818 4.31822 20.7854 4.06856 19.6377C4 19.3225 4 18.9423 4 18.1818V16Z" />
          <path d="M12 8V5" />
          <circle cx="12" cy="3.5" r="1.5" />
          <path d="M9 13V14M15 13V14" />
          <path d="M4 18.5H8.09861C8.66175 18.5 9.18763 18.2186 9.5 17.75C9.81237 17.2814 10.3383 17 10.9014 17H13.0986C13.6617 17 14.1876 17.2814 14.5 17.75C14.8124 18.2186 15.3383 18.5 15.9014 18.5H20" />
        </svg>
        <span className="text-[10px] font-medium opacity-90">Liora</span>
      </button>
    );
  }

  // Logic for Full Page / Open Chat Window Mode
  if (isFullPage) {
    return (
      <div className={`flex w-full h-full font-sans ${isDark ? "bg-[#171717] text-gray-100" : "bg-white text-gray-900"}`}>
        {/* Sidebar */}
        <div className={`w-[260px] flex flex-col hidden md:flex border-r rounded-tr-4xl rounded-br-4xl ${isDark ? "bg-[#171717] border-white/5" : "bg-gray-50 border-gray-200"}`}>
          <div className="p-6 flex items-center justify-center">
            <Image
              src="/loria-logo.svg"
              alt="Liora Logo"
              width={160}
              height={40}
              className="w-auto h-12"
              priority
            />

          </div>
          <div className="p-3 ">
            <button
              onClick={() => {
                setMessages([]);
                setMounted(false);
                setTimeout(() => setMounted(true), 10); // Reset chat
              }}
              className={`flex items-center gap-2 w-full px-3 py-3 rounded-lg transition-colors text-sm ${isDark ? "text-white bg-orange-600" : "text-white bg-orange-600"}`}
            >
              <span className="text-xl">+</span> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className={`text-xs font-medium mb-2 px-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Today</div>
            <button className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}>
              Pipeline analysis for Q3
            </button>
            <button className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-200 text-gray-700"}`}>
              Draft email to John Doe
            </button>
          </div>
          <div className={`p-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors text-sm ${isDark ? "hover:bg-white/5 text-white" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-orange-500/30">
                CA
              </div>
              <div className="flex flex-col text-left">
                <span className="font-medium">CodeAce User</span>
                <span className="text-xs opacity-70">Back to Dashboard</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full relative ">


          {/* Messages */}
          <div className="flex-1 overflow-y-auto w-full ">
            <div className="flex flex-col items-center w-full pb-32 pt-10 " >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 gap-4">
                  <div className={`w-60 h-20 flex items-center justify-center mb-4 `}>
                    <Image
                      src="/loria-logo.svg"
                      alt="Liora Logo"
                      width={150}
                      height={40}

                      priority
                    />
                  </div>


                  <p className={`text-center max-w-xl text-xl leading-relaxed italic ${isDark ? "text-gray-400" : "text-gray-600"}`} style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                    I'm your intelligent sales companion, designed to help you close more deals. Ask me to analyze your pipeline, draft personalized emails, or provide strategic insights on your prospects.
                  </p>
                </div>

              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`w-full border-b  ${isDark ? "border-white/5 bg-[#171717] text-gray-100" : "border-gray-100 bg-white text-gray-800"}`}
                  >
                    <div className="max-w-3xl mx-auto py-8 px-4 flex gap-6">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-sm overflow-hidden">
                        {message.sender === "bot" ? (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                            U
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1 overflow-hidden">
                        <div className="prose prose-sm md:prose-base max-w-none leading-7 dark:prose-invert">
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className={`absolute bottom-0 w-full pt-10 pb-6 px-4 bg-gradient-to-t ${isDark ? "from-[#171717] via-[#171717] to-transparent" : "from-white via-white to-transparent"}`}>
            <div className="max-w-3xl mx-auto w-full">
              <div className={`relative flex items-end w-full p-3 rounded-2xl border shadow-lg ring-offset-2 transition-all ${isDark ? "bg-[#262626] border-white/10 focus-within:border-orange-500/50 focus-within:ring-orange-500/20" : "bg-white border-gray-200 focus-within:border-orange-500 focus-within:ring-orange-100"}`}>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message Liora..."
                  className={`w-full max-h-[200px] py-2 pl-2 pr-10 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none custom-scrollbar ${isDark ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-400"}`}
                  rows={1}
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-all duration-200 ${inputValue.trim()
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20 hover:scale-105"
                    : isDark ? "bg-transparent text-gray-500 cursor-not-allowed" : "bg-transparent text-gray-300 cursor-not-allowed"
                    }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Liora can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logic for Open Chat Window Mode (Modal - Not used when FullPage)
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[420px] ${isMinimized ? "h-16" : "h-[580px]"
        } rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isDark
          ? "bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-gray-800"
          : "bg-gradient-to-b from-white to-gray-50 border border-gray-200"
        }`}
    >
      {/* Header with gradient */}
      <div
        className={`relative flex items-center justify-between p-5 ${isDark
          ? "bg-gradient-to-r from-orange-600/20 to-orange-500/10 border-b border-gray-800"
          : "bg-gradient-to-r from-orange-500/10 to-orange-400/5 border-b border-gray-200"
          }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`relative p-2.5 rounded-xl ${isDark
              ? "bg-gradient-to-br from-orange-500/30 to-orange-600/20"
              : "bg-gradient-to-br from-orange-100 to-orange-50"
              }`}
          >
            <Sparkles
              className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"
                }`}
            />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <h3
              className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"
                }`}
            >
              AI Assistant
            </h3>
            <div className={`text-xs flex items-center gap-1.5 ${isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Online now
            </div>
          </div>
        </div>

        {/* Controls - Hide if full page mode */}
        {!isFullPage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={`p-2 rounded-lg transition-colors ${isDark
                ? "hover:bg-gray-800/50 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
                }`}
              aria-label={isMinimized ? "Expand" : "Minimize"}
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-2 rounded-lg transition-colors ${isDark
                ? "hover:bg-gray-800/50 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
                }`}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {(!isMinimized || isFullPage) && (
        <>
          <div
            className={`flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar ${isDark ? "bg-[#0f0f0f]" : "bg-gray-50/50"
              }`}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] ${message.sender === "user"
                    ? "rounded-2xl rounded-tr-sm"
                    : " rounded-tr-2xl rounded-br-2xl rounded-bl-2xl"
                    } px-4 py-3 shadow-lg ${message.sender === "user"
                      ? isDark
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                        : "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                      : isDark
                        ? "bg-[#262626] text-gray-100 border border-gray-700/50"
                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                    }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.text}
                  </p>
                  <p
                    className={`text-[10px] mt-1.5 ${message.sender === "user"
                      ? "text-orange-100/80"
                      : isDark
                        ? "text-gray-500"
                        : "text-gray-400"
                      }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className={`p-4 border-t ${isDark
              ? "border-gray-800 bg-[#1a1a1a]"
              : "border-gray-200 bg-white"
              }`}
          >
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className={`w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${isDark
                    ? "bg-[#0f0f0f] border border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500/50"
                    : "bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-orange-500"
                    }`}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`p-3 rounded-xl transition-all duration-200 ${inputValue.trim()
                  ? isDark
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 hover:scale-105"
                    : "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 hover:scale-105"
                  : isDark
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? "#374151" : "#d1d5db"};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "#4b5563" : "#9ca3af"};
        }
      `}</style>
    </div>
  );
}

