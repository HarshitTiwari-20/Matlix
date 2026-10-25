"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[frontend] unhandled error", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-60" />
      <div className="relative">
        <p className="eyebrow">Unexpected fault</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          The arena hit a snag.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Something went wrong while loading this screen. Try again, or head back
          to the lobby.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
