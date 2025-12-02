"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from "../../context/themeContext";
import { useSidebar } from "../../context/sidebarContext";

const TooltipIcon = ({ label, className = "", children, onClick }) => (
    <div
        className={`relative group ${className}`}
        aria-label={label}
        data-tooltip={label}
        onClick={onClick}
    >
        {children}
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 min-w-[4rem] -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 z-50">
            {label}
        </span>
    </div>
);

export default function Sidebar2() {
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const router = useRouter();
    const pathname = usePathname();
    const { theme } = useTheme();

    const menuItems = [
        {
            label: "Dashboard",
            path: "/dashboard",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                    <path d="M9.75 3H5.75C5.05222 3 4.70333 3 4.41943 3.08612C3.78023 3.28002 3.28002 3.78023 3.08612 4.41943C3 4.70333 3 5.05222 3 5.75C3 6.44778 3 6.79667 3.08612 7.08057C3.28002 7.71977 3.78023 8.21998 4.41943 8.41388C4.70333 8.5 5.05222 8.5 5.75 8.5H9.75C10.4478 8.5 10.7967 8.5 11.0806 8.41388C11.7198 8.21998 12.22 7.71977 12.4139 7.08057C12.5 6.79667 12.5 6.44778 12.5 5.75C12.5 5.05222 12.5 4.70333 12.4139 4.41943C12.22 3.78023 11.7198 3.28002 11.0806 3.08612C10.7967 3 10.4478 3 9.75 3Z" />
                    <path d="M21 9.75V5.75C21 5.05222 21 4.70333 20.9139 4.41943C20.72 3.78023 20.2198 3.28002 19.5806 3.08612C19.2967 3 18.9478 3 18.25 3C17.5522 3 17.2033 3 16.9194 3.08612C16.2802 3.28002 15.78 3.78023 15.5861 4.41943C15.5 4.70333 15.5 5.05222 15.5 5.75V9.75C15.5 10.4478 15.5 10.7967 15.5861 11.0806C15.78 11.7198 16.2802 12.22 16.9194 12.4139C17.2033 12.5 17.5522 12.5 18.25 12.5C18.9478 12.5 19.2967 12.5 19.5806 12.4139C20.2198 12.22 20.72 11.7198 20.9139 11.0806C21 10.7967 21 10.4478 21 9.75Z" />
                    <path d="M16.9194 20.9139C17.2033 21 17.5522 21 18.25 21C18.9478 21 19.2967 21 19.5806 20.9139C20.2198 20.72 20.72 20.2198 20.9139 19.5806C21 19.2967 21 18.9478 21 18.25C21 17.5522 21 17.2033 20.9139 16.9194C20.72 16.2802 20.2198 15.78 19.5806 15.5861C19.2967 15.5 18.9478 15.5 18.25 15.5C17.5522 15.5 17.2033 15.5 16.9194 15.5861C16.2802 15.78 15.78 16.2802 15.5861 16.9194C15.5 17.2033 15.5 17.5522 15.5 18.25C15.5 18.9478 15.5 19.2967 15.5861 19.5806C15.78 20.2198 16.2802 20.72 16.9194 20.9139Z" />
                    <path d="M8.5 11.5H7C5.11438 11.5 4.17157 11.5 3.58579 12.0858C3 12.6716 3 13.6144 3 15.5V17C3 18.8856 3 19.8284 3.58579 20.4142C4.17157 21 5.11438 21 7 21H8.5C10.3856 21 11.3284 21 11.9142 20.4142C12.5 19.8284 12.5 18.8856 12.5 17V15.5C12.5 13.6144 12.5 12.6716 11.9142 12.0858C11.3284 11.5 10.3856 11.5 8.5 11.5Z" />
                </svg>
            ),
        },
        {
            label: "Leads",
            path: "/leads",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    color="currentColor"
                    fill="none"
                >
                    <path
                        d="M11.5 5C14.3284 5 15.7426 5 16.6213 5.87868C17.5 6.75736 17.5 8.17157 17.5 11C17.5 19 21.5 19 21.5 19H7.23863C6.91067 19 6.74668 19 6.37485 18.9032C6.00302 18.8063 5.94387 18.7733 5.82558 18.7072C4.6855 18.0702 2.5 16.1742 2.5 11C2.5 8.17157 2.5 6.75736 3.37868 5.87868C4.25736 5 5.67157 5 8.5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M2.5 10V16C2.5 18.8284 2.5 20.2426 3.37868 21.1213C4.25736 22 5.67157 22 8.5 22H11.5761C14.4045 22 15.8188 22 16.6974 21.1213C17.1873 20.6314 17.4041 19.9751 17.5 19"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M11.5 3.5V6.5C11.5 6.96594 11.5 7.19891 11.4239 7.38268C11.3224 7.62771 11.1277 7.82239 10.8827 7.92388C10.6989 8 10.4659 8 10 8C9.53406 8 9.30109 8 9.11732 7.92388C8.87229 7.82239 8.67761 7.62771 8.57612 7.38268C8.5 7.19891 8.5 6.96594 8.5 6.5V3.5C8.5 3.03406 8.5 2.80109 8.57612 2.61732C8.67761 2.37229 8.87229 2.17761 9.11732 2.07612C9.30109 2 9.53406 2 10 2C10.4659 2 10.6989 2 10.8827 2.07612C11.1277 2.17761 11.3224 2.37229 11.4239 2.61732C11.5 2.80109 11.5 3.03406 11.5 3.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            label: "Prospects",
            path: "/prospects",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    color="currentColor"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                >
                    <path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3" />
                    <path d="M7.99707 16.999C11.5286 16.999 18.9122 15.5348 18.6979 6.43269M16.4886 8.04302L18.3721 6.14612C18.5656 5.95127 18.8798 5.94981 19.0751 6.14286L20.9971 8.04302" />
                </svg>
            ),
        },
        {
            label: "Tasks",
            path: "/tasks",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    color="currentColor"
                    fill="none"
                >
                    <path
                        d="M13.498 2H8.49805C7.66962 2 6.99805 2.67157 6.99805 3.5C6.99805 4.32843 7.66962 5 8.49805 5H13.498C14.3265 5 14.998 4.32843 14.998 3.5C14.998 2.67157 14.3265 2 13.498 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M6.99805 15H10.4266M6.99805 11H14.998"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M18.9981 13.5V9.48263C18.9981 6.65424 18.9981 5.24004 18.1194 4.36137C17.4781 3.72007 16.5515 3.54681 14.9981 3.5M11.998 21.9995L8.99805 21.9995C6.16963 21.9995 4.75541 21.9995 3.87674 21.1208C2.99806 20.2421 2.99805 18.8279 2.99805 15.9995L2.99806 9.48269C2.99805 6.65425 2.99805 5.24004 3.87673 4.36136C4.51802 3.72007 5.44456 3.54681 6.99795 3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M13.998 20C13.998 20 14.998 20 15.998 22C15.998 22 18.1745 17 20.998 16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            label: "Appointments",
            path: "/appointments",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    color="currentColor"
                    fill="none"
                >
                    <path
                        d="M16 2V6M8 2V6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M21 13V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M15 17.5C15.4915 16.9943 16.7998 15 17.5 15C18.2002 15 19.5085 16.9943 20 17.5M17.5 15.5L17.5 22"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M3 10H21"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            label: "Proposals",
            path: "/proposals",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    color="currentColor"
                    fill="none"
                >
                    <path
                        d="M14.9805 7.01556C14.9805 7.01556 15.4805 7.51556 15.9805 8.51556C15.9805 8.51556 17.5687 6.01556 18.9805 5.51556"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M9.99491 2.02134C7.49644 1.91556 5.56618 2.20338 5.56618 2.20338C4.34733 2.29053 2.01152 2.97385 2.01154 6.96454C2.01156 10.9213 1.9857 15.7993 2.01154 17.7439C2.01154 18.932 2.74716 21.7033 5.29332 21.8518C8.38816 22.0324 13.9628 22.0708 16.5205 21.8518C17.2052 21.8132 19.4847 21.2757 19.7732 18.7956C20.0721 16.2263 20.0126 14.4407 20.0126 14.0157"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M21.9999 7.01556C21.9999 9.77698 19.7592 12.0156 16.9951 12.0156C14.231 12.0156 11.9903 9.77698 11.9903 7.01556C11.9903 4.25414 14.231 2.01556 16.9951 2.01556C19.7592 2.01556 21.9999 4.25414 21.9999 7.01556Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M6.98053 13.0156H10.9805"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <path
                        d="M6.98053 17.0156H14.9805"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            ),
        },
    ];

    const handleMenuClick = (path) => {
        router.push(path);
    };

    const isActive = (path) => {
        if (path === "/dashboard") {
            return pathname === "/" || pathname === "/dashboard";
        }
        return pathname.startsWith(path);
    };

    return (
        <div
            className={`fixed left-0 top-0 h-full transition-all duration-300  ${isCollapsed ? "w-20" : "w-56"
                } ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"} border-r ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                } flex flex-col z-40`}
        >

            {/* Logo Section */}
            <div
                className={`flex items-center border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                    } p-3 relative overflow-hidden`}
            >
                {/* Full Logo (shown when expanded) */}
                <Image
                    src="/codeace-logo-full.png"
                    alt="CodeAce Full Logo"
                    width={120}
                    height={60}
                    className={`
      absolute left-3  transition-all duration-500 
      ${isCollapsed ? "opacity-0 scale-90" : "opacity-100 scale-100"}
    `}
                    priority
                />

                {/* Small Logo (shown when collapsed) */}
                <Image
                    src="/codeace-logo.png"
                    alt="CodeAce Small Logo"
                    width={40}
                    height={40}
                    className={`
      absolute left-3 transition-all duration-500  ml-2
      ${isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-90"}
    `}
                    priority
                />

                {/* Spacer to preserve height */}
                <div className="h-[60px]"></div>
            </div>



            {/* Menu Items */}
            <nav className="flex-1  py-4 pt-5 px-3 flex flex-col">
                <div className="space-y-5 flex-1">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <div key={item.path}>
                                {isCollapsed ? (
                                    <TooltipIcon label={item.label}>
                                        <div>
                                            <div onClick={() => handleMenuClick(item.path)}
                                                className={`w-full h-12  rounded-lg p-1   gap-3 transition-colors flex items-center justify-center ${active
                                                    ? "bg-orange-500 text-white"
                                                    : theme === "dark"
                                                        ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                    }`}>
                                                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">{item.icon}</div>
                                            </div>
                                        </div>
                                    </TooltipIcon>
                                ) : (
                                    <div onClick={() => handleMenuClick(item.path)}
                                        className={`w-full p-3 rounded-lg  gap-3 flex items-center transition-colors ${active
                                            ? "bg-[#FF7A00] text-white"
                                            : theme === "dark"
                                                ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            }`}>
                                        <div className="flex items-center ">
                                            <div className=" flex-shrink-0">{item.icon}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium">{item.label}</span>
                                        </div>
                                    </div>

                                )}
                            </div>
                        );
                    })}
                </div>


                {/* Collapse Button in Menu Section */}
                <div className={`mt-auto pt-4 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                    }`}>
                    {isCollapsed ? (
                        <TooltipIcon label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className={`w-full p-3 rounded-lg flex items-center justify-center transition-colors ${theme === "dark"
                                    ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="20"
                                    height="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""
                                        }`}
                                >
                                    {isCollapsed ? (
                                        <path d="M9 18l6-6-6-6" />
                                    ) : (
                                        <path d="M15 18l-6-6 6-6" />
                                    )}
                                </svg>
                            </button>
                        </TooltipIcon>
                    ) : (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${theme === "dark"
                                ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""
                                    }`}
                            >
                                {isCollapsed ? (
                                    <path d="M9 18l6-6-6-6" />
                                ) : (
                                    <path d="M15 18l-6-6 6-6" />
                                )}
                            </svg>
                            <span className="font-medium">
                                {isCollapsed ? "Expand" : "Collapse"}
                            </span>
                        </button>
                    )}
                </div>
            </nav>
        </div>
    );
}

