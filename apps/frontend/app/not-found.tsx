import Link from "next/link";
import { Logo } from "../components/Logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-60" />
      <div className="relative">
        <Logo />
        <p className="eyebrow mt-10">404 — off the grid</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          This equation does not exist.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          The page you are looking for may have moved, or the match already ended.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn-ghost" href="/play">
            Enter the arena
          </Link>
        </div>
      </div>
    </main>
  );
}
