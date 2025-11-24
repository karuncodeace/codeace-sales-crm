"use client"
import {useEffect,useState} from "react"
import {useTheme} from "../context/themeContext"
export default function Cards(){
const { theme } = useTheme();
 const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
    return(
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-8 ">
        {/* Card */}
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}` }>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium 
                ${theme === "dark" ? "text-gray-300" : "text-gray-500"}
                `}>Leads Generated</h3>
              <p className="text-2xl font-semibold text-green-600 mt-1">25</p>
            </div>
            <div
              className="p-2 sm:p-3 bg-green-100 text-green-600 rounded-full  w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 
            flex items-center justify-center"
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
                  d="M14 8.5C14 5.73858 11.7614 3.5 9 3.5C6.23858 3.5 4 5.73858 4 8.5C4 11.2614 6.23858 13.5 9 13.5C11.7614 13.5 14 11.2614 14 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M16 20.5C16 16.634 12.866 13.5 9 13.5C5.13401 13.5 2 16.634 2 20.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M19 9V15M22 12L16 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}` }>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium 
                ${theme === "dark" ? "text-gray-300" : "text-gray-500"}
                `}>Proposals Sent</h3>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">12</p>
            </div>
            <div
              className="p-3 bg-yellow-100 text-yellow-600 rounded-full  w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 
            flex items-center justify-center"
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
                  d="M20 14V10.6569C20 9.83935 20 9.4306 19.8478 9.06306C19.6955 8.69552 19.4065 8.40649 18.8284 7.82843L14.0919 3.09188C13.593 2.593 13.3436 2.34355 13.0345 2.19575C12.9702 2.165 12.9044 2.13772 12.8372 2.11401C12.5141 2 12.1614 2 11.4558 2C8.21082 2 6.58831 2 5.48933 2.88607C5.26731 3.06508 5.06508 3.26731 4.88607 3.48933C4 4.58831 4 6.21082 4 9.45584V14C4 17.7712 4 19.6569 5.17157 20.8284C6.34315 22 8.22876 22 12 22M13 2.5V3C13 5.82843 13 7.24264 13.8787 8.12132C14.7574 9 16.1716 9 19 9H19.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M17 22C17.6068 21.4102 20 19.8403 20 19C20 18.1597 17.6068 16.5898 17 16M19 19H12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}` }>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium 
                ${theme === "dark" ? "text-gray-300" : "text-gray-500"}
                `}>
                Meetings Scheduled
              </h3>
              <p className="text-2xl font-semibold text-green-600 mt-1">32</p>
            </div>
            <div
              className="p-3 bg-green-100 text-green-600 rounded-full  w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 
            flex items-center justify-center"
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
                  d="M16 2V6M8 2V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M3 10H21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M10 18.5002L9.99999 13.8474C9.99999 13.6557 9.86325 13.5002 9.69458 13.5002H9M14 18.4983L15.4855 13.8923C15.4951 13.8626 15.5 13.8315 15.5 13.8002C15.5 13.6346 15.3657 13.5002 15.2 13.5002L13 13.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}` }>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium 
                ${theme === "dark" ? "text-gray-300" : "text-gray-500"}
                `}>Conversions</h3>
              <p className="text-2xl font-semibold text-orange-600 mt-1">12</p>
            </div>
            <div
              className="p-3 bg-orange-100 text-orange-600 rounded-full  w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 
            flex items-center justify-center"
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
        <div className={`  rounded-xl  p-4 ${theme === "dark" ? "bg-[#262626] border border-gray-700 text-gray-300 " : "bg-white border border-gray-200"}` }>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium
                ${theme === "dark" ? "text-gray-300" : "text-gray-500"}
                `}>
                Revenue Generated
              </h3>
              <p className="text-2xl font-semibold text-purple-600 mt-1">$3.8M</p>
            </div>
            <div
              className="p-3 bg-purple-100 text-purple-600 rounded-full  w-10 h-10 sm:w-10 sm:h-10 md:w-12 md:h-12 
            flex items-center justify-center"
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
                  d="M2 14C2 10.4934 2 8.74003 2.90796 7.55992C3.07418 7.34388 3.25989 7.14579 3.46243 6.96849C4.56878 6 6.21252 6 9.5 6H14.5C17.7875 6 19.4312 6 20.5376 6.96849C20.7401 7.14579 20.9258 7.34388 21.092 7.55992C22 8.74003 22 10.4934 22 14C22 17.5066 22 19.26 21.092 20.4401C20.9258 20.6561 20.7401 20.8542 20.5376 21.0315C19.4312 22 17.7875 22 14.5 22H9.5C6.21252 22 4.56878 22 3.46243 21.0315C3.25989 20.8542 3.07418 20.6561 2.90796 20.4401C2 19.26 2 17.5066 2 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M16 6C16 4.11438 16 3.17157 15.4142 2.58579C14.8284 2 13.8856 2 12 2C10.1144 2 9.17157 2 8.58579 2.58579C8 3.17157 8 4.11438 8 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M12 11C10.8954 11 10 11.6716 10 12.5C10 13.3284 10.8954 14 12 14C13.1046 14 14 14.6716 14 15.5C14 16.3284 13.1046 17 12 17M12 11C12.8708 11 13.6116 11.4174 13.8862 12M12 11V10M12 17C11.1292 17 10.3884 16.5826 10.1138 16M12 17V18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                ></path>
                <path
                  d="M6 12H2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                ></path>
                <path
                  d="M22 12L18 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                 strokeLinecap="round"
                ></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
        </>
    )
}