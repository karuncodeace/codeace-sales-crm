"use client"
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";
import Image from "next/image";

// Fallback data for immediate display
const fallbackCardsData = {
  leadsGenerated: 0,
  firstCallDone: 0,
  qualifiedLeads: 0,
  meetingScheduled: 0,
  meetingConducted: 0,
  followUpCalls: 0,
  proposalsSent: 0,
  conversionRate: 0
};

export default function Cards() {
  const { theme } = useTheme();

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackCardsData, error, isValidating } = useSWR(
    "/api/dashboard/cards",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: fallbackCardsData, // Show this immediately while fetching
    }
  );
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mt-5 ">
        <div className={`relative rounded-xl  overflow-hidden h-[100px] ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          {/* Left background image - full height, 90% width */}
          <div className="bg-gradient-to-r from-[#ffffff] to-[#cfd8ff]/50  h-full w-full p-3 z-0 absolute  ">
            
          </div>

          {/* Content */}
          <div className="relative z-20 pr-[15px] pt-[15px] flex flex-col items-end  ">
            <div>
              <h3 className={`text-[18px] font-bold ${theme === "dark" ? "text-gray-300" : "text-black"}`}>
                Leads Generated
              </h3>
            </div>
            <div className="mt-2">
              <p className="text-[28px] font-bold text-[#1f48ff] ">
                {error ? "N/A" : data?.leadsGenerated ?? 0}
              </p>
            </div>
          </div>

          {/* Icon in bottom left */}
          <div className="absolute bottom-[-16px] left-[-7px] z-20 ">
            <Image
              src="/leads-generated.svg"
              alt="Leads Generated Icon"
              width={110}
              height={100}
              className="object-contain"
            />
          </div>
        </div>
        

      </div>
    </>
  )
}
