"use client"
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";
import {
  Users,
  Phone,
  CheckCircle2,
  Calendar,
  CalendarCheck,
  PhoneForwarded,
  FileText,
  TrendingUp
} from "lucide-react";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6 mt-5">
        {/* Leads Generated Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Leads Generated
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                <Users className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.leadsGenerated ?? 0}
            </p>
           
          </div>
        </div>

        {/* First Call Done Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                First Call Done
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-600"}`}>
                <Phone className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.firstCallDone ?? 0}
            </p>
           
          </div>
        </div>

        {/* Qualified Leads Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Qualified Leads
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.qualifiedLeads ?? 0}
            </p>
           
          </div>
        </div>

        {/* Meeting Scheduled Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Meeting Scheduled
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-orange-500/10 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                <Calendar className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.meetingScheduled ?? 0}
            </p>
           
          </div>
        </div>

        {/* Meeting Conducted Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Meeting Conducted
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
                <CalendarCheck className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.meetingConducted ?? 0}
            </p>
           
          </div>
        </div>

        {/* Follow Up Calls Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Follow Up Calls
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-teal-500/10 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
                <PhoneForwarded className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.followUpCalls ?? 0}
            </p>
           
          </div>
        </div>

        {/* Proposals Sent Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Proposals Sent
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-pink-500/10 text-pink-400" : "bg-pink-100 text-pink-600"}`}>
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.proposalsSent ?? 0}
            </p>
           
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className={`relative overflow-hidden rounded-2xl p-4 pt-2 pb-2 ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between ">
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Conversion Rate
              </h3>
              <div className={`p-3 rounded-xl mt-2.5 mr-2 ${theme === "dark" ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : `${data?.conversionRate ?? 0}%`}
            </p>
           
          </div>
        </div>
      </div>
    </>
  )
}
