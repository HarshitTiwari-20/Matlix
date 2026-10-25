import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-accent-2/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link className="text-sm text-muted transition-colors hover:text-foreground" href="/">
          Back to home
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20 lg:py-12">
        <section className="hidden max-w-lg lg:block">
          <span className="chip !border-accent/25 !bg-accent/[0.07] !text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Season 01
          </span>
          <h2 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em]">
            Speed is a skill.
            <span className="block text-muted">Prove yours.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Matiks matches you with a live opponent for ten rapid-fire math
            questions. Accuracy keeps you moving. Speed wins the match.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            <div className="panel-soft px-5 py-4">
              <p className="text-2xl font-semibold">10</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                questions
              </p>
            </div>
            <div className="panel-soft px-5 py-4">
              <p className="text-2xl font-semibold">1v1</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                live race
              </p>
            </div>
            <div className="panel-soft px-5 py-4">
              <p className="text-2xl font-semibold text-accent">1000</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                starting rating
              </p>
            </div>
            <div className="panel-soft px-5 py-4">
              <p className="text-2xl font-semibold text-accent-2">0</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                bots
              </p>
            </div>
          </div>

          <p className="mt-10 max-w-sm text-sm italic leading-relaxed text-muted">
            “The equation is simple. The race is not.”
          </p>
        </section>

        <div className="flex w-full justify-center lg:justify-end">{children}</div>
      </main>
    </div>
  );
}
