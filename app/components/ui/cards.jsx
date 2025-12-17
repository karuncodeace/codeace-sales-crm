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
      <div className={`relative rounded-xl  overflow-hidden ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          {/* Left background image - full height, 90% width */}
          <div className="absolute left-0 top-0 h-full w-[100%] opacity-80 z-0">
            <Image
              src="/card-bg.svg"
              alt="Card background"
              fill
              className="object-cover object-left"
            />
          </div>
          
          {/* Content */}
          <div className="relative z-20 pl-[15px] pt-[12px] flex flex-col  ">
           <div>
           <h3 className={`text-[14px] font-medium ${theme === "dark" ? "text-gray-300" : "text-black"}`}>
              Leads Generated
            </h3>
           </div>
           <div className="mt-2">
           <p className="text-[22px] font-bold text-black ">
              {error ? "N/A" : data?.leadsGenerated ?? 0}
            </p>
           </div>
          </div>
          
          {/* Icon in bottom left */}
          <div className="absolute bottom-[-10px] right-0 z-20 p-0">
            <Image
              src="/leads-generated.svg"
              alt="Leads Generated Icon"
              width={70}
              height={100}
              className="object-contain"
            />
          </div>
      </div>

        <div className={`  rounded-xl  p-4 relative  ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Leads Generated
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.leadsGenerated ?? 0}
              </p>
            </div>
            <div
              className={`p-2 sm:p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 17L8 14" />
                <path d="M12 14L12 9" />
                <path d="M16 9L16 6" />
                <path d="M20 10L20 4" />
                <path d="M3 3V14C3 17.2998 3 18.9497 4.02513 19.9749C5.05025 21 6.70017 21 10 21H21" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                First Call Done
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.firstCallDone ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7.5L15.5 10L21 4" />
                <path d="M9.15825 5.71223L8.7556 4.80625C8.49232 4.21388 8.36068 3.91768 8.1638 3.69101C7.91707 3.40694 7.59547 3.19794 7.23567 3.08785C6.94858 3 6.62446 3 5.97621 3C5.02791 3 4.55375 3 4.15573 3.18229C3.68687 3.39702 3.26343 3.86328 3.09473 4.3506C2.95151 4.76429 2.99253 5.18943 3.07458 6.0397C3.94791 15.0902 8.90981 20.0521 17.9603 20.9254C18.8106 21.0075 19.2357 21.0485 19.6494 20.9053C20.1367 20.7366 20.603 20.3131 20.8177 19.8443C21 19.4462 21 18.9721 21 18.0238C21 17.3755 21 17.0514 20.9122 16.7643C20.8021 16.4045 20.5931 16.0829 20.309 15.8362C20.0823 15.6393 19.7861 15.5077 19.1937 15.2444L18.2878 14.8417C17.6462 14.5566 17.3255 14.4141 16.9995 14.3831C16.6876 14.3534 16.3731 14.3972 16.0811 14.5109C15.776 14.6297 15.5063 14.8544 14.967 15.3038C14.4301 15.7512 14.1617 15.9749 13.8337 16.0947C13.543 16.2009 13.1586 16.2403 12.8523 16.1951C12.5069 16.1442 12.2423 16.0029 11.7133 15.7201C10.0672 14.8405 9.15953 13.9328 8.27986 12.2867C7.99714 11.7577 7.85578 11.4931 7.80487 11.1477C7.75974 10.8414 7.79908 10.457 7.9053 10.1663C8.02512 9.83828 8.24881 9.56986 8.69619 9.033C9.14562 8.49368 9.37034 8.22402 9.48915 7.91891C9.60285 7.62694 9.64661 7.3124 9.61694 7.00048C9.58594 6.67452 9.44338 6.35376 9.15825 5.71223Z" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Qualified Leads
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.qualifiedLeads ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                color="currentColor"
                fill="none"
              >
                <path
                  d="M18.9905 19H19M18.9905 19C18.3678 19.6175 17.2393 19.4637 16.4479 19.4637C15.4765 19.4637 15.0087 19.6537 14.3154 20.347C13.7251 20.9374 12.9337 22 12 22C11.0663 22 10.2749 20.9374 9.68457 20.347C8.99128 19.6537 8.52349 19.4637 7.55206 19.4637C6.76068 19.4637 5.63218 19.6175 5.00949 19C4.38181 18.3776 4.53628 17.2444 4.53628 16.4479C4.53628 15.4414 4.31616 14.9786 3.59938 14.2618C2.53314 13.1956 2.00002 12.6624 2 12C2.00001 11.3375 2.53312 10.8044 3.59935 9.73817C4.2392 9.09832 4.53628 8.46428 4.53628 7.55206C4.53628 6.76065 4.38249 5.63214 5 5.00944C5.62243 4.38178 6.7556 4.53626 7.55208 4.53626C8.46427 4.53626 9.09832 4.2392 9.73815 3.59937C10.8044 2.53312 11.3375 2 12 2C12.6625 2 13.1956 2.53312 14.2618 3.59937C14.9015 4.23907 15.5355 4.53626 16.4479 4.53626C17.2393 4.53626 18.3679 4.38247 18.9906 5C19.6182 5.62243 19.4637 6.75559 19.4637 7.55206C19.4637 8.55858 19.6839 9.02137 20.4006 9.73817C21.4669 10.8044 22 11.3375 22 12C22 12.6624 21.4669 13.1956 20.4006 14.2618C19.6838 14.9786 19.4637 15.4414 19.4637 16.4479C19.4637 17.2444 19.6182 18.3776 18.9905 19Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M9 12.8929L10.8 14.5L15 9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Meeting Scheduled
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.meetingScheduled ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 2V6M8 2V6" />
                <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" />
                <path d="M3 10H21" />
                <path d="M10 18.5002L9.99999 13.8474C9.99999 13.6557 9.86325 13.5002 9.69458 13.5002H9M14 18.4983L15.4855 13.8923C15.4951 13.8626 15.5 13.8315 15.5 13.8002C15.5 13.6346 15.3657 13.5002 15.2 13.5002L13 13.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Meeting Conducted
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.meetingConducted ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 2V6M8 2V6" />
                <path d="M21 15V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H12" />
                <path d="M3 10H21" />
                <path d="M18.5 22C19.0057 21.5085 21 20.2002 21 19.5C21 18.7998 19.0057 17.4915 18.5 17M20.5 19.5H14" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Follow Up Calls
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.followUpCalls ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.91186 10.5413L7.55229 7.90088C8.09091 7.36227 8.27728 6.56642 8.05944 5.83652C7.8891 5.26577 7.69718 4.57964 7.56961 3.99292C7.45162 3.45027 6.97545 3 6.42012 3H4.91186C3.8012 3 2.88911 3.90384 3.01094 5.0078C3.93709 13.3996 10.6004 20.0629 18.9922 20.9891C20.0962 21.1109 21 20.1988 21 19.0881V17.5799C21 17.0246 20.5479 16.569 20.0015 16.4696C19.3988 16.36 18.7611 16.1804 18.2276 16.0103C17.4611 15.7659 16.6091 15.9377 16.0403 16.5065L13.4587 19.0881" />
                <path d="M19.267 4.73352L14 10.0005M15 4.29648C16.2553 4.18726 19.0469 3.67785 19.6848 4.31573C20.3226 4.9536 19.8132 7.74515 19.704 9.00049" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Proposals Sent
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : data?.proposalsSent ?? 0}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.9805 7.01556C14.9805 7.01556 15.4805 7.51556 15.9805 8.51556C15.9805 8.51556 17.5687 6.01556 18.9805 5.51556" />
                <path d="M9.99491 2.02134C7.49644 1.91556 5.56618 2.20338 5.56618 2.20338C4.34733 2.29053 2.01152 2.97385 2.01154 6.96454C2.01156 10.9213 1.9857 15.7993 2.01154 17.7439C2.01154 18.932 2.74716 21.7033 5.29332 21.8518C8.38816 22.0324 13.9628 22.0708 16.5205 21.8518C17.2052 21.8132 19.4847 21.2757 19.7732 18.7956C20.0721 16.2263 20.0126 14.4407 20.0126 14.0157" />
                <path d="M21.9999 7.01556C21.9999 9.77698 19.7592 12.0156 16.9951 12.0156C14.231 12.0156 11.9903 9.77698 11.9903 7.01556C11.9903 4.25414 14.231 2.01556 16.9951 2.01556C19.7592 2.01556 21.9999 4.25414 21.9999 7.01556Z" />
                <path d="M6.98053 13.0156H10.9805" />
                <path d="M6.98053 17.0156H14.9805" />
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                Conversion Rate
              </h3>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {error ? "N/A" : `${data?.conversionRate ?? 0}%`}
              </p>
            </div>
            <div
              className={`p-3  text-orange-600 rounded-full w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center ${theme === "dark" ? "bg-orange-100/10" : "bg-orange-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21H10C6.70017 21 5.05025 21 4.02513 19.9749C3 18.9497 3 17.2998 3 14V3" />
                <path d="M7.99707 16.999C11.5286 16.999 18.9122 15.5348 18.6979 6.43269M16.4886 8.04302L18.3721 6.14612C18.5656 5.95127 18.8798 5.94981 19.0751 6.14286L20.9971 8.04302" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
