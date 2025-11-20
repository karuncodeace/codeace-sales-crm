import { Manrope, Geist_Mono ,DynaPuff ,Inter } from "next/font/google";
import { Poppins } from "next/font/google";
import "./globals.css";
import TopHeader from "./components/top-header";
import Sidebar from "./components/sidebar";
import Header from "./components/header";
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const dynaPuff = DynaPuff({
  variable: "--font-dyna-puff",
  subsets: ["latin"],
});


export const metadata = {
  title: "Sales CRM | CodeAce",
  description: "Takeover the sales with Sales CRM",
};

export default function RootLayout({ children, currentPage }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body
        className={`${manrope.variable} ${geistMono.variable} ${dynaPuff.variable}  antialiased`}
        suppressHydrationWarning
      >
        <div className="flex flex-col h-screen">
          <TopHeader className="" />
          
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
             
              {children}
           
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
