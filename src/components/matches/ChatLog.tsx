import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";

interface Message {
  _id: string;
  content: string;
  senderName?: string;
  senderBadge?: string;
  senderColor?: string;
  senderType?: string;
  isAgentA: boolean;
  messageNumber: number;
}

interface ChatLogProps {
  messages: Message[];
  visibleCount?: number; // For reenactment mode - how many messages to show
  isTyping?: boolean;
  autoScroll?: boolean;
}

export function ChatLog({
  messages,
  visibleCount,
  isTyping = false,
  autoScroll = true,
}: ChatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, visibleCount, autoScroll]);

  const displayMessages =
    visibleCount !== undefined ? messages.slice(0, visibleCount) : messages;

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        No messages yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto rounded-xl border border-zinc-800/50 divide-y divide-zinc-800/50"
    >
      {displayMessages.map((message) => (
        <ChatMessage
          key={message._id}
          senderName={message.senderName}
          senderBadge={message.senderBadge}
          senderColor={message.senderColor}
          senderType={message.senderType}
          content={message.content}
          isAgentA={message.isAgentA}
          isVisible={true}
          isTyping={false}
        />
      ))}

      {/* Show typing indicator for next message */}
      {isTyping && visibleCount !== undefined && visibleCount < messages.length && (
        <ChatMessage
          senderName={messages[visibleCount]?.senderName}
          senderBadge={messages[visibleCount]?.senderBadge}
          senderType={messages[visibleCount]?.senderType}
          content=""
          isAgentA={messages[visibleCount]?.isAgentA ?? false}
          isTyping={true}
        />
      )}
    </div>
  );
}
