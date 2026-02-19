import "./globals.css";
import "@crayonai/react-ui/styles/index.css";
import { Manrope, Geist_Mono, DynaPuff, Instrument_Serif } from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

export const metadata = {
  title: "Sales CRM | CodeAce",
  description: "Takeover the sales with Sales CRM",
};

export default function RootLayout({ children }) {
  return (
    <LayoutClient
      fonts={{ manrope, geistMono, dynaPuff, instrumentSerif }}
    >
      {children}
    </LayoutClient>
  );
}
