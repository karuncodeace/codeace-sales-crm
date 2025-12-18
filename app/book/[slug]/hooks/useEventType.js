import { useState, useEffect } from "react";

export function useEventType(slug) {
    const [eventType, setEventType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchEventType() {
            if (!slug) return;

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/event-types?slug=${slug}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch event type");
                }

                const data = await response.json();
                setEventType(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchEventType();
    }, [slug]);

    return { eventType, loading, error };
}

