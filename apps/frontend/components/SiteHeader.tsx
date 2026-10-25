"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "../lib/auth";
import { useSession } from "../lib/use-session";
import { Logo } from "./Logo";

export function SiteHeader() {
  const router = useRouter();
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#06090f]/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a className="transition-colors hover:text-foreground" href="#how-it-works">
            How it works
          </a>
          <a className="transition-colors hover:text-foreground" href="#features">
            Features
          </a>
          <Link className="transition-colors hover:text-foreground" href="/play">
            Play
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm sm:inline-flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold uppercase text-accent">
                  {user.username.slice(0, 1)}
                </span>
                <span className="max-w-28 truncate text-muted">{user.username}</span>
              </span>
              <Link className="btn btn-primary !px-5 !py-2.5" href="/play">
                Enter arena
              </Link>
              <button
                className="btn btn-ghost !px-4 !py-2.5"
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="hidden text-sm text-muted transition-colors hover:text-foreground sm:block" href="/login">
                Log in
              </Link>
              <Link className="btn btn-primary !px-5 !py-2.5" href="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
