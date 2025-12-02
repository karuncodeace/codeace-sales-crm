"use client";

import Image from "next/image";
import Tooglebtn from "../buttons/tooglebtn";
import { useState, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";
import { useRouter } from "next/navigation";
import { useSidebar } from "../../context/sidebarContext";
import SearchBtn from "../buttons/searchBtn";

const TooltipIcon = ({ label, className = "", children, onClick }) => (
    <div
        className={`relative group ${className}`}
        aria-label={label}
        data-tooltip={label}
        onClick={onClick}
    >
        {children}
        <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[4rem] whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 z-50">
            {label}
        </span>
    </div>
);

export default function TopBar2() {
    const { theme } = useTheme();
    const { isCollapsed } = useSidebar();
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();

            setUser(user);
        };

        getUser();
    }, []);

    const handleLogout = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowProfileMenu(false);
        window.location.href = "/logout";
    };

    return (
        <div
            className={`fixed top-0 h-21.5 flex transition-all duration-300 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                } border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                } flex items-center justify-between px-4 z-30 `}
            style={{
                left: isCollapsed ? "80px" : "224px", // w-20 = 80px, w-64 = 256px
                right: 0,
            }}
        >
            {/* Search Bar - Left Side */}
            <div className="flex-1 max-w-md">
                <SearchBtn />
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-8 ml-4">
                {/* Dark Mode Toggle */}
                <div className="hidden sm:block">
                    <Tooglebtn />
                </div>

                {/* Profile Button */}
                <div className="relative">
                    <TooltipIcon label="Profile">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`px-3 py-2 rounded-full flex items-center gap-2 transition-colors ${theme === "dark"
                                ? "bg-[#262626] border border-gray-700 hover:bg-gray-800"
                                : "bg-white border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-white font-semibold overflow-hidden shrink-0">
                                <Image
                                    src="/profile avator.png"
                                    alt="user avatar"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="hidden md:flex flex-col items-start">
                                <span
                                    className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-800"
                                        }`}
                                >
                                    {user?.user_metadata?.full_name ||
                                        (user?.email?.split("@")[0]?.charAt(0).toUpperCase() +
                                            user?.email?.split("@")[0]?.slice(1)) ||
                                        "User"}
                                </span>
                                <span
                                    className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-400"
                                        }`}
                                >
                                    {user?.email || "user@example.com"}
                                </span>
                            </div>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={`transition-transform ${showProfileMenu ? "rotate-180" : ""
                                    } ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
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
                    </TooltipIcon>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 z-50 ${theme === "dark"
                                ? "bg-[#262626] border border-gray-700"
                                : "bg-white border border-gray-200"
                                }`}
                        >
                            <button
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    // Add profile navigation logic here if needed
                                }}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${theme === "dark"
                                    ? "text-gray-300 hover:bg-gray-800"
                                    : "text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                View Profile
                            </button>
                            <button
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    // Add settings navigation logic here if needed
                                }}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${theme === "dark"
                                    ? "text-gray-300 hover:bg-gray-800"
                                    : "text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                Settings
                            </button>
                            <div
                                className={`my-1 ${theme === "dark" ? "border-gray-700" : "border-gray-200"
                                    } border-t`}
                            />
                            <button
                                onClick={handleLogout}
                                className={`w-full px-4 py-2 text-left text-sm transition-colors ${theme === "dark"
                                    ? "text-red-400 hover:bg-gray-800"
                                    : "text-red-600 hover:bg-gray-50"
                                    }`}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>

             
            </div>

            {/* Click outside to close profile menu */}
            {showProfileMenu && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}
        </div>
    );
}

