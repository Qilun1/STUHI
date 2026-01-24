import { useState, useRef, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

interface VoiceQAProps {
  agentId: Id<"agents">;
  agentName: string;
  agentBadge: string;
  agentColor: string;
  // Optional context
  gameId?: Id<"games">;
  opponentId?: Id<"agents">;
}

type QAState =
  | "idle"
  | "listening"
  | "transcribing"
  | "generating"
  | "speaking"
  | "error";

export function VoiceQA({
  agentId,
  agentName,
  agentBadge,
  agentColor,
  gameId,
  opponentId,
}: VoiceQAProps) {
  const [state, setState] = useState<QAState>("idle");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateQAResponse = useAction(api.agents.voiceQA.generateQAResponse);

  const {
    isListening,
    transcript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();

    audioRef.current.addEventListener("ended", () => {
      setState("idle");
    });

    audioRef.current.addEventListener("error", () => {
      setState("idle");
      setError("Audio playback failed");
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Update question as transcript changes (syncing external speech API state)
  useEffect(() => {
    if (transcript) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external API state
      setQuestion(transcript);
    }
  }, [transcript]);

  // Handle speech recognition errors (syncing external speech API state)
  useEffect(() => {
    if (speechError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external API state
      setState("error");
      setError(speechError);
    }
  }, [speechError]);

  const handleSendQuestion = useCallback(
    async (questionText: string) => {
      if (!questionText.trim()) {
        setState("idle");
        return;
      }

      setState("generating");
      setError(null);

      try {
        const result = await generateQAResponse({
          agentId,
          question: questionText,
          gameId,
          opponentId,
        });

        setResponse(result.response);

        if (result.audioUrl && audioRef.current) {
          setState("speaking");
          audioRef.current.src = result.audioUrl;
          await audioRef.current.play();
        } else {
          // No audio available, just show the text
          setState("idle");
        }
      } catch (err: any) {
        console.error("Q&A error:", err);
        setState("error");
        setError(err.message || "Failed to generate response");
      }
    },
    [agentId, gameId, opponentId, generateQAResponse]
  );

  // When listening stops with a transcript, send to LLM (responding to external API events)
  useEffect(() => {
    if (!isListening && transcript && state === "listening") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responding to external speech API event
      void handleSendQuestion(transcript);
    }
  }, [isListening, transcript, state, handleSendQuestion]);

  const handleStartListening = useCallback(() => {
    setError(null);
    setResponse("");
    resetTranscript();
    setState("listening");
    startListening();
  }, [startListening, resetTranscript]);

  const handleStopListening = useCallback(() => {
    stopListening();
    // The useEffect above will handle sending the question
  }, [stopListening]);

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (question.trim()) {
        void handleSendQuestion(question);
      }
    },
    [question, handleSendQuestion]
  );

  const handleReset = useCallback(() => {
    setState("idle");
    setQuestion("");
    setResponse("");
    setError(null);
    resetTranscript();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [resetTranscript]);

  const getStateLabel = () => {
    switch (state) {
      case "listening":
        return "Listening...";
      case "transcribing":
        return "Transcribing...";
      case "generating":
        return `${agentName} is thinking...`;
      case "speaking":
        return `${agentName} is responding...`;
      case "error":
        return "Error";
      default:
        return `Ask ${agentName}`;
    }
  };

  return (
    <div className="border border-white/10 rounded-lg bg-black/40 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: `${agentColor}10` }}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              state === "listening" && "animate-pulse",
              state === "speaking" && "animate-pulse"
            )}
            style={{
              backgroundColor:
                state === "listening"
                  ? "#ef4444"
                  : state === "speaking"
                    ? "#22c55e"
                    : state === "generating"
                      ? "#f59e0b"
                      : "#6b7280",
            }}
          />
          <span className="text-white/80 text-sm font-medium">
            {getStateLabel()}
          </span>
        </div>
        {state !== "idle" && (
          <button
            onClick={handleReset}
            className="text-white/40 hover:text-white/80 text-xs"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Microphone Button - Primary Action */}
        {(state === "idle" || state === "error") && isSupported && (
          <button
            onClick={handleStartListening}
            className={cn(
              "w-full py-4 rounded-lg border-2 border-dashed transition-all",
              "flex flex-col items-center justify-center gap-2",
              "hover:bg-white/5 hover:border-white/30",
              state === "error"
                ? "border-red-500/50 bg-red-500/10"
                : "border-white/20 bg-white/5"
            )}
          >
            {/* Microphone Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                "bg-white/10 hover:bg-white/20 transition-colors"
              )}
            >
              <svg
                className="w-6 h-6 text-white/80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <span className="text-white/60 text-sm">
              Click to ask {agentName} a question
            </span>
          </button>
        )}

        {/* Listening State - Show waveform and stop button */}
        {state === "listening" && (
          <div className="space-y-4">
            {/* Recording Indicator */}
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="relative flex items-center gap-1">
                {/* Animated waveform bars - fixed heights for each bar */}
                {[16, 24, 12, 28, 20].map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
                <div className="ml-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-medium">Recording</span>
                </div>
              </div>
            </div>

            {/* Live Transcript */}
            {transcript && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-white/80 text-sm italic">"{transcript}"</p>
              </div>
            )}

            {/* Stop Button */}
            <button
              onClick={handleStopListening}
              className={cn(
                "w-full py-3 rounded-lg transition-all",
                "bg-red-500 hover:bg-red-600 text-white font-medium",
                "flex items-center justify-center gap-2"
              )}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Recording
            </button>
          </div>
        )}

        {/* Generating State */}
        {state === "generating" && (
          <div className="py-6 text-center">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
              <div
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <p className="text-white/60 text-sm mt-3">
              {agentName} is formulating a response...
            </p>
            {question && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-white/50 text-xs uppercase mb-1">
                  Your question:
                </p>
                <p className="text-white/80 text-sm">"{question}"</p>
              </div>
            )}
          </div>
        )}

        {/* Speaking/Response State */}
        {(state === "speaking" || (state === "idle" && response)) && response && (
          <div className="space-y-4">
            {/* Question */}
            {question && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-white/50 text-xs uppercase mb-1">You asked:</p>
                <p className="text-white/80 text-sm">"{question}"</p>
              </div>
            )}

            {/* Response */}
            <div
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: `${agentColor}10`,
                borderColor: `${agentColor}40`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${agentColor}30`,
                    color: agentColor,
                  }}
                >
                  {agentBadge}
                </span>
                <span className="text-white/80 text-sm font-medium">
                  {agentName}
                </span>
                {state === "speaking" && (
                  <div className="ml-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-xs">Speaking</span>
                  </div>
                )}
              </div>
              <p className="text-white/90 leading-relaxed">{response}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Not Supported Warning */}
        {!isSupported && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
            <p className="text-amber-400 text-sm mb-2">
              Voice input not supported in this browser
            </p>
            <p className="text-white/50 text-xs">
              Try Chrome, Edge, or Safari for voice input
            </p>
          </div>
        )}

        {/* Text Input Fallback */}
        {(state === "idle" || state === "error") && (
          <form onSubmit={handleTextSubmit} className="mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Type a question for ${agentName}...`}
                className={cn(
                  "flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2",
                  "text-white placeholder-white/40 text-sm",
                  "focus:outline-none focus:border-white/30"
                )}
              />
              <button
                type="submit"
                disabled={!question.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  question.trim()
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                Ask
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
