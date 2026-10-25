"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, type AuthUser } from "../lib/auth";
import { useSession } from "../lib/use-session";
import { WS_URL } from "../lib/config";
import {
  gameReducer,
  initialGameState,
  progressFor,
  rankedMembers,
  scoreFor,
  type Member,
  type ServerMessage,
} from "../lib/game-state";
import { describeEquation, formatEquation } from "../lib/math";
import { Logo } from "./Logo";

export function PlayArena() {
  const { user, token } = useSession();

  if (!user || !token) {
    return <SessionRequired />;
  }

  return <Arena user={user} token={token} />;
}

function SessionRequired() {
  return (
    <div className="flex min-h-[70vh] flex-1 items-center justify-center px-5 py-16">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="flex justify-center">
          <Logo withWordmark={false} />
        </div>
        <p className="eyebrow mt-6">Members only</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Sign in to enter the arena
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your match history, rating, and live queue are tied to your account.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link className="btn btn-primary" href="/login">
            Log in
          </Link>
          <Link className="btn btn-ghost" href="/register">
            Create account
          </Link>
        </div>
        <Link className="mt-5 inline-block text-xs text-muted transition-colors hover:text-foreground" href="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function Arena({ user, token }: { user: AuthUser; token: string }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(gameReducer, user.id, initialGameState);
  const [answer, setAnswer] = useState("");
  const [attempt, setAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (active) dispatch({ type: "CONNECTED" });
    };

    ws.onmessage = (event) => {
      if (!active) return;
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message && typeof message.type === "string") {
          dispatch({ type: "SERVER", message });
        }
      } catch {
        // Ignore malformed frames from the socket.
      }
    };

    ws.onerror = () => {
      if (active) {
        dispatch({
          type: "SET_ERROR",
          message: "Could not reach the match server. Check that the WS backend is running.",
        });
      }
    };

    ws.onclose = (event) => {
      if (!active) return;
      if (event.code === 1008) {
        clearSession();
        router.replace("/login");
        return;
      }
      dispatch({
        type: "DISCONNECTED",
        message:
          event.reason ||
          "Connection lost. Reconnect to get back into the arena.",
      });
    };

    return () => {
      active = false;
      ws.close();
      wsRef.current = null;
    };
  }, [attempt, router, token]);

  useEffect(() => {
    if (!state.flash) return;
    const timeout = setTimeout(() => dispatch({ type: "CLEAR_FLASH" }), 350);
    return () => clearTimeout(timeout);
  }, [state.flash]);

  useEffect(() => {
    if (state.screen === "playing") {
      inputRef.current?.focus();
    }
  }, [state.question?.id, state.screen]);

  function send(message: unknown) {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) {
      dispatch({ type: "SET_ERROR", message: "Not connected to the match server." });
      return;
    }
    ws.send(JSON.stringify(message));
  }

  function startMatch() {
    dispatch({ type: "STARTING" });
    send({ type: "START_GAME" });
  }

  function cancelSearch() {
    send({ type: "CANCEL_GAME" });
  }

  function playAgain() {
    dispatch({ type: "RESET" });
    dispatch({ type: "STARTING" });
    send({ type: "START_GAME" });
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!state.gameId || !state.question) return;

    const value = answer.trim();
    if (!/^-?\d+$/.test(value)) {
      dispatch({
        type: "SET_ERROR",
        message: "Enter a whole number to submit an answer.",
      });
      inputRef.current?.focus();
      return;
    }

    send({
      type: "SUBMIT_ANSWER",
      payload: {
        gameId: state.gameId,
        questionId: state.question.id,
        answer: Number(value),
      },
    });
    setAnswer("");
  }

  const opponent = state.members.find((member) => member.id !== user.id) ?? null;
  const selfScore = scoreFor(state, user.id);
  const opponentScore = scoreFor(state, opponent?.id);
  const selfProgress = progressFor(state, user.id);
  const opponentProgress = progressFor(state, opponent?.id);
  const progressPercent = Math.min(
    100,
    Math.round((state.index / Math.max(1, state.total)) * 100),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="hidden sm:block">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Arena</p>
            <p className="text-sm font-medium">{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn btn-ghost !px-4 !py-2.5 text-sm" href="/">
            Home
          </Link>
          <button className="btn btn-ghost !px-4 !py-2.5 text-sm" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Connection"
          value={state.connected ? "Live" : "Offline"}
          tone={state.connected ? "success" : "danger"}
        />
        <Stat label="In arena" value={String(state.online.length)} />
        <Stat label="Your score" value={String(selfScore)} tone="accent" />
        <Stat
          label="Progress"
          value={`${Math.min(state.index, state.total)} / ${state.total}`}
        />
      </section>

      {!state.connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
          <span>Connecting to the match server…</span>
          <button
            className="btn btn-ghost !px-4 !py-2 text-xs"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry connection
          </button>
        </div>
      ) : null}

      {state.error ? (
        <p
          className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0">
          {state.screen === "idle" || state.screen === "waiting" ? (
            <LobbyCard
              waiting={state.screen === "waiting"}
              notice={state.notice}
              connected={state.connected}
              onStart={startMatch}
              onCancel={cancelSearch}
            />
          ) : null}

          {state.screen === "playing" && state.question ? (
            <QuestionCard
              question={state.question}
              index={state.index}
              total={state.total}
              flash={state.flash}
              answer={answer}
              setAnswer={setAnswer}
              inputRef={inputRef}
              onSubmit={submit}
              progressPercent={progressPercent}
              selfProgress={selfProgress}
              opponent={opponent}
              opponentScore={opponentScore}
              opponentProgress={opponentProgress}
            />
          ) : null}

          {state.screen === "over" ? (
            <ResultCard
              state={state}
              selfId={user.id}
              onPlayAgain={playAgain}
            />
          ) : null}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="panel-soft p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Match players</h2>
              <span className="chip !py-1 text-[0.68rem]">{state.members.length}/2</span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <PlayerRow
                member={{ id: user.id, name: user.username }}
                score={selfScore}
                progress={selfProgress}
                total={state.total}
                tone="accent"
                isSelf
              />
              {opponent ? (
                <PlayerRow
                  member={opponent}
                  score={opponentScore}
                  progress={opponentProgress}
                  total={state.total}
                  tone="cyan"
                />
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-muted">
                  Waiting for a challenger
                </div>
              )}
            </div>
          </div>

          <div className="panel-soft p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Online now</h2>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {state.online.length}
              </span>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {state.online.length === 0 ? (
                <li className="text-xs text-muted">No players connected yet.</li>
              ) : (
                state.online.slice(0, 8).map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          member.id === user.id ? "bg-accent" : "bg-accent-2"
                        }`}
                      />
                      <span className="truncate text-muted">{member.name}</span>
                    </span>
                    {member.id === user.id ? (
                      <span className="text-[0.65rem] uppercase tracking-wider text-accent">
                        you
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="panel-soft p-5">
            <h2 className="text-sm font-semibold">Scoring rules</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-xs leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="text-accent">01</span>
                Both players receive the same ten equations.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">02</span>
                A correct answer advances you one question and scores a point.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">03</span>
                A wrong answer keeps you on the same equation.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">04</span>
                First to finish the set takes the match.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "accent" | "success" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";

  return (
    <div className="panel-soft px-4 py-3.5">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function LobbyCard({
  waiting,
  notice,
  connected,
  onStart,
  onCancel,
}: {
  waiting: boolean;
  notice: string;
  connected: boolean;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="panel relative overflow-hidden p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-60" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <p className="eyebrow">{waiting ? "Matchmaking" : "Ready when you are"}</p>
        <h1 className="mx-auto mt-3 max-w-lg text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {waiting ? "Finding your next rival" : "One opponent. Ten equations."}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          {waiting
            ? notice || "Scanning the arena for an opponent…"
            : "Queue up and get paired live. Answer faster and more accurately than your rival to take the match."}
        </p>

        <div className="my-8 flex justify-center">
          {waiting ? (
            <div className="search-orbit" aria-hidden="true">
              <div className="search-core text-lg">1v1</div>
            </div>
          ) : (
            <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-black/25 px-7 py-5">
              <span className="equation text-4xl text-accent">7 × 8</span>
              <span className="h-10 w-px bg-white/10" />
              <div className="text-left">
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">Question 01</p>
                <p className="mt-1 text-sm text-accent-2">Live race format</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="chip">10 questions</span>
          <span className="chip">Same set for both</span>
          <span className="chip">Instant scoring</span>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {waiting ? (
            <button className="btn btn-ghost" type="button" onClick={onCancel}>
              Cancel search
            </button>
          ) : (
            <button
              className="btn btn-primary min-w-44"
              type="button"
              onClick={onStart}
              disabled={!connected}
            >
              Find a match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  flash,
  answer,
  setAnswer,
  inputRef,
  onSubmit,
  progressPercent,
  selfProgress,
  opponent,
  opponentScore,
  opponentProgress,
}: {
  question: {
    id: string;
    operation1: number;
    operation2: number;
    sign: "PLUS" | "MINUS" | "MULTIPLICATION" | "DIVIDE";
  };
  index: number;
  total: number;
  flash: "ok" | "bad" | null;
  answer: string;
  setAnswer: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (event: React.FormEvent) => void;
  progressPercent: number;
  selfProgress: number;
  opponent: Member | null;
  opponentScore: number;
  opponentProgress: number;
}) {
  return (
    <div
      className={`panel relative overflow-hidden p-6 sm:p-9 ${
        flash === "bad" ? "animate-shake border-danger/40" : flash === "ok" ? "border-accent/40" : ""
      }`}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-accent-2/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">
            Question {String(Math.min(index + 1, total)).padStart(2, "0")} / {total}
          </span>
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
            vs {opponent?.name ?? "opponent"}
          </span>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p
          className="equation mt-10 text-center text-6xl font-semibold sm:text-7xl md:text-8xl"
          aria-live="polite"
        >
          {formatEquation(question.operation1, question.operation2, question.sign)}
        </p>
        <p className="sr-only">
          {describeEquation(question.operation1, question.operation2, question.sign)}
        </p>

        <form className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className={`field flex-1 !rounded-2xl py-4 text-center text-2xl font-semibold ${
              flash === "bad" ? "field-error" : ""
            }`}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-label="Your answer"
            placeholder="?"
          />
          <button className="btn btn-primary !rounded-2xl sm:px-7" type="submit">
            Submit
          </button>
        </form>

        <div className="mt-4 flex min-h-5 items-center justify-center text-sm">
          {flash === "bad" ? (
            <span className="animate-pop text-danger">Not quite — the same equation stays.</span>
          ) : flash === "ok" ? (
            <span className="animate-pop text-success">Correct. Next one.</span>
          ) : (
            <span className="text-muted">Type the result and press Enter.</span>
          )}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <MiniProgress label="You" value={selfProgress} total={total} tone="accent" />
          <MiniProgress
            label={opponent?.name ?? "Opponent"}
            value={opponentProgress}
            total={total}
            tone="cyan"
            suffix={`${opponentScore} pts`}
          />
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  state,
  selfId,
  onPlayAgain,
}: {
  state: ReturnType<typeof initialGameState>;
  selfId: string;
  onPlayAgain: () => void;
}) {
  const isWinner = state.winnerId === selfId;
  const isDraw = state.winnerId === null;
  const ranked = rankedMembers(state);

  return (
    <div className="panel relative overflow-hidden p-8 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-52 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative">
        <span
          className={`inline-grid h-16 w-16 place-items-center rounded-2xl border ${
            isWinner
              ? "border-accent/40 bg-accent/15 text-accent"
              : isDraw
                ? "border-white/15 bg-white/5 text-muted"
                : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
            <path
              d="M8 21h8M12 17v4M7 4h10v4a5 5 0 1 1-10 0V4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>

        <p className="eyebrow mt-5">Match complete</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {isWinner ? "Victory" : isDraw ? "Dead heat" : "Defeat"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {isWinner
            ? "You out-raced your opponent across the set."
            : isDraw
              ? "Both players finished level. Run it back?"
              : "Your rival got there first. One more match?"}
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <div className="flex flex-col gap-2">
            {ranked.map((member, position) => {
              const isSelf = member.id === selfId;
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                    isSelf
                      ? "border-accent/30 bg-accent/[0.06]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-left font-mono text-xs text-muted">
                      {position + 1}
                    </span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-bold uppercase">
                      {member.name.slice(0, 1)}
                    </span>
                    <span className="font-medium">
                      {member.name}
                      {isSelf ? <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-accent">you</span> : null}
                    </span>
                  </span>
                  <span className="font-mono text-base font-semibold">
                    {state.scores[member.id] ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary min-w-40" type="button" onClick={onPlayAgain}>
            Play again
          </button>
          <Link className="btn btn-ghost" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  member,
  score,
  progress,
  total,
  tone,
  isSelf = false,
}: {
  member: Member;
  score: number;
  progress: number;
  total: number;
  tone: "accent" | "cyan";
  isSelf?: boolean;
}) {
  const percent = Math.min(100, Math.round((progress / Math.max(1, total)) * 100));
  const bar = tone === "accent" ? "bg-accent" : "bg-accent-2";
  const avatar =
    tone === "accent" ? "bg-accent/15 text-accent" : "bg-accent-2/15 text-accent-2";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold uppercase ${avatar}`}>
            {member.name.slice(0, 1)}
          </span>
          <span className="truncate text-sm font-medium">
            {member.name}
            {isSelf ? <span className="ml-2 text-[0.62rem] uppercase tracking-wider text-muted">you</span> : null}
          </span>
        </span>
        <span className="font-mono text-sm font-semibold">{score}</span>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-[0.65rem] text-muted">
        {Math.min(progress, total)} / {total} solved
      </p>
    </div>
  );
}

function MiniProgress({
  label,
  value,
  total,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  tone: "accent" | "cyan";
  suffix?: string;
}) {
  const percent = Math.min(100, Math.round((value / Math.max(1, total)) * 100));
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-muted">{label}</span>
        <span className="font-mono">{suffix ?? `${Math.min(value, total)}/${total}`}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${tone === "accent" ? "bg-accent" : "bg-accent-2"} transition-[width] duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
