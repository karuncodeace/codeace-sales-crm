import "./globals.css";
import { Manrope, Geist_Mono, DynaPuff } from "next/font/google";
import LayoutClient from "./layout-client";

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

export default function RootLayout({ children }) {
  return (
    <LayoutClient
      fonts={{ manrope, geistMono, dynaPuff }}
    >
      {children}
    </LayoutClient>
  );
}
