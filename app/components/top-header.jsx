"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
export default function Header() {
 
    const TooltipIcon = ({ label, className = "", children }) => (
        <div
          className={`relative group ${className}`}
          aria-label={label}
          data-tooltip={label}
        >
          {children}
          <span className="pointer-events-none absolute top-10  min-w-[4rem] -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            {label}
          </span>
        </div>
      );
  return (
    <div className={`w-full transition-colors duration-300 bg-transparent `}>
      <div className="max-w-[1900px] mx-auto flex justify-between items-center pt-6 pb-2 px-6 ">
        {/* Brand Logo and Name */}
        <div className="bg-white px-4 py-4 rounded-full flex items-center gap-3">
          <div className="">
            <Image src="/Codeace logo.png" alt="logo" width={40} height={40} />
          </div>
          <span className="text-gray-800 font-semibold text-lg">CodeAce</span>
        </div>
        {/* Search Bar */}
        <div className="bg-white px-4 py-4 rounded-full flex items-center gap-3 flex-1 max-w-2xl  border border-gray-200">
          {/* Search Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-500"
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
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />

          {/* Clear Button (Optional) */}
          <button className="text-gray-400 hover:text-gray-600">
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

        <div className="flex items-center gap-5">
        <div className="bg-white px-4 py-3 rounded-full flex items-center gap-5">
        <TooltipIcon label="Light Mode" className="bg-yellow-100/70 p-2 rounded-full text-yellow-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            color="currentColor"
            fill="none"
          >
            <path
              d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
              stroke="currentColor"
              strokeWidth="1.5"
            ></path>
            <path
              d="M11.9955 3H12.0045M11.9961 21H12.0051M18.3588 5.63599H18.3678M5.63409 18.364H5.64307M5.63409 5.63647H5.64307M18.3582 18.3645H18.3672M20.991 12.0006H21M3 12.0006H3.00898"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
        </TooltipIcon>
        <TooltipIcon label="Dark Mode" className="">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            color="currentColor"
            fill="none"
          >
            <path
              d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
        </TooltipIcon>
        </div>
      
          {/* Utility Icons */}
          <div className="bg-white px-4 py-4 rounded-full flex items-center gap-5">
            {/* Notifications Icon with Red Dot */}
            <button className="text-gray-600 hover:text-gray-800 transition-colors relative">
              <TooltipIcon label="Notifications" className="">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                color="currentColor"
                fill="none"
              >
                <path
                  d="M21.5 11.9961C21.5 17.2428 17.2467 21.4961 12 21.4961C10.3446 21.4961 8.78814 21.0727 7.43293 20.3283C6.87976 20.0244 6.22839 19.9176 5.62966 20.1171L3.00001 20.9937L3.87695 18.3629C4.07645 17.7644 3.96974 17.1133 3.66622 16.5603C2.92279 15.2057 2.5 13.6503 2.5 11.9961C2.5 6.74939 6.75329 2.49609 12 2.49609"
                  stroke="#141B34"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.0001 9.49609C19.9331 9.49609 21.5001 7.92909 21.5001 5.99609C21.5001 4.06309 19.9331 2.49609 18.0001 2.49609C16.0671 2.49609 14.5001 4.06309 14.5001 5.99609C14.5001 7.92909 16.0671 9.49609 18.0001 9.49609Z"
                  stroke="#141B34"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              </TooltipIcon>
            </button>

            {/* Info Icon */}
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
            <TooltipIcon label="Help c" className="">
            <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
          <div className="bg-white px-4 py-2 rounded-full flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-white font-semibold overflow-hidden">
              <Image src="/profile avator.png" alt="logo" width={40} height={40} />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-800 font-medium text-sm">
                John Doe
              </span>
              <span className="text-gray-500 text-xs">
                john.doe@example.com
              </span>
            </div>
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
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
    </div>
  );
}
