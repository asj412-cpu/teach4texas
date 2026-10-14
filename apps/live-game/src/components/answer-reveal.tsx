"use client";

import { useEffect, useState } from "react";
import { CueOn } from "@/components/game-show";

/**
 * P3-D: projected answer reveal (TF-dash style). Teacher taps Reveal, or it opens itself once every
 * student has answered. Resets on each new item.
 */
export function AnswerReveal({
  itemKey,
  answer,
  allIn,
}: {
  itemKey: string;
  answer: string | null;
  allIn: boolean;
}) {
  const [shownFor, setShownFor] = useState<string | null>(null);
  useEffect(() => {
    if (allIn) setShownFor(itemKey);
  }, [allIn, itemKey]);
  if (!answer) return null;
  const shown = shownFor === itemKey;
  return (
    <div className="mt-4 flex justify-center" data-testid="answer-reveal">
      {shown ? (
        <>
          <CueOn k={`reveal-${itemKey}`} kind="reveal" />
          <p className="fb-correct rounded-2xl border-2 px-6 py-3 text-center text-2xl font-black text-white shadow-lg">
            ✓ Answer: {answer}
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShownFor(itemKey)}
          className="rounded-xl bg-amber-300 px-5 py-2 text-lg font-black text-t4t-navy shadow-lg"
        >
          Reveal answer
        </button>
      )}
    </div>
  );
}
