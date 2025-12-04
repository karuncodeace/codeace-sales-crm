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
        <div className="mt-8 pt-0  md:mt-4 xl:mt-5 2xl:mt-8  w-[98%]">
            <div>
                <h1 className={`text-3xl font-bold font-dyna-puff ${theme === "dark" ? "text-white" : "text-black"}`}>
                    Hello {isLoading ? "..." : displayName || "User"} !!!
                </h1>
            </div>
        </div>
    );
}