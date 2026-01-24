import { useRef, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, SpeakerHigh, CircleNotch, ArrowCounterClockwise } from "@phosphor-icons/react";
import type { Id } from "../../../convex/_generated/dataModel";

interface VoicePlayerProps {
  messageId: Id<"messages">;
  autoPlay?: boolean;
  onEnd?: () => void;
  onStart?: () => void;
  className?: string;
}

type VoiceStatus = "idle" | "loading" | "playing" | "error";

export function VoicePlayer({
  messageId,
  autoPlay = false,
  onEnd,
  onStart,
  className,
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateVoice = useAction(api.simulation.voice.generateVoice);

  // Generate audio on demand
  const handleGenerate = async () => {
    setStatus("loading");
    setError(null);

    try {
      const result = await generateVoice({ messageId });
      if (result.audioUrl) {
        setAudioUrl(result.audioUrl);
        setStatus("idle");
      } else {
        throw new Error("No audio URL returned");
      }
    } catch (err) {
      console.error("Voice generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate voice");
      setStatus("error");
    }
  };

  // Auto-generate and play if enabled
  useEffect(() => {
    if (autoPlay && !audioUrl && status === "idle") {
      handleGenerate();
    }
  }, [autoPlay, audioUrl, status]);

  // Play audio when URL is ready and autoPlay is enabled
  useEffect(() => {
    if (audioUrl && audioRef.current && autoPlay) {
      audioRef.current.play().catch(console.error);
    }
  }, [audioUrl, autoPlay]);

  const handlePlay = () => {
    if (!audioUrl) {
      handleGenerate();
      return;
    }

    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleAudioPlay = () => {
    setStatus("playing");
    onStart?.();
  };

  const handleAudioEnd = () => {
    setStatus("idle");
    onEnd?.();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={handleAudioPlay}
          onEnded={handleAudioEnd}
          onError={() => setStatus("error")}
        />
      )}

      {/* Play button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePlay}
        disabled={status === "loading" || status === "playing"}
        className="gap-1.5"
      >
        {status === "loading" && (
          <CircleNotch className="size-4 animate-spin" />
        )}
        {status === "playing" && (
          <SpeakerHigh className="size-4 text-cyan-400" weight="fill" />
        )}
        {status === "idle" && !audioUrl && (
          <SpeakerHigh className="size-4" weight="duotone" />
        )}
        {status === "idle" && audioUrl && (
          <Play className="size-4" weight="fill" />
        )}
        {status === "error" && (
          <ArrowCounterClockwise className="size-4" />
        )}
        {status === "loading" && "Generating..."}
        {status === "playing" && "Playing"}
        {status === "idle" && (audioUrl ? "Play" : "Voice")}
        {status === "error" && "Retry"}
      </Button>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-400 truncate max-w-[150px]">
          {error}
        </span>
      )}

      {/* Status indicator */}
      {status === "playing" && (
        <div className="flex items-center gap-0.5">
          <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" />
          <span className="w-0.5 h-4 bg-cyan-400 rounded-full animate-pulse delay-75" />
          <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-pulse delay-150" />
        </div>
      )}
    </div>
  );
}
