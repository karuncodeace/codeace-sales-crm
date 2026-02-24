 "use client";
 import React, { useState, useEffect } from "react";
 import { useRouter } from "next/navigation";
 import { X, Calendar, Clock, Copy } from "lucide-react";
 import { useTheme } from "../../context/themeContext";
 import toast from "react-hot-toast";

 export default function BookingUrlButton({ lead }) {
   const router = useRouter();
   const { theme } = useTheme();
   const isDark = theme === "dark";
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedCallType, setSelectedCallType] = useState(null);

   const callTypes = [
     { id: "discovery-call", label: "Discovery Call", slug: "discovery-call" },
     { id: "demo-call", label: "Demo Call", slug: "demo-call" },
     { id: "discussion-call", label: "Discussion Call", slug: "discussion-call" },
   ];

   const openModal = () => setIsModalOpen(true);
   const closeModal = () => {
     setIsModalOpen(false);
     setSelectedCallType(null);
   };

   const handleSelect = (callType) => {
     const slug = encodeURIComponent(callType.slug || callType.id);
     const params = new URLSearchParams();
     if (lead?.name) params.set("name", lead.name);
     if (lead?.email) params.set("email", lead.email);
     if (lead?.id) params.set("lead_id", lead.id);
     if (lead?.assigned_to) params.set("salesperson_id", lead.assigned_to);
     // Build public booking URL
     const url = `${window.location.origin}/book-call?slug=${slug}&${params.toString()}`;

     // Copy to clipboard
     navigator.clipboard.writeText(url).then(
       () => toast.success("Booking URL copied to clipboard"),
       () => toast.error("Failed to copy booking URL")
     );

     // Also open in new tab
     window.open(url, "_blank", "noopener,noreferrer");
     closeModal();
   };

   return (
     <>
       <button
         onClick={openModal}
         className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
           isDark
             ? "bg-gray-800 text-gray-200 hover:bg-orange-600 hover:text-white"
             : "bg-gray-50 text-gray-900 hover:bg-orange-600 hover:text-white border border-gray-200 hover:border-orange-600"
         }`}
       >
         <Copy className="w-4 h-4" />
         <span>Booking URL</span>
       </button>

       {isModalOpen && (
         <div
           className="fixed inset-0 z-50 flex items-center justify-center p-4"
           onClick={(e) => {
             if (e.target === e.currentTarget) closeModal();
           }}
         >
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
           <div className={`relative w-full max-w-md rounded-2xl shadow-2xl transform transition-all ${isDark ? "bg-[#1f1f1f] border border-gray-700" : "bg-white border border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
             <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${isDark ? "bg-orange-500/20" : "bg-orange-100"}`}>
                   <Calendar className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                 </div>
                 <div>
                   <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Generate Booking URL</h2>
                   <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Select call type — lead details will be prefilled in the link.</p>
                 </div>
               </div>
               <button onClick={closeModal} className="p-2 rounded-lg">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="p-6 space-y-3">
               {callTypes.map((ct) => (
                 <button key={ct.id} onClick={() => handleSelect(ct)} className={`w-full p-4 rounded-xl border-2 text-left ${isDark ? "border-gray-700 hover:border-orange-500/50 bg-gray-800" : "border-gray-200 hover:border-orange-500 bg-gray-50"}`}>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${isDark ? "bg-orange-900/40" : "bg-orange-100"}`}>
                         <Clock className={`w-5 h-5 ${isDark ? "text-orange-400" : "text-orange-600"}`} />
                       </div>
                       <div>
                         <h3 className={`${isDark ? "text-white" : "text-gray-900"} font-semibold`}>{ct.label}</h3>
                       </div>
                     </div>
                     <Copy className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                   </div>
                 </button>
               ))}
             </div>
           </div>
         </div>
       )}
     </>
   );
 }

