import { useState, useRef, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface VoiceQueueItem {
  messageId: Id<"messages">;
  status: "pending" | "generating" | "playing" | "done" | "error";
}

interface UseVoiceQueueReturn {
  isMuted: boolean;
  isPlaying: boolean;
  currentMessageId: Id<"messages"> | null;
  toggleMute: () => void;
  queueMessage: (messageId: Id<"messages">) => void;
  playMessage: (messageId: Id<"messages">) => Promise<void>;
  playAllMessages: (messageIds: Id<"messages">[]) => void;
  clearQueue: () => void;
}

export function useVoiceQueue(): UseVoiceQueueReturn {
  const [isMuted, setIsMuted] = useState(() => {
    // Persist mute state in localStorage
    const saved = localStorage.getItem("stuhi-voice-muted");
    return saved === "true";
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<Id<"messages"> | null>(null);

  const queueRef = useRef<VoiceQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const processNextRef = useRef<() => void>(() => {});

  const generateVoice = useAction(api.simulation.voice.generateVoice);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        console.log("[VoiceQueue] Audio ended, processing next...");
        // Mark current item as done
        const currentItem = queueRef.current.find(item => item.status === "playing");
        if (currentItem) {
          currentItem.status = "done";
        }
        isProcessingRef.current = false;
        setIsPlaying(false);
        setCurrentMessageId(null);
        // Use ref to call latest version
        processNextRef.current();
      });
      audioRef.current.addEventListener("error", (e) => {
        console.error("[VoiceQueue] Audio playback error:", e);
        // Mark current item as error
        const currentItem = queueRef.current.find(item => item.status === "playing" || item.status === "generating");
        if (currentItem) {
          currentItem.status = "error";
        }
        isProcessingRef.current = false;
        setIsPlaying(false);
        setCurrentMessageId(null);
        // Continue to next item despite error
        processNextRef.current();
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Process queue
  const processNextInQueue = useCallback(async () => {
    console.log("[VoiceQueue] processNextInQueue called, isProcessing:", isProcessingRef.current, "isMuted:", isMuted);
    console.log("[VoiceQueue] Queue state:", queueRef.current.map(i => ({ id: i.messageId.slice(-4), status: i.status })));

    if (isProcessingRef.current) {
      console.log("[VoiceQueue] Already processing, skipping");
      return;
    }
    if (isMuted) {
      console.log("[VoiceQueue] Muted, skipping");
      return;
    }

    // Find next pending item
    const nextItem = queueRef.current.find(item => item.status === "pending");
    if (!nextItem) {
      console.log("[VoiceQueue] No pending items in queue");
      isProcessingRef.current = false;
      setIsPlaying(false);
      return;
    }

    console.log("[VoiceQueue] Processing message:", nextItem.messageId.slice(-8));
    isProcessingRef.current = true;
    nextItem.status = "generating";
    setCurrentMessageId(nextItem.messageId);

    try {
      // Check cache first
      let audioUrl = audioUrlCacheRef.current.get(nextItem.messageId);

      if (!audioUrl) {
        console.log("[VoiceQueue] Generating voice for message...");
        const result = await generateVoice({ messageId: nextItem.messageId });
        audioUrl = result.audioUrl ?? undefined;
        if (audioUrl) {
          audioUrlCacheRef.current.set(nextItem.messageId, audioUrl);
        }
      } else {
        console.log("[VoiceQueue] Using cached audio");
      }

      if (audioUrl && audioRef.current && !isMuted) {
        console.log("[VoiceQueue] Playing audio...");
        nextItem.status = "playing";
        setIsPlaying(true);
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        // Note: isProcessingRef stays true until "ended" event
      } else {
        console.log("[VoiceQueue] No audio URL or muted, marking done");
        nextItem.status = "done";
        isProcessingRef.current = false;
        // Use setTimeout to avoid potential stack overflow
        setTimeout(() => processNextRef.current(), 50);
      }
    } catch (err) {
      console.error("[VoiceQueue] Voice generation failed:", err);
      nextItem.status = "error";
      isProcessingRef.current = false;
      // Continue to next item despite error
      setTimeout(() => processNextRef.current(), 50);
    }
  }, [generateVoice, isMuted]);

  // Keep the ref updated with the latest function
  useEffect(() => {
    processNextRef.current = processNextInQueue;
  }, [processNextInQueue]);

  // Queue a message for playback
  const queueMessage = useCallback((messageId: Id<"messages">) => {
    // Don't queue if already in queue
    if (queueRef.current.some(item => item.messageId === messageId)) {
      return;
    }

    queueRef.current.push({
      messageId,
      status: "pending"
    });

    // Start processing if not already
    if (!isProcessingRef.current && !isMuted) {
      processNextInQueue();
    }
  }, [processNextInQueue, isMuted]);

  // Play a single message immediately (manual trigger)
  const playMessage = useCallback(async (messageId: Id<"messages">) => {
    if (isMuted) return;

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentMessageId(messageId);
    setIsPlaying(false);

    try {
      // Check cache first
      let audioUrl = audioUrlCacheRef.current.get(messageId);

      if (!audioUrl) {
        const result = await generateVoice({ messageId });
        audioUrl = result.audioUrl ?? undefined;
        if (audioUrl) {
          audioUrlCacheRef.current.set(messageId, audioUrl);
        }
      }

      if (audioUrl && audioRef.current) {
        setIsPlaying(true);
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Voice playback failed:", err);
      setIsPlaying(false);
      setCurrentMessageId(null);
    }
  }, [generateVoice, isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      localStorage.setItem("stuhi-voice-muted", String(newValue));

      // If muting, stop current playback
      if (newValue && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setCurrentMessageId(null);
      }

      // If unmuting and queue has items, start processing
      if (!newValue && queueRef.current.some(item => item.status === "pending")) {
        setTimeout(() => processNextInQueue(), 100);
      }

      return newValue;
    });
  }, [processNextInQueue]);

  // Clear queue (e.g., when changing games)
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    isProcessingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentMessageId(null);
  }, []);

  // Play all messages in sequence (clears existing queue first)
  const playAllMessages = useCallback((messageIds: Id<"messages">[]) => {
    console.log("[VoiceQueue] playAllMessages called with", messageIds.length, "messages");

    // Clear existing queue and stop current playback
    queueRef.current = [];
    isProcessingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentMessageId(null);

    if (isMuted) {
      console.log("[VoiceQueue] Muted, not playing");
      return;
    }
    if (messageIds.length === 0) {
      console.log("[VoiceQueue] No messages to play");
      return;
    }

    // Queue all messages
    messageIds.forEach(messageId => {
      queueRef.current.push({
        messageId,
        status: "pending"
      });
    });

    console.log("[VoiceQueue] Queued", queueRef.current.length, "messages, starting playback...");

    // Start processing using the ref
    setTimeout(() => processNextRef.current(), 100);
  }, [isMuted]);

  return {
    isMuted,
    isPlaying,
    currentMessageId,
    toggleMute,
    queueMessage,
    playMessage,
    playAllMessages,
    clearQueue
  };
}
