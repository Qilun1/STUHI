import { useRef, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        className="w-20"
      >
        {status === "loading" && "GEN..."}
        {status === "playing" && "PLAYING"}
        {status === "idle" && (audioUrl ? "PLAY" : "VOICE")}
        {status === "error" && "RETRY"}
      </Button>

      {/* Error message */}
      {error && (
        <span className="text-xs text-steal truncate max-w-[150px]">
          {error}
        </span>
      )}

      {/* Status indicator */}
      {status === "playing" && (
        <div className="flex items-center gap-1">
          <span className="w-1 h-3 bg-split animate-pulse" />
          <span className="w-1 h-4 bg-split animate-pulse delay-75" />
          <span className="w-1 h-2 bg-split animate-pulse delay-150" />
        </div>
      )}
    </div>
  );
}
