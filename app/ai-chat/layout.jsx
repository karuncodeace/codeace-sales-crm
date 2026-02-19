export const metadata = {
  title: "AI Chat • CodeAce",
  description: "AI chat interface",
};

export default function ChatLayout({ children }) {
  // Render a full-viewport overlay to fully isolate /ai-chat visually from parent layouts.
  // This avoids the sidebar/topbar chrome being visible while keeping providers intact.
  return (
    <div className="fixed inset-0 z-[9999]  flex items-center justify-center p-0">
      <div className="w-full h-full ">{children}</div>
    </div>
  );
}

