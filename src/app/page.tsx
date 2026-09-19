import Link from "next/link";
import { productName } from "@/lib/brand";

export default function Home() {
  return (
    <div className="min-h-screen bg-t4t-lightGray text-t4t-darkText">
      <header className="border-b border-t4t-navy/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-t4t-navy">
            Teach4Texas
          </span>
          <nav className="flex gap-3 text-sm font-medium">
            <Link
              href="/join"
              className="rounded-lg px-3 py-2 text-t4t-navy hover:bg-t4t-lightBlue"
            >
              Student join
            </Link>
            <Link
              href="/redeem"
              className="rounded-lg bg-t4t-burnt px-3 py-2 text-white hover:bg-t4t-burnt/90"
            >
              Redeem purchase
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-t4t-burnt">
          Paid TPT games · Live classroom host
        </p>
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-t4t-navy sm:text-5xl">
          {productName}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-t4t-darkText/80">
          This is the <strong>host site for games you buy</strong> on Teachers
          Pay Teachers — not a free game builder. Each listing includes an access
          code that unlocks that one game for your projector and class.
        </p>

        <div className="mt-6 max-w-2xl rounded-xl border border-t4t-navy/15 bg-white px-4 py-3 text-sm text-t4t-darkText/80">
          <strong className="text-t4t-navy">Teachers cannot generate games here.</strong>{" "}
          Purchase the product on TPT → redeem the code → host that paid game.
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/redeem"
            className="inline-flex items-center justify-center rounded-xl bg-t4t-navy px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-t4t-navy/90"
          >
            I bought a game — redeem code
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center justify-center rounded-xl border-2 border-t4t-navy px-6 py-3 text-base font-semibold text-t4t-navy hover:bg-t4t-lightBlue"
          >
            Join a game (students)
          </Link>
        </div>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "1. Buy on TPT",
              body: "Each game is a paid product. You pay for the listing you want — no free generator.",
              accent: "bg-t4t-burnt",
            },
            {
              title: "2. Redeem your code",
              body: "The download includes an access code. Redeem it here to unlock only that game.",
              accent: "bg-t4t-navy",
            },
            {
              title: "3. Host for class",
              body: "Project the board. Students join with a short room code (live multiplayer next).",
              accent: "bg-t4t-green",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-t4t-navy/10 bg-white p-6 shadow-sm"
            >
              <div className={`mb-4 h-1.5 w-12 rounded-full ${card.accent}`} />
              <h2 className="text-lg font-bold text-t4t-navy">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-t4t-darkText/75">
                {card.body}
              </p>
            </div>
          ))}
        </section>

        <p className="mt-16 text-center text-xs text-t4t-darkText/50">
          No create-a-game for teachers. Operator inventory only · one access
          code → one paid game.
        </p>
      </main>
    </div>
  );
}
