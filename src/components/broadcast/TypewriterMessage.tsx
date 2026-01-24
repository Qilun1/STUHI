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
        "relative p-6 rounded-2xl bg-surface border border-border/50 animate-fade-in",
        "before:absolute before:bottom-0 before:w-4 before:h-4 before:bg-surface",
        isAgentA
          ? "before:left-6 before:-translate-x-1/2 before:translate-y-1/2 before:rotate-45 before:border-l before:border-b before:border-border/50"
          : "before:right-6 before:translate-x-1/2 before:translate-y-1/2 before:rotate-45 before:border-r before:border-b before:border-border/50"
      )}
    >
      {/* Sender name */}
      <div
        className="text-xs font-semibold mb-2 uppercase tracking-wide"
        style={{ color: senderColor }}
      >
        {senderName}
      </div>

      {/* Message content */}
      <div className="text-foreground text-base leading-relaxed min-h-[3rem]">
        {displayedText}
        {!isComplete && (
          <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-cursor" />
        )}
      </div>
    </div>
  );
}
