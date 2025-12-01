"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";

export default function Header() {
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabaseBrowser.auth.getUser();
            if (user) {
                // Try to get name from user metadata (Google sign-in provides full_name)
                const name = user.user_metadata?.full_name 
                    || user.user_metadata?.name 
                    || user.email?.split('@')[0] 
                    || "User";
                setDisplayName(name.split(' ')[0]); // Get first name only
            }
        };
        getUser();
    }, []);

    return (
        <div className="mt-10 pt-0 w-[98%]">
            <div>
                <h1 className="text-4xl font-bold mb-1">
                    Hello {displayName || "..."} !!!
                </h1>
            </div>
        </div>
    );
}