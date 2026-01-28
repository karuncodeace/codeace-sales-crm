"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { MessageSquare, X, Send, Sparkles, Minimize2, Trash2, History, Settings, HelpCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import AnalyticsChart from "./AnalyticsChart";

// Chart Loading Skeleton Component
function ChartLoadingSkeleton({ isDark = false }) {
  return (
    <div className={`w-full animate-in fade-in slide-in-from-bottom-4 duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
      {/* Title skeleton */}
      <div className={`h-6 w-48 mb-3 rounded-lg animate-pulse ${
        isDark ? "bg-gray-700" : "bg-gray-200"
      }`} />
      
      {/* Chart container skeleton */}
      <div className={`rounded-xl p-6 border shadow-md ${
        isDark
          ? "bg-gray-900 border-gray-700"
          : "bg-white border-gray-200"
      }`}>
        <div className="relative w-full h-[400px] flex items-center justify-center">
          {/* Animated spinner */}
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full border-4 ${
              isDark 
                ? "border-gray-700 border-t-orange-500" 
                : "border-gray-200 border-t-orange-500"
            } animate-spin`} />
            <p className={`text-sm font-medium ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}>
              Generating chart...
            </p>
          </div>
          
          {/* Skeleton chart shape */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className={`w-64 h-64 rounded-full border-8 ${
              isDark ? "border-gray-700" : "border-gray-200"
            } animate-pulse`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatBot({ isFullPage = false }) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(isFullPage);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [typingMessages, setTypingMessages] = useState({}); // Track typing animation state
  const typingIntervalsRef = useRef({}); // Track intervals for cleanup
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isDark = theme === "dark";
  const isChatPage = pathname === "/loria-ai-bot";

  // Initialize chat history from localStorage
  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem('loria_chat_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed);
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
    // Start with empty messages
    setMessages([]);
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('loria_chat_history', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Typing animation hook
  useEffect(() => {
    // Cleanup function for all intervals
    return () => {
      Object.values(typingIntervalsRef.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
      typingIntervalsRef.current = {};
    };
  }, []);

  // Typing animation effect
  useEffect(() => {
    // Find messages that need typing animation
    const botMessagesNeedingAnimation = messages.filter(
      (message) => message.sender === "bot" && !message.isTypingComplete
    );

    botMessagesNeedingAnimation.forEach((message) => {
      const messageId = message.id;
      const fullText = message.text;
      
      // Skip if already animating or interval exists
      if (typingIntervalsRef.current[messageId] || (typingMessages[messageId] && typingMessages[messageId].isAnimating)) {
        return;
      }

      // Initialize typing state
      setTypingMessages((prev) => ({
        ...prev,
        [messageId]: {
          displayedText: "",
          isComplete: false,
          isAnimating: true,
        },
      }));

      // Start typing animation
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          currentIndex += 1;
          setTypingMessages((prev) => ({
            ...prev,
            [messageId]: {
              displayedText: fullText.substring(0, currentIndex),
              isComplete: false,
              isAnimating: true,
            },
          }));
        } else {
          clearInterval(typingInterval);
          delete typingIntervalsRef.current[messageId];
          setTypingMessages((prev) => ({
            ...prev,
            [messageId]: {
              displayedText: fullText,
              isComplete: true,
              isAnimating: false,
            },
          }));
          // Mark message as typing complete
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, isTypingComplete: true } : msg
            )
          );
        }
      }, 15); // Adjust speed: lower = faster (15ms per character)

      // Store interval reference
      typingIntervalsRef.current[messageId] = typingInterval;
    });
  }, [messages]); // Only depend on messages

  // Save current chat to history
  const saveCurrentChat = () => {
    if (messages.length > 0 && currentChatId) {
      const chatTitle = messages[0]?.text?.substring(0, 50) || "New Chat";
      const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
      const updatedChat = {
        id: currentChatId,
        title: chatTitle,
        messages: [...messages],
        updatedAt: new Date().toISOString(),
      };
      
      if (existingChatIndex >= 0) {
        // Update existing chat
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[existingChatIndex] = updatedChat;
          return updated;
        });
      } else {
        // Add new chat
        setChatHistory((prev) => [updatedChat, ...prev.slice(0, 9)]); // Keep last 10 chats
      }
    }
  };

  // Create new chat
  const handleNewChat = () => {
    // Save current chat to history if it has messages
    saveCurrentChat();
    // Clear current chat
    setMessages([]);
    setCurrentChatId(Date.now());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clear all messages in current chat
  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm("Are you sure you want to clear this conversation?")) {
      setMessages([]);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Load chat from history
  const handleLoadChat = (chat) => {
    // Mark all messages as typing complete when loading from history
    const messagesWithTypingComplete = chat.messages.map(msg => ({
      ...msg,
      isTypingComplete: true
    }));
    setMessages(messagesWithTypingComplete);
    setCurrentChatId(chat.id);
    // Initialize typing messages state for loaded messages (all complete)
    const loadedTypingState = {};
    messagesWithTypingComplete.forEach(msg => {
      if (msg.sender === "bot") {
        loadedTypingState[msg.id] = {
          displayedText: msg.text,
          isComplete: true,
          isAnimating: false,
        };
      }
    });
    setTypingMessages(loadedTypingState);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Delete chat from history
  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

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

  /**
   * Extracts primary display field from record based on table type
   */
  const getPrimaryDisplayField = (record) => {
    // Try common field names in order of preference
    return record.title || 
           record.name || 
           record.lead_name || 
           record.task_title || 
           record.booking_name ||
           record.contact_name ||
           // Fallback to first non-id field
           Object.keys(record).find(key => key !== "id" && !key.endsWith("_id") && key !== "created_at" && key !== "updated_at") || 
           "Record";
  };

  /**
   * Formats list data as bullet points
   */
  const formatListData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return "No records found.";
    }

    return data
      .map(record => {
        const field = getPrimaryDisplayField(record);
        const value = record[field];
        return value ? String(value) : null;
      })
      .filter(Boolean)
      .map(item => `- ${item}`)
      .join("\n");
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userQuestion = inputValue.trim();
    const userMessage = {
      id: Date.now(),
      text: userQuestion,
      sender: "user",
      timestamp: new Date(),
    };

    // Initialize chat ID if this is the first message
    if (!currentChatId) {
      setCurrentChatId(Date.now());
    }

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the AI Insights proxy endpoint (which forwards to Flask backend)
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Use the detailed message from the API if available
        const errorMessage = errorData.message || errorData.error || `Failed to get response (${response.status})`;
        console.error("API Error:", {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          details: errorData.details,
          fullError: errorData
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Debug logging - show full response structure
      console.log("API Response (Full):", data);
      console.log("API Response (Summary):", {
        hasAnswer: !!data.answer,
        answerLength: data.answer?.length,
        answerPreview: data.answer?.substring(0, 50),
        intent: data.intent,
        isAnalytics: data.intent === "analytics_visual",
        chart_type: data.chart_type,
        hasChartData: !!data.data,
        chartDataLength: data.data?.length,
        hasTitle: !!data.title,
        hasXAxis: !!data.x_axis,
        hasYAxis: !!data.y_axis
      });

      // Check if this is an analytics visualization response
      // Support both explicit intent OR presence of chart data fields
      const hasChartFields = data.chart_type && data.data && Array.isArray(data.data) && data.data.length > 0;
      const isAnalyticsVisual = data.intent === "analytics_visual" || hasChartFields;
      
      if (hasChartFields && data.intent !== "analytics_visual") {
        console.warn("Chart data detected but intent is not 'analytics_visual':", data.intent);
      }

      // Extract answer with safe fallback support
      // Flask returns: { "intent": "...", "answer": "..." }
      // Support fallbacks: data.response || data.answer || data.message
      const answerText = data.response || data.answer || data.message;

      if (answerText || isAnalyticsVisual) {
        // Build chart data object if this is an analytics response
        let chartData = null;
        if (isAnalyticsVisual) {
          chartData = {
            intent: data.intent,
            chart_type: data.chart_type,
            title: data.title,
            x_axis: data.x_axis,
            y_axis: data.y_axis,
            data: data.data
          };
          console.log("Chart data prepared:", {
            intent: chartData.intent,
            chart_type: chartData.chart_type,
            title: chartData.title,
            x_axis: chartData.x_axis,
            y_axis: chartData.y_axis,
            dataLength: chartData.data?.length,
            sampleData: chartData.data?.slice(0, 2)
          });
        }

        const botMessage = {
          id: Date.now() + 1,
          text: answerText || "", // Empty text if it's only a chart
          sender: "bot",
          timestamp: new Date(),
          isList: false,
          isTypingComplete: false, // Mark for typing animation
          chartData: chartData
        };
        
        console.log("Bot message created:", {
          hasText: !!botMessage.text,
          hasChartData: !!botMessage.chartData,
          chartIntent: botMessage.chartData?.intent
        });
        
        setMessages((prev) => [...prev, botMessage]);
      } 
      // Handle error response (no answer field found)
      else {
        const errorMessage = {
          id: Date.now() + 1,
          text: data.message || data.error || "I'm having trouble connecting right now. Please try again.",
          sender: "bot",
          timestamp: new Date(),
          isList: false,
          isTypingComplete: false, // Mark for typing animation
          chartData: null
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        text: error.message || "Sorry, something went wrong. Please try again later.",
        sender: "bot",
        timestamp: new Date(),
        isList: false,
        isTypingComplete: false, // Mark for typing animation
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Auto-save chat after message is added
      if (currentChatId) {
        setTimeout(() => saveCurrentChat(), 100);
      }
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
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "";
      }
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
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
        <span className="text-[10px] font-medium opacity-90">Loria</span>
      </button>
    );
  }

  // Logic for Full Page / Open Chat Window Mode
  if (isFullPage) {
    return (
      <div className={`flex w-full h-full font-sans ${isDark ? "bg-[#171717] text-gray-100" : "bg-white text-gray-900"}`}>
        {/* Sidebar */}
        <div className={`w-[280px] flex flex-col hidden md:flex border-r ${isDark ? "bg-[#1a1a1a] border-white/5" : "bg-white border-gray-200"}`}>
          <div className="p-6 flex items-center justify-center">
            <Image
              src="/loria-logo.svg"
              alt="Loria Logo"
              width={160}
              height={40}
              className="w-auto h-12"
              priority
            />
          </div>

          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-200/10">
            <button
              onClick={handleNewChat}
              className={`flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl transition-all text-sm font-medium shadow-sm hover:shadow-md ${
                isDark 
                  ? "text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400" 
                  : "text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
              }`}
            >
              <span className="text-lg font-bold">+</span> 
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {chatHistory.length > 0 ? (
              <>
                <div className={`text-xs font-semibold mb-3 px-2 uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Recent Chats
                </div>
                <div className="space-y-1">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                        currentChatId === chat.id
                          ? isDark
                            ? "bg-orange-500/20 border border-orange-500/30"
                            : "bg-orange-50 border border-orange-200"
                          : isDark
                            ? "hover:bg-white/5 border border-transparent"
                            : "hover:bg-gray-100 border border-transparent"
                      }`}
                      onClick={() => handleLoadChat(chat)}
                    >
                      <History className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                      <span className={`flex-1 text-sm truncate ${
                        currentChatId === chat.id
                          ? isDark ? "text-orange-300 font-medium" : "text-orange-700 font-medium"
                          : isDark ? "text-gray-300" : "text-gray-700"
                      }`}>
                        {chat.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                          isDark
                            ? "hover:bg-red-500/20 text-red-400"
                            : "hover:bg-red-50 text-red-500"
                        }`}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={`text-center py-8 px-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No chat history</p>
                <p className="text-xs mt-1">Start a conversation to see it here</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer Actions */}
          <div className={`p-3 space-y-2 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  isDark
                    ? "hover:bg-white/5 text-gray-400 hover:text-gray-300"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat</span>
            </button>
            )}
            <button
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isDark
                  ? "hover:bg-white/5 text-gray-400 hover:text-gray-300"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help & Support</span>
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
        <div className="flex-1 flex flex-col h-full relative">
          {/* Header Bar */}
          <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm ${isDark ? "bg-[#171717]/95 border-white/5" : "bg-white/95 border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? "text-gray-100" : "text-gray-900"}`}>Loria AI</h2>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Sales CRM Assistant</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isDark
                    ? "hover:bg-white/5 text-gray-400 hover:text-gray-300"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
                }`}
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
            <div className="flex flex-col items-center w-full pb-32 pt-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 gap-4">
                  <div className={`w-60 h-20 flex items-center justify-center mb-6 `}>
                    <Image
                      src="/loria-logo.svg"
                      alt="Loria Logo"
                      width={150}
                      height={40}
                      priority
                    />
                  </div>
                  <p className={`text-center max-w-xl text-xl leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`} style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                    I'm Loria, your intelligent sales companion, designed to help you close more deals.
                  </p>
                  <p className={`text-center max-w-lg text-sm mt-3 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Ask me to analyze your pipeline, track leads, manage tasks, or get insights on your sales performance.
                  </p>
                </div>

              ) : (
                <>
                  {messages.map((message) => (
                  <div
                    key={message.id}
                      className={`w-full ${isDark ? "hover:bg-white/2" : "hover:bg-gray-50/50"} transition-colors`}
                  >
                      <div className="max-w-3xl mx-auto py-6 px-6 flex gap-4">
                        <div className="w-9 h-9 flex-shrink-0 flex items-start justify-center pt-0.5">
                        {message.sender === "bot" ? (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ring-2 ${
                              isDark 
                                ? "bg-gray-700 text-gray-200 ring-gray-600" 
                                : "bg-gray-100 text-gray-700 ring-gray-200"
                            }`}>
                              You
                            </div>
                          )}
                        </div>
                        <div className="relative flex-1 overflow-hidden min-w-0">
                          {/* Render chart if analytics_visual intent */}
                          {message.chartData && message.chartData.intent === "analytics_visual" && (
                            <div className="mb-4">
                              <AnalyticsChart chartData={message.chartData} isDark={isDark} />
                            </div>
                          )}
                          
                          {/* Show chart loading skeleton while chart is being generated */}
                          {isLoading && message.chartData === undefined && (
                            <div className="mb-4">
                              <ChartLoadingSkeleton isDark={isDark} />
                            </div>
                          )}
                          
                          {/* Render text content if present */}
                          {message.text && (
                            <div className={`text-sm md:text-base leading-relaxed ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                              {message.isList ? (
                                <div className="whitespace-pre-line font-medium">
                                  {message.isTypingComplete || !typingMessages[message.id]
                                    ? message.text
                                    : typingMessages[message.id]?.displayedText || ""}
                                  {!message.isTypingComplete && typingMessages[message.id] && !typingMessages[message.id].isComplete && (
                                    <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse">|</span>
                                  )}
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap">
                                  {message.isTypingComplete || !typingMessages[message.id]
                                    ? message.text
                                    : typingMessages[message.id]?.displayedText || ""}
                                  {!message.isTypingComplete && typingMessages[message.id] && !typingMessages[message.id].isComplete && (
                                    <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse">|</span>
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {message.timestamp && (
                            <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              {formatTime(message.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <>
                      <div className={`w-full ${isDark ? "hover:bg-white/2" : "hover:bg-gray-50/50"} transition-colors`}>
                        <div className="max-w-3xl mx-auto py-6 px-6 flex gap-4">
                          <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/20">
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="relative flex-1 overflow-hidden flex items-center">
                            <div className="flex items-center gap-3">
                              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loria is thinking...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Show chart loading skeleton while generating */}
                      <div className="w-full">
                        <div className="max-w-3xl mx-auto px-6">
                          <ChartLoadingSkeleton isDark={isDark} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className={`sticky bottom-0 w-full pt-6 pb-6 px-6 bg-gradient-to-t ${isDark ? "from-[#171717] via-[#171717]/98 to-transparent" : "from-white via-white/98 to-transparent"} border-t ${isDark ? "border-white/5" : "border-gray-200"}`}>
            <div className="max-w-3xl mx-auto w-full">
              <div className={`relative flex items-end w-full p-4 rounded-2xl border-2 shadow-xl transition-all ${
                isDark 
                  ? "bg-[#262626] border-gray-700/50 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20" 
                  : "bg-white border-gray-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100"
              }`}>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message Loria..."
                  className={`w-full max-h-[200px] py-2 pl-3 pr-12 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none custom-scrollbar text-base ${
                    isDark 
                      ? "text-white placeholder-gray-500" 
                      : "text-gray-900 placeholder-gray-400"
                  }`}
                  rows={1}
                  style={{ minHeight: '48px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-200 ${
                    inputValue.trim() && !isLoading
                      ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/40"
                      : isDark 
                        ? "bg-gray-700/50 text-gray-600 cursor-not-allowed" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">
                Loria can make mistakes. Consider checking important information.
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
              Loria AI
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
                  {/* Render chart if analytics_visual intent */}
                  {message.chartData && message.chartData.intent === "analytics_visual" && (
                    <div className="mb-3">
                      <AnalyticsChart chartData={message.chartData} isDark={isDark} />
                    </div>
                  )}
                  
                  {/* Render text content if present */}
                  {message.text && (
                    <>
                      {message.isList ? (
                        <div className="text-sm leading-relaxed whitespace-pre-line">
                          {message.isTypingComplete || !typingMessages[message.id]
                            ? message.text
                            : typingMessages[message.id]?.displayedText || ""}
                          {!message.isTypingComplete && typingMessages[message.id] && !typingMessages[message.id].isComplete && (
                            <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse">|</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.isTypingComplete || !typingMessages[message.id]
                            ? message.text
                            : typingMessages[message.id]?.displayedText || ""}
                          {!message.isTypingComplete && typingMessages[message.id] && !typingMessages[message.id].isComplete && (
                            <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse">|</span>
                          )}
                        </p>
                      )}
                    </>
                  )}
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
            {isLoading && (
              <div className={`flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div
                  className={`max-w-[80%] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3 shadow-lg ${
                    isDark
                      ? "bg-[#262626] text-gray-100 border border-gray-700/50"
                      : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loria is thinking...</span>
                  </div>
                </div>
              </div>
            )}
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
                disabled={!inputValue.trim() || isLoading}
                className={`p-3 rounded-xl transition-all duration-200 ${inputValue.trim() && !isLoading
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? "#4b5563" : "#cbd5e1"};
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "#6b7280" : "#94a3b8"};
        }
      `}</style>
    </div>
  );
}

