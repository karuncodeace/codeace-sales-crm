"use client";

import { usePathname } from "next/navigation";
import TopHeader from "./components/top-bar";
import Sidebar from "./components/sidebar";
import { ThemeProvider, useTheme } from "./context/themeContext";

function LayoutStructure({ children, fonts }) {
  const { theme } = useTheme();
  const { manrope, geistMono, dynaPuff } = fonts;
  const pathname = usePathname();
  
  const isLoginPage = pathname === "/login";

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
