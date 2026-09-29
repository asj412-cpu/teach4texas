"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function CategorySortPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (categoryId: string) => void;
}) {
  const category = view.category;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          Sort into Bins — wait for your teacher to start. ({view.players.length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!category || view.phase !== "binning") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for Sort into Bins to start…
      </div>
    );
  }

  const progress = category.item_total
    ? Math.min(category.item_index + 1, category.item_total) /
      category.item_total
    : 0;
  const binCount = category.categories?.length ?? 0;

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        Sort into Bins
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Item {Math.min(category.item_index + 1, category.item_total)}/
        {category.item_total} · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-t4t-green"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {category.completed && (
        <p className="mt-10 text-center text-xl font-bold text-t4t-green">
          You finished! Score {view.my_score}
        </p>
      )}

      {category.item_label && category.categories && (
        <>
          {category.prompt && (
            <p className="mx-auto mt-8 max-w-lg text-center text-base font-semibold text-t4t-darkText/80">
              {category.prompt}
            </p>
          )}
          <p className="mx-auto mt-3 max-w-lg text-center text-2xl font-extrabold text-t4t-navy">
            {category.item_label}
          </p>
          <div
            className={`mx-auto mt-8 grid max-w-md gap-3 ${
              binCount === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"
            }`}
          >
            {category.categories.map((bin) => (
              <button
                key={bin.id}
                type="button"
                disabled={submitting || !category.can_tap}
                onClick={() => onTap(bin.id)}
                className="min-h-20 rounded-xl border-2 border-t4t-navy/20 bg-white px-3 py-4 text-center text-base font-semibold text-t4t-navy active:bg-t4t-navy active:text-white disabled:opacity-70"
              >
                {bin.label}
              </button>
            ))}
          </div>
        </>
      )}

      {category.tapped && !category.completed && (
        <p className="mt-6 text-center text-sm text-t4t-navy">
          Locked in — wait for the next item.
        </p>
      )}
    </div>
  );
}
