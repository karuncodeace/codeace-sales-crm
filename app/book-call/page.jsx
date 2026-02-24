import React, { Suspense } from "react";
import BookCallClient from "./BookCallClient";

export default function PublicBookCallPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-sm">Loading...</div></div>}>
      <BookCallClient />
    </Suspense>
  );
}

