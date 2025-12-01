"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TopHeader from "./components/ui/top-bar";
import Sidebar from "./components/ui/sidebar";
import { ThemeProvider, useTheme } from "./context/themeContext";
import { supabaseBrowser } from "../lib/supabase/browserClient";

function LayoutStructure({ children, fonts }) {
  const { theme } = useTheme();
  const { manrope, geistMono, dynaPuff } = fonts;
  const pathname = usePathname();
  
  const isLoginPage = pathname === "/login";

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
    <html lang="en" className={`${manrope.variable} ${theme}`}>
      <body
        className={`${manrope.variable} ${geistMono.variable} ${dynaPuff.variable}  ${theme === "dark" ? "dark" : "light"} antialiased`}
        suppressHydrationWarning
      >
        {isLoginPage ? (
          children
        ) : (
          <div className="flex flex-col h-screen ">
            <TopHeader />
            <div className="flex flex-1 overflow-hidden ">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}

export default function LayoutClient({ children, fonts }) {
  return (
    <ThemeProvider>
      <LayoutStructure fonts={fonts}>{children}</LayoutStructure>
    </ThemeProvider>
  );
}
