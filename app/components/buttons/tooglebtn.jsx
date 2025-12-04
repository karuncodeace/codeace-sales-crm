"use client";

import { useTheme } from "../../context/themeContext"

export default function ToggleBtn() {
  const { theme, toggleTheme } = useTheme();

  const TooltipIcon = ({ label, className = "", children, onClick }) => (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute top-10 min-w-[4rem] -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className={`px-4 py-3 rounded-full flex items-center gap-2 transition-all md:px-3 md:py-1.5 xl:py-1.5
      ${theme === "light" ? "bg-white border border-gray-200 " : "bg-[#262626] border border-gray-700"}
    `}
    >
      {/* Light Mode Button */}
      <TooltipIcon
        label="Light Mode"
        onClick={() => theme !== "light" && toggleTheme()}
        className={`p-2 rounded-full transition-all
          ${theme === "light" ? "bg-yellow-100/70 text-yellow-600" : "text-gray-400"}
        `}
      >
        {/* Light Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          color="currentColor"
          fill="none"
        >
          <path
            d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12 3V3.01M12 21V21.01M18.36 5.64L18.37 5.65M5.64 18.36L5.65 18.37M5.64 5.64L5.65 5.65M18.36 18.36L18.37 18.37M21 12H21.01M3 12H3.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </TooltipIcon>

      {/* Dark Mode Button */}
      <TooltipIcon
        label="Dark Mode"
        onClick={() => theme !== "dark" && toggleTheme()}
        className={`p-2 rounded-full transition-all
          ${theme === "dark" ? "bg-gray-100/10 text-white" : "text-gray-500"}
        `}
      >
        {/* Dark Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          color="currentColor"
          fill="none"
        >
          <path
            d="M21.5 14.08C20.3 14.72 18.93 15.08 17.47 15.08C12.75 15.08 8.92 11.25 8.92 6.52C8.92 5.07 9.28 3.7 9.92 2.5C5.67 3.5 2.5 7.32 2.5 11.87C2.5 17.19 6.81 21.5 12.13 21.5C16.68 21.5 20.5 18.33 21.5 14.08Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </TooltipIcon>
    </div>
  );
}
