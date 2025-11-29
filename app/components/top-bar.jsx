"use client";
import Image from "next/image";
import Tooglebtn from "./tooglebtn";
import { useState, useEffect } from "react";
import {useTheme} from "../context/themeContext"
import { supabaseBrowser } from "../../lib/supabase/browserClient";


export default function Header() {
    const {theme} = useTheme()
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [user, setUser] = useState(null);

    useEffect(() => {
      const getUser = async () => {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();
    
        setUser(user);
      };
    
      getUser();
    }, []);

    const TooltipIcon = ({ label, className = "", children }) => (
        <div
          className={`relative group ${className}`}
          aria-label={label}
          data-tooltip={label}
        >
          {children}
          <span className="pointer-events-none absolute top-10 min-w-[4rem] -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 hidden sm:block">
            {label}
          </span>
        </div>
      );

  return (
    <div className={`w-full transition-colors duration-300 bg-transparent`}>
      <div className="max-w-[1900px] mx-auto flex justify-between items-center pt-4 md:pt-6 pb-2 px-3 sm:px-4 md:px-3 gap-2 sm:gap-3 md:gap-3 ">
        {/* Brand Logo and Name */}
        <div className="bg-white px-3 py-3 md:px-4 md:py-2 rounded-full flex items-center gap-2 md:gap-3 shrink-0">
          <div>
            <Image src="/codeace-logo.png" alt="logo" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <span className="text-gray-800 font-semibold text-base md:text-lg hidden sm:block">CodeAce</span>
        </div>

        {/* Mobile Search Toggle Button */}
        <button 
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className={`lg:hidden p-3 rounded-full transition-colors shrink-0
            ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-400" : "bg-white border border-gray-200 text-gray-600"}
          `}
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
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
            />
          </svg>
        </button>

        {/* Search Bar - Hidden on mobile, shown on lg+ */}
        <div className={`hidden lg:flex px-4 py-3 xl:py-3 rounded-full items-center gap-3 flex-1 max-w-2xl mx-4
          ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-white" 
            : "bg-white border border-gray-200 text-gray-700"
          }
        `}>
          {/* Search Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-500 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
            />
          </svg>

          {/* Input */}
          <input
            type="text"
            placeholder="Search leads, contacts, deals..."
            className={`flex-1 bg-transparent outline-none min-w-0
              ${theme === "dark" ? "placeholder-gray-500" : "placeholder-gray-400"}
            `}
          />

          {/* Clear Button */}
          <button className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <Tooglebtn/>
          </div>

          {/* Utility Icons */}
          <div className={`px-3 py-3 md:px-4 md:py-3  xl:py-3 rounded-full flex items-center gap-3 md:gap-5 md:px-3 
            ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
            {/* Notifications Icon */}
            <button className={`transition-colors relative
              ${theme === "dark" ? "text-gray-400" : "text-gray-600 hover:text-gray-800"}`}>
              <TooltipIcon label="Notifications">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  color="currentColor"
                  fill="none"
                  className="w-5 h-5 md:w-6 md:h-6"
                >
                  <path
                    d="M21.5 11.9961C21.5 17.2428 17.2467 21.4961 12 21.4961C10.3446 21.4961 8.78814 21.0727 7.43293 20.3283C6.87976 20.0244 6.22839 19.9176 5.62966 20.1171L3.00001 20.9937L3.87695 18.3629C4.07645 17.7644 3.96974 17.1133 3.66622 16.5603C2.92279 15.2057 2.5 13.6503 2.5 11.9961C2.5 6.74939 6.75329 2.49609 12 2.49609"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.0001 9.49609C19.9331 9.49609 21.5001 7.92909 21.5001 5.99609C21.5001 4.06309 19.9331 2.49609 18.0001 2.49609C16.0671 2.49609 14.5001 4.06309 14.5001 5.99609C14.5001 7.92909 16.0671 9.49609 18.0001 9.49609Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </TooltipIcon>
            </button>

            {/* Info Icon - Hidden on smallest screens */}
            <button className={`hidden sm:block transition-colors
              ${theme === "dark" ? "text-gray-400" : "text-gray-600 hover:text-gray-800"}`}
            >
              <TooltipIcon label="Help">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M10 14V10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="10" cy="6" r="1" fill="currentColor" />
                </svg>
              </TooltipIcon>
            </button>
          </div>

          {/* User Profile */}
          <div className={`px-2 py-2 sm:px-3 md:px-4 md:py-1.5 xl:py-1.5 rounded-full flex items-center gap-2 md:gap-3
            ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}
          `}>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center text-white font-semibold overflow-hidden shrink-0">
              <Image src="/profile avator.png" alt="user avatar" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className={`font-medium text-sm
                ${theme === "dark" ? "text-white" : "text-gray-800"}
              `}>
                {user?.user_metadata?.full_name}
              </span>
              <span className={`text-xs hidden lg:block
                ${theme === "dark" ? "text-gray-300" : "text-gray-400"}
              `}>
                {user?.email}
              </span>
            </div>
            <button className={`hidden sm:block transition-colors
              ${theme === "dark" ? "text-gray-400" : "text-gray-600 hover:text-gray-800"}
            `}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Expandable */}
      {isSearchOpen && (
        <div className={`lg:hidden mx-3 sm:mx-4 md:mx-6 mb-2 px-4 py-3 rounded-full flex items-center gap-3 animate-in slide-in-from-top-2 duration-200
          ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-white" 
            : "bg-white border border-gray-200 text-gray-700"
          }
        `}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-500 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search leads, contacts, deals..."
            className={`flex-1 bg-transparent outline-none min-w-0
              ${theme === "dark" ? "placeholder-gray-500" : "placeholder-gray-400"}
            `}
            autoFocus
          />
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
