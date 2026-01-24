import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reenactment } from "./Reenactment";
import type { Id } from "../../../convex/_generated/dataModel";

interface MatchDialogProps {
  gameId: Id<"games"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchDialog({ gameId, open, onOpenChange }: MatchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Match Reenactment</DialogTitle>
        </DialogHeader>
        {gameId && (
          <Reenactment
            gameId={gameId}
            autoPlay={true}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
