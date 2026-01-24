import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  HandFist,
  Handshake,
  Lightning,
  ClipboardText,
  HeartBreak,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface NegotiationViewProps {
  negotiationId: Id<"negotiations">;
  scenarioId: Id<"scenarios">;
  onComplete: () => void;
  onBack: () => void;
}

const MOVE_TYPE_COLORS: Record<string, string> = {
  offer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  counteroffer: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concession: "bg-green-500/20 text-green-400 border-green-500/30",
  demand: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  threat: "bg-red-500/20 text-red-400 border-red-500/30",
  accept: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  walkaway: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const TONE_ICONS: Record<string, ReactNode> = {
  firm: <HandFist className="size-3.5 text-amber-400" weight="duotone" />,
  conciliatory: <Handshake className="size-3.5 text-green-400" weight="duotone" />,
  aggressive: <Lightning className="size-3.5 text-red-400" weight="duotone" />,
  neutral: <ClipboardText className="size-3.5 text-zinc-400" weight="duotone" />,
};

export function NegotiationView({
  negotiationId,
  scenarioId,
  onComplete,
  onBack,
}: NegotiationViewProps) {
  const negotiation = useQuery(api.negotiations.queries.get, {
    id: negotiationId,
  });
  const moves = useQuery(api.negotiations.queries.getMoves, { negotiationId });
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [visibleMoves, setVisibleMoves] = useState(0);

  // Auto-scroll to bottom when new moves appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMoves]);

  // Animate moves appearing one by one
  useEffect(() => {
    if (!moves || moves.length === 0) {
      setVisibleMoves(0);
      return;
    }

    if (visibleMoves < moves.length) {
      const timer = setTimeout(() => {
        setVisibleMoves((prev) => Math.min(prev + 1, moves.length));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [moves, visibleMoves]);

  if (!negotiation || !scenario) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="text-zinc-500">Loading negotiation...</div>
      </div>
    );
  }

  const partyA = scenario.parties[0];
  const partyB = scenario.parties[1];
  const isResolved =
    negotiation.phase === "resolved" || negotiation.phase === "failed";

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to config
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Party A */}
            <div className="text-center">
              <div className="text-sm font-bold text-white">{partyA?.name}</div>
              <div className="text-xs text-blue-400">
                {negotiation.partyAStrategy}
              </div>
            </div>

            {/* VS */}
            <div className="text-zinc-600 font-bold">VS</div>

            {/* Party B */}
            <div className="text-center">
              <div className="text-sm font-bold text-white">{partyB?.name}</div>
              <div className="text-xs text-green-400">
                {negotiation.partyBStrategy}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-right">
            <div
              className={`text-xs px-2 py-1 rounded ${
                isResolved
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-blue-500/20 text-blue-400 animate-pulse"
              }`}
            >
              {negotiation.phase.toUpperCase()}
            </div>
            <div className="text-xs text-zinc-600 mt-1">
              Turn {negotiation.currentTurn} / {negotiation.maxTurns}
            </div>
          </div>
        </div>
      </div>

      {/* Moves Timeline */}
      <div className="bg-zinc-900 rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto mb-6">
        {moves && moves.length > 0 ? (
          <div className="space-y-4">
            {moves.slice(0, visibleMoves).map((move, i) => {
              const isPartyA = move.party === partyA?.name;
              const moveTypeClass =
                MOVE_TYPE_COLORS[move.moveType] ||
                "bg-zinc-700/20 text-zinc-400";

              return (
                <div
                  key={i}
                  className={`flex ${isPartyA ? "justify-start" : "justify-end"} animate-fade-in`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-4 ${
                      isPartyA
                        ? "bg-blue-950/30 border border-blue-900/30"
                        : "bg-green-950/30 border border-green-900/30"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-medium ${isPartyA ? "text-blue-400" : "text-green-400"}`}
                      >
                        {move.party}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${moveTypeClass}`}
                      >
                        {move.moveType}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {move.tacticUsed}
                      </span>
                      <span className="flex items-center">
                        {TONE_ICONS[move.emotionalTone] || <ClipboardText className="size-3.5 text-zinc-400" weight="duotone" />}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-white text-sm leading-relaxed">
                      {move.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {!isResolved && visibleMoves === moves.length && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" />
                  <span>Generating response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-500">
              <Handshake className="size-12 mx-auto mb-2 text-cyan-400/50" weight="duotone" />
              <p>Negotiation starting...</p>
            </div>
          </div>
        )}
      </div>

      {/* Outcome Card */}
      {isResolved && negotiation.outcome && (
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 animate-fade-in">
          <div className="text-center mb-6">
            <div className="mb-2">
              {negotiation.outcome.type === "deal" ? (
                <Handshake className="size-12 mx-auto text-green-400" weight="duotone" />
              ) : (
                <HeartBreak className="size-12 mx-auto text-red-400" weight="duotone" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {negotiation.outcome.type === "deal"
                ? "Deal Reached!"
                : negotiation.outcome.type === "walkaway"
                  ? "Negotiations Ended"
                  : "Negotiation Stalled"}
            </h3>
            <p className="text-zinc-400">{negotiation.outcome.description}</p>
          </div>

          {negotiation.outcome.finalOffer && (
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">
                Final Terms
              </h4>
              <p className="text-sm text-zinc-300">
                {negotiation.outcome.finalOffer}
              </p>
            </div>
          )}

          {/* Scores */}
          <div className="flex justify-center gap-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">
                {negotiation.outcome.partyAScore}
              </div>
              <div className="text-sm text-zinc-500 mt-1">{partyA?.name}</div>
              <div className="text-xs text-zinc-600">
                {negotiation.partyAStrategy}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">
                {negotiation.outcome.partyBScore}
              </div>
              <div className="text-sm text-zinc-500 mt-1">{partyB?.name}</div>
              <div className="text-xs text-zinc-600">
                {negotiation.partyBStrategy}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onBack}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-lg text-white font-medium transition-colors"
            >
              Try Different Strategies
            </button>
            <button
              onClick={onComplete}
              className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-white font-medium transition-colors"
            >
              View Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
