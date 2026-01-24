import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  senderName?: string;
  senderBadge?: string;
  senderColor?: string;
  senderType?: string;
  content: string;
  isAgentA: boolean;
  isVisible?: boolean;
  isTyping?: boolean;
}

export function ChatMessage({
  senderName,
  senderBadge,
  senderType,
  content,
  isAgentA,
  isVisible = true,
  isTyping = false,
}: ChatMessageProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "flex gap-3 p-3 transition-all duration-300",
        isAgentA ? "bg-zinc-800/30" : "bg-zinc-900/50"
      )}
    >
      {/* Agent Badge */}
      <div className="shrink-0">
        <Badge
          variant={(senderType as "diplomat") ?? "outline"}
          className="font-mono text-xs"
        >
          {senderBadge ?? "???"}
        </Badge>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-500 mb-1">
          {senderName ?? "Unknown Agent"}
        </div>
        <div className="text-sm leading-relaxed text-zinc-200">
          {isTyping ? (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <span className="animate-pulse">Typing</span>
              <span className="w-0.5 h-3.5 bg-cyan-400 animate-cursor" />
            </span>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
