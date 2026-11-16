"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleVote } from "./actions";

export function VoteButton({ ideaId, votes, voted, disabled }: { ideaId: string; votes: number; voted: boolean; disabled?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic({ votes, voted }, (s) => ({ voted: !s.voted, votes: s.votes + (s.voted ? -1 : 1) }));
  const [, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setOptimistic(null);
          await toggleVote(fd);
        })
      }
    >
      <input type="hidden" name="ideaId" value={ideaId} />
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={optimistic.voted}
        aria-label={optimistic.voted ? "Quitar mi voto" : "Votar esta sugerencia"}
        className={cn(
          "flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-sm font-semibold transition-colors",
          optimistic.voted ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        )}
      >
        <ChevronUp className="size-4" />
        {optimistic.votes}
      </button>
    </form>
  );
}
