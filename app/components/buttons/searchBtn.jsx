"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "../../context/themeContext";
import { useRouter } from "next/navigation";

const menuItems = [
    {
        label: "Dashboard",
        path: "/dashboard",
    },
    {
        label: "Leads",
        path: "/leads",
    },
    {
        label: "Prospects",
        path: "/prospects",
    },
    {
        label: "Tasks",
        path: "/tasks",
    },
    {
        label: "Appointments",
        path: "/appointments",
    },
    {
        label: "Proposals",
        path: "/proposals",
    },
];

export default function SearchBtn() {
    const { theme } = useTheme();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filter menu items based on search query
    const filteredMenuItems = useMemo(() => {
        if (!searchQuery.trim()) return [];
        
        const query = searchQuery.toLowerCase().trim();
        return menuItems.filter((item) =>
            item.label.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Handle menu item click
    const handleMenuItemClick = (path) => {
        setSearchQuery("");
        setIsFocused(false);
        router.push(path);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setSearchQuery("");
            setIsFocused(false);
            searchRef.current?.blur();
        } else if (e.key === "Enter" && filteredMenuItems.length > 0) {
            handleMenuItemClick(filteredMenuItems[0].path);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                searchRef.current &&
                !searchRef.current.contains(event.target)
            ) {
                setIsFocused(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full">
            <div
                className={`flex px-4 py-2 rounded-full items-center gap-3 ${theme === "dark"
                    ? "bg-[#262626] border border-gray-700 text-white"
                    : "bg-gray-50 border border-gray-200 text-gray-700"
                    } ${isFocused ? "ring-2 ring-orange-500 ring-opacity-50" : ""}`}
            >
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
                    ref={searchRef}
                    type="text"
                    placeholder="Search menus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 bg-transparent outline-none min-w-0 ${theme === "dark" ? "placeholder-gray-500" : "placeholder-gray-400"
                        }`}
                />

                {/* Clear Button */}
                {searchQuery && (
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            searchRef.current?.focus();
                        }}
                        className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
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
                )}
            </div>

            {/* Search Results Dropdown */}
            {isFocused && filteredMenuItems.length > 0 && (
                <div
                    ref={dropdownRef}
                    className={`absolute top-full mt-2 w-full rounded-lg shadow-lg py-2 z-50 max-h-64 overflow-y-auto ${
                        theme === "dark"
                            ? "bg-[#262626] border border-gray-700"
                            : "bg-white border border-gray-200"
                    }`}
                >
                    {filteredMenuItems.map((item, index) => (
                        <button
                            key={item.path}
                            onClick={() => handleMenuItemClick(item.path)}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                theme === "dark"
                                    ? "text-gray-300 hover:bg-gray-800"
                                    : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-4 h-4 text-gray-500"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                    />
                                </svg>
                                <span>{item.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results Message */}
            {isFocused && searchQuery.trim() && filteredMenuItems.length === 0 && (
                <div
                    ref={dropdownRef}
                    className={`absolute top-full mt-2 w-full rounded-lg shadow-lg py-4 px-4 z-50 ${
                        theme === "dark"
                            ? "bg-[#262626] border border-gray-700"
                            : "bg-white border border-gray-200"
                    }`}
                >
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        No menu items found
                    </p>
                </div>
            )}
        </div>
    );
}