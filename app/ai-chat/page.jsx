"use client";

import dynamic from "next/dynamic";
import "@crayonai/react-ui/styles/index.css";
import { ThemeProvider, themePresets } from "@crayonai/react-ui";

const C1Chat = dynamic(
  () => import("@thesysai/genui-sdk").then((m) => m.C1Chat),
  { ssr: false }
);

export default function AiChatPage() {
  return (
    <ThemeProvider {...themePresets.candy} mode="light">
      <C1Chat
        apiUrl="/api/thesys"
        agentName="Loria AI Assistant"
        logoUrl="/codeace-logo.png"
      />
    </ThemeProvider>
  );
}
