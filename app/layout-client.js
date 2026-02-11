"use client";

import { useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import TopBar2 from "./components/ui/top-bar-2";
import Sidebar2 from "./components/ui/sidebar-2";
import SearchBtn from "./components/buttons/searchBtn";

import { ThemeProvider, useTheme } from "./context/themeContext";
import { SidebarProvider, useSidebar } from "./context/sidebarContext";
import { KeyboardShortcutsProvider } from "./context/keyboardShortcutsContext";
import { Toaster } from "react-hot-toast";
import { supabaseBrowser } from "../lib/supabase/browserClient";

function MainContent({ children }) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className="flex-1 overflow-y-auto transition-all duration-300 p-6 pt-2 pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{
        marginLeft: isCollapsed ? "80px" : "224px", // w-20 = 80px, w-64 = 256px
        marginTop: "64px", // Top bar height (h-16 = 64px)
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE and Edge
      }}
    >
      {children}
    </main>
  );
}

function LayoutStructure({ children, fonts }) {
  const { theme, mounted } = useTheme();
  const { manrope, geistMono, dynaPuff, instrumentSerif } = fonts;
  const pathname = usePathname();
  
  // Use default theme during SSR to prevent hydration mismatch
  const effectiveTheme = mounted ? theme : "light";

  const isLoginPage = pathname === "/login";
  const isLogoutPage = pathname === "/logout";
  const isAuthCallbackPage = pathname === "/auth/callback";

  // Auto-logout after 24 hours
  useEffect(() => {
    const loginTime = localStorage.getItem("login_time");
    if (!loginTime) return;

    const oneDay = 24 * 60 * 60 * 1000;

    if (Date.now() - parseInt(loginTime) > oneDay) {
      localStorage.removeItem("login_time");
      supabaseBrowser.auth.signOut();
      window.location.href = "/login";
    }
  }, []);

  return (
    <html lang="en" className={`${manrope.variable} ${effectiveTheme}`}>
      <body
        className={`${manrope.variable} ${geistMono.variable} ${dynaPuff.variable} ${instrumentSerif.variable}  ${effectiveTheme === "dark" ? "dark" : "light"} antialiased`}
        suppressHydrationWarning
      >
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: effectiveTheme === "dark" ? "#1f1f1f" : "#fff",
              color: effectiveTheme === "dark" ? "#e5e7eb" : "#111827",
              border: effectiveTheme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
        {isLoginPage || isLogoutPage || isAuthCallbackPage ? (
          children
        ) : (
          <SidebarProvider>
            <div className="flex flex-col h-screen">
              <Suspense fallback={<div className="fixed left-0 top-0 h-full w-56 bg-[#1a1a1a] border-r border-gray-800" />}>
                <Sidebar2 />
              </Suspense>
              <TopBar2 />
              <MainContent>{children}</MainContent>
            </div>
          </SidebarProvider>
        )}
      </body>
    </html>
  );
}

export default function LayoutClient({ children, fonts }) {
  return (
    <ThemeProvider>
      <KeyboardShortcutsProvider>
        <LayoutStructure fonts={fonts}>{children}</LayoutStructure>
      </KeyboardShortcutsProvider>
    </ThemeProvider>
  );
}
