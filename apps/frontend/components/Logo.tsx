import Link from "next/link";

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="Matiks home"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-[#0a0f18] shadow-[0_10px_30px_-10px_rgba(200,255,61,0.8)] transition-transform duration-200 group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4.5 18V6.8L12 13.4l7.5-6.6V18"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {withWordmark ? (
        <span className="text-[1.05rem] font-bold tracking-[0.18em]">
          MATIKS
        </span>
      ) : null}
    </Link>
  );
}
