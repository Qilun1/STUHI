import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TypewriterMessageProps {
  content: string;
  senderName: string;
  senderColor: string;
  isAgentA: boolean;
  typingSpeed?: number;
}

export function TypewriterMessage({
  content,
  senderName,
  senderColor,
  isAgentA,
  typingSpeed = 30,
}: TypewriterMessageProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);

    let index = 0;
    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedText(content.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [content, typingSpeed]);

  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 animate-fade-in shadow-card",
        isAgentA ? "border-l-2" : "border-r-2"
      )}
      style={{
        borderLeftColor: isAgentA ? senderColor : undefined,
        borderRightColor: !isAgentA ? senderColor : undefined,
      }}
    >
      {/* Sender name */}
      <div
        className="text-xs font-semibold mb-2 tracking-wide"
        style={{ color: senderColor }}
      >
        {senderName}
      </div>

      {/* Message content */}
      <div className="text-zinc-200 text-base leading-relaxed min-h-[3rem]">
        {displayedText}
        {!isComplete && (
          <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-cursor" />
        )}
      </div>
    </div>
  );
}
