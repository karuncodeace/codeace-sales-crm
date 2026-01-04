"use client"
import { useEffect } from "react";
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

export default function Cards({ filterData }) {
  const { theme } = useTheme();

  // Build API URL with filter parameters
  // If filterData is null, use default (last 7 days) - no query params needed
  const apiUrl = filterData && filterData.startDate && filterData.endDate
    ? `/api/dashboard/cards?startDate=${encodeURIComponent(filterData.startDate)}&endDate=${encodeURIComponent(filterData.endDate)}`
    : "/api/dashboard/cards";

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackCardsData, error } = useSWR(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: true, // Refresh when user focuses the tab
      revalidateOnReconnect: true, // Refresh when connection is restored
      refreshInterval: 10000, // Refresh every 10 seconds for real-time updates
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
      fallbackData: fallbackCardsData, // Show this immediately while fetching
    }
  );

  const cardBase =
    "relative overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-all";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 py-4 sm:py-5 lg:py-2 xl:py-6">
        {/* Leads Generated Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-blue-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-blue-500/10 text-blue-400"
              : "bg-blue-100 text-blue-600"
              }`}
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Leads Generated
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.leadsGenerated ?? 0}
            </p>
          </div>
        </div>

        {/* First Call Done Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-green-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-green-500/10 text-green-400"
              : "bg-green-100 text-green-600"
              }`}
          >
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3
                className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
              >
                First Call Done
              </h3>
            </div>

            <p
              className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"
                }`}
            >
              {error ? "N/A" : data?.firstCallDone ?? 0}
            </p>
          </div>
        </div>


        {/* Qualified Leads Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-purple-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-purple-500/10 text-purple-400"
              : "bg-purple-100 text-purple-600"
              }`}
          >
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Qualified Leads
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.qualifiedLeads ?? 0}
            </p>
          </div>
        </div>

        {/* Meeting Scheduled Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-orange-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-orange-500/10 text-orange-400"
              : "bg-orange-100 text-orange-600"
              }`}
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Meeting Scheduled
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.meetingScheduled ?? 0}
            </p>
          </div>
        </div>

        {/* Meeting Conducted Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-indigo-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-indigo-500/10 text-indigo-400"
              : "bg-indigo-100 text-indigo-600"
              }`}
          >
            <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Meeting Conducted
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.meetingConducted ?? 0}
            </p>
          </div>
        </div>

        {/* Follow Up Calls Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-teal-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-teal-500/10 text-teal-400"
              : "bg-teal-100 text-teal-600"
              }`}
          >
            <PhoneForwarded className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Follow Up Calls
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.followUpCalls ?? 0}
            </p>
          </div>
        </div>

        {/* Proposals Sent Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-pink-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-pink-500/10 text-pink-400"
              : "bg-pink-100 text-pink-600"
              }`}
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Proposals Sent
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : data?.proposalsSent ?? 0}
            </p>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div
          className={`${cardBase} 
  h-30 xl:h-32
  p-3 sm:p-4 xl:p-5
  ${theme === "dark"
              ? "bg-[#262626] border border-gray-700"
              : "bg-white border border-gray-200"
            }
  shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 bg-emerald-500/10 rounded-full -mr-12 sm:-mr-14 xl:-mr-16 -mt-12 sm:-mt-14 xl:-mt-16" />

          <div
            className={`absolute top-4 sm:top-4 xl:top-5 right-3 sm:right-4 xl:right-7 p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl ${theme === "dark"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-emerald-100 text-emerald-600"
              }`}
          >
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6" />
          </div>

          <div className="relative h-full flex flex-col gap-5">
            <div>
              <h3 className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Conversion Rate
              </h3>
            </div>
            <p className={`text-2xl sm:text-3xl xl:text-4xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {error ? "N/A" : `${data?.conversionRate ?? 0}%`}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
