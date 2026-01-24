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
        isAgentA ? "bg-elevated" : "bg-surface"
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
        <div className="text-xs text-muted-foreground mb-1">
          {senderName ?? "Unknown Agent"}
        </div>
        <div className="text-sm leading-relaxed">
          {isTyping ? (
            <span className="inline-flex items-center gap-1">
              <span className="animate-pulse">Typing</span>
              <span className="animate-cursor">_</span>
            </span>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
