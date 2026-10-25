import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

const FEATURES = [
  {
    title: "Live matchmaking",
    body: "Join the queue and get paired with a real opponent in seconds. No bots, no waiting rooms.",
    icon: (
      <path
        d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8a6 6 0 0 0-12 0m14-12h4m-2-2v4m-2 5a5 5 0 0 1 5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
  {
    title: "Identical question set",
    body: "Both racers solve the same ten equations. The only variable is speed and accuracy.",
    icon: (
      <path
        d="M7 5h10M7 12h10M7 19h10M3 5h.01M3 12h.01M3 19h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    ),
  },
  {
    title: "Instant scoring",
    body: "Every correct answer advances you one step and adds a point. Wrong answers keep you in place.",
    icon: (
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your call sign",
    body: "Register in under a minute with an email and password. Your rating starts at 1000.",
  },
  {
    step: "02",
    title: "Enter the queue",
    body: "Hit find a match. As soon as a second player arrives, the race begins automatically.",
  },
  {
    step: "03",
    title: "Race to the finish",
    body: "Solve all ten equations before your opponent. First to finish takes the match.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] grid-overlay opacity-70" />
      <div className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-accent-2/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-64 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      <SiteHeader />

      <main className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="chip !border-accent/25 !bg-accent/[0.07] !text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Live 1v1 arena · open now
            </span>

            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Outrace your rival.
              <span className="block text-muted">One equation at a time.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Matiks pairs you with another human for a head-to-head mental math
              sprint. Same questions, same clock, fastest mind wins.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className="btn btn-primary min-w-44" href="/play">
                Find a match
              </Link>
              <Link className="btn btn-ghost min-w-40" href="/register">
                Create free account
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Real opponents
              </span>
              <span>10 equations per match</span>
              <span>No downloads</span>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-accent/20 via-transparent to-accent-2/20 blur-2xl" />
              <div className="panel animate-float relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
                    Live match
                  </span>
                  <span className="chip !py-1 text-[0.65rem]">Round 01</span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                      A
                    </span>
                    <div>
                      <p className="text-sm font-semibold">ada_l</p>
                      <p className="text-[0.68rem] text-muted">You</p>
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-accent">7</span>
                </div>

                <div className="my-5 h-px bg-white/10" />

                <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-6 text-center">
                  <p className="text-[0.65rem] uppercase tracking-[0.24em] text-muted">
                    Question 08 / 10
                  </p>
                  <p className="equation mt-3 text-5xl font-semibold text-foreground">
                    48 ÷ 6
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {["8", "7", "9", "6"].map((option, index) => (
                      <span
                        key={option}
                        className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-semibold ${
                          index === 0
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-white/10 bg-white/[0.03] text-muted"
                        }`}
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[0.68rem] text-muted">
                      <span>ada_l</span>
                      <span>70%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full w-[70%] rounded-full bg-accent" />
                    </div>
                  </div>
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted">vs</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[0.68rem] text-muted">
                      <span>nova_k</span>
                      <span>50%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full w-1/2 rounded-full bg-accent-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel-soft absolute -bottom-6 -left-4 hidden items-center gap-2.5 px-4 py-3 text-xs text-muted sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Answer scored instantly
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
          {[
            ["1v1", "head-to-head"],
            ["10", "equations per match"],
            ["0 sec", "queue downtime"],
            ["100%", "human opponents"],
          ].map(([value, label]) => (
            <div key={label} className="bg-[#080d16] px-5 py-5 text-center">
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.2em] text-muted">{label}</p>
            </div>
          ))}
        </section>

        <section id="features" className="scroll-mt-24 py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">Built for speed</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              A fair race, from queue to final answer.
            </h2>
            <p className="mt-3 text-muted">
              Every design decision keeps the contest honest: identical questions,
              live progress, and no hidden advantage.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className="panel group p-6 transition-colors duration-300 hover:border-white/20"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    {feature.icon}
                  </svg>
                </span>
                <p className="mt-6 text-[0.65rem] uppercase tracking-[0.24em] text-muted">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 pb-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Three steps</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                From sign-up to showdown.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                No tutorials, no downloads. Create an account, queue, and the
                server handles the rest.
              </p>
              <Link className="btn btn-primary mt-7" href="/play">
                Enter the arena
              </Link>
            </div>

            <ol className="flex flex-col gap-3">
              {STEPS.map((item) => (
                <li
                  key={item.step}
                  className="panel-soft flex gap-5 p-5 transition-colors hover:border-white/20"
                >
                  <span className="font-mono text-sm text-accent">{item.step}</span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative mb-20 overflow-hidden rounded-[2rem] border border-accent/20 bg-gradient-to-br from-accent/[0.09] via-panel to-accent-2/[0.09] px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
          <div className="relative">
            <p className="eyebrow">Your move</p>
            <h2 className="mx-auto mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Someone is online waiting for a match.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted">
              Ten questions decide it. Jump in and see how fast your mind really is.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link className="btn btn-primary min-w-40" href="/play">
                Play now
              </Link>
              <Link className="btn btn-ghost" href="/login">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted sm:flex-row sm:px-8">
          <p>Matiks — live 1v1 mental math.</p>
          <div className="flex items-center gap-5">
            <Link className="transition-colors hover:text-foreground" href="/play">
              Arena
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/register">
              Create account
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/login">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
