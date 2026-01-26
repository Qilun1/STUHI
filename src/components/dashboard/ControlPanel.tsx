import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  simulationStatus?: "running" | "paused" | "stopped";
  hasAgents: boolean;
  maxRounds?: number | null;
  roundsThisSession?: number;
}

export function ControlPanel({ simulationStatus, hasAgents, maxRounds, roundsThisSession }: ControlPanelProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const initializeSimulation = useMutation(api.simulation.state.initialize);
  const createAllAgents = useMutation(api.agents.mutations.createAll);
  const startSimulation = useMutation(api.simulation.state.start);
  const pauseSimulation = useMutation(api.simulation.state.pause);
  const resetAgents = useMutation(api.agents.mutations.resetAll);
  const resetSimulation = useMutation(api.simulation.state.reset);
  const runRound = useAction(api.simulation.orchestrator.runRound);
  const setMaxRounds = useMutation(api.simulation.state.setMaxRounds);

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      await resetAgents();
      await createAllAgents();
      try {
        await initializeSimulation({});
      } catch {
        await resetSimulation();
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleStart = async () => {
    setIsRunning(true);
    try {
      await startSimulation();
      await runRound({});
    } catch (error) {
      console.error("Failed to start simulation:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePause = async () => {
    await pauseSimulation();
  };

  const roundLimitOptions = [25, 50, 100, 250, 500];

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSetup}
        disabled={isSettingUp || simulationStatus === "running"}
        className={cn(
          "px-3 py-1.5 text-xs font-medium border border-white/20 rounded",
          "hover:bg-white/10 transition-colors",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        )}
      >
        {isSettingUp ? "..." : "Setup"}
      </button>

      {simulationStatus === "running" ? (
        <button
          onClick={handlePause}
          className="px-3 py-1.5 text-xs font-medium bg-white text-black rounded hover:bg-white/90 transition-colors"
        >
          Pause
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={!hasAgents || isRunning}
          className={cn(
            "px-3 py-1.5 text-xs font-medium bg-white text-black rounded",
            "hover:bg-white/90 transition-colors",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          {isRunning ? "..." : "Start"}
        </button>
      )}

      <div className="flex items-center gap-2 text-xs text-white/60">
        <span>Limit:</span>
        <select
          value={maxRounds ?? ""}
          onChange={(e) => setMaxRounds({ maxRounds: e.target.value ? Number(e.target.value) : null })}
          disabled={simulationStatus === "running"}
          className="bg-transparent border border-white/20 rounded px-2 py-1 text-xs disabled:opacity-30"
        >
          {roundLimitOptions.map((n) => (
            <option key={n} value={n} className="bg-black">{n} rounds</option>
          ))}
        </select>
        {roundsThisSession !== undefined && maxRounds && (
          <span className="text-white/40">({roundsThisSession}/{maxRounds})</span>
        )}
      </div>
    </div>
  );
}
