"use client";

import useSWR from "swr";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";
import { useTheme } from "../../context/themeContext";

// Fetcher function for user data
const fetchUserData = async () => {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (user) {
        // Try to get name from user metadata (Google sign-in provides full_name)
        const name = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email?.split('@')[0]
            || "User";
        return name.split(' ')[0]; // Get first name only
    }
    return null;
};

export default function Header() {
    const { theme } = useTheme();

    // Cache user data for 3 days (259200000 milliseconds)
    const { data: displayName, error, isLoading } = useSWR(
        "header-user-profile",
        fetchUserData,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 259200000, // 3 days in milliseconds
            refreshInterval: 0, // Don't auto-refresh
            // Cache for 3 days - data will be considered fresh for 3 days
            revalidateIfStale: false,
            keepPreviousData: true,
        }
    );

    return (
        <div className="mt-8 pt-0  md:mt-4 xl:mt-5 2xl:mt-8 flex justify-between items-center">
            <div>
                <h1 className={`text-[24px] font-bold font-dyna-puff ${theme === "dark" ? "text-white" : "text-black"}`}>
                    Hello {isLoading ? "..." : displayName || "User"} !!!
                </h1>
            </div>
            <div>
                <button className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13.2426 17.5C13.1955 17.8033 13.1531 18.0485 13.1164 18.2442C12.8876 19.4657 11.1555 20.2006 10.2283 20.8563C9.67638 21.2466 9.00662 20.782 8.9351 20.1778C8.79875 19.0261 8.54193 16.6864 8.26159 13.2614C8.23641 12.9539 8.08718 12.6761 7.85978 12.5061C5.37133 10.6456 3.59796 8.59917 2.62966 7.44869C2.32992 7.09255 2.2317 6.83192 2.17265 6.37282C1.97043 4.80082 1.86933 4.01482 2.33027 3.50742C2.79122 3.00002 3.60636 3.00002 5.23665 3.00002H16.768C18.3983 3.00002 19.2134 3.00002 19.6743 3.50742C19.8979 3.75348 19.9892 4.06506 20.001 4.50002" />
                        <path d="M20.8628 7.4392L21.5571 8.13157C22.1445 8.71735 22.1445 9.6671 21.5571 10.2529L17.9196 13.9486C17.6335 14.2339 17.2675 14.4263 16.8697 14.5003L14.6153 14.9884C14.2593 15.0655 13.9424 14.7503 14.0186 14.3951L14.4985 12.1598C14.5728 11.7631 14.7657 11.3981 15.0518 11.1128L18.7356 7.4392C19.323 6.85342 20.2754 6.85342 20.8628 7.4392Z" />
                    </svg>
                    Filter</button>
            </div>
        </div>
    );
}