import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BUILD_STEPS, TEAM, TECH_STACK } from "@/src/game/data/about";
import BrandMark from "@/src/game/ui/BrandMark";

export const metadata: Metadata = {
  title: "About — Rocket Simulator",
  description:
    "Meet the five-person team behind Rocket Simulator and read how the deterministic rocket-engineering game was built.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--navy)] text-[var(--ink)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[rgba(5,10,20,0.92)] px-3 py-2.5 backdrop-blur sm:px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="Rocket Simulator home">
          <BrandMark className="h-8 w-8 shrink-0" />
          <span className="leading-none">
            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.24em]">
              Rocket Simulator
            </span>
            <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
              About the project
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-2" aria-label="About navigation">
          <Link
            href="/"
            className="rounded-sm border border-[var(--line)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
          >
            Briefing
          </Link>
          <Link
            href="/failures"
            className="hidden rounded-sm border border-[var(--line)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)] sm:block"
          >
            Failure guide
          </Link>
          <Link
            href="/game"
            className="rounded-sm border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.08)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.16)]"
          >
            Launch console
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-5 sm:px-5 lg:py-8">
        <section className="panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="p-5 sm:p-7">
              <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--cyan)]">
                About Rocket Simulator
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                Five people, one deterministic launch stack.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#c9d8ea]">
                Rocket Simulator is a browser game about building launch vehicles that obey the
                same physics as the real thing — just forgiving enough to fly. Every failure is
                caused by a rule you can inspect, understand and fix.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                We designed the mission, wrote the physics, drew the hardware in code, built
                mission control, and tested every stock vehicle until an autopilot could complete
                all five campaigns. No backend, no downloaded art, no random failures.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TECH_STACK.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative min-h-[220px] border-t border-[var(--line)] lg:border-l lg:border-t-0">
              <Image
                src="/about/banner.svg"
                alt="Mission control placeholder artwork"
                width={1600}
                height={700}
                priority
                unoptimized
                className="h-full w-full object-cover"
              />
              <p className="absolute bottom-2 right-3 font-mono text-[7px] uppercase tracking-[0.14em] text-white/50">
                Screenshot placeholder
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="build-heading" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
                How we built it
              </div>
              <h2 id="build-heading" className="mt-1 text-xl font-semibold tracking-tight text-white">
                From mission brief to launch console
              </h2>
            </div>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)] sm:block">
              {BUILD_STEPS.length} steps
            </span>
          </div>

          <ol className="grid gap-3 md:grid-cols-2">
            {BUILD_STEPS.map((step, index) => (
              <li key={step.title} className="panel flex gap-3 p-4">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.06)] font-mono text-[9px] text-[var(--cyan)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--ink)]">{step.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="team-heading" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
                The crew
              </div>
              <h2 id="team-heading" className="mt-1 text-xl font-semibold tracking-tight text-white">
                Five team members built this project
              </h2>
            </div>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)] sm:block">
              {TEAM.length} members
            </span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TEAM.map((member) => (
              <li key={member.id} className="panel overflow-hidden">
                <div className="relative aspect-[4/5] w-full bg-[#0b1424]">
                  <Image
                    src={member.image}
                    alt={`${member.name} — ${member.role}`}
                    width={400}
                    height={500}
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 220px"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="border-t border-[var(--line)] p-3">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ink)]">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-[var(--cyan)]">{member.role}</p>
                  <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted)]">
                    {member.focus}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--muted)]">
            Crew portraits are original vector avatars. Replace{" "}
            <code>public/team/member-01..05.svg</code> with photos when they are available.
          </p>
        </section>

        <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
              Ready for the pad?
            </div>
            <p className="mt-1 text-sm text-[#c9d8ea]">
              Read the briefing, check the failure guide, then build a rocket that survives Max Q.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-sm border border-[var(--line)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
            >
              Read briefing
            </Link>
            <Link
              href="/failures"
              className="rounded-sm border border-[var(--line)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
            >
              Failure guide
            </Link>
            <Link
              href="/game"
              className="rounded-sm border border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.18)]"
            >
              Play the game →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] px-4 py-2 text-center font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Rocket Simulator · about · built by five humans and a lot of tests
      </footer>
    </div>
  );
}
