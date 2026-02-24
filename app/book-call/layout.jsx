 export default function BookCallLayout({ children }) {
   // Minimal layout for public booking page — no sidebar/header
   return <div className="min-h-screen bg-gray-50 dark:bg-black">{children}</div>;
 }

