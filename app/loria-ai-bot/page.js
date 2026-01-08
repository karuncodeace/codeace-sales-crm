import ChatBot from "../components/ui/ChatBot";
export default function LioraAI() {
    return (
        <div className="h-screen w-full bg-[#212121]">
            <ChatBot isFullPage={true} />
        </div>
    );
}