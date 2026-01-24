import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, GearSix, CircleNotch } from "@phosphor-icons/react";

interface ControlPanelProps {
  simulationStatus?: "running" | "paused" | "stopped";
  hasAgents: boolean;
}

export function ControlPanel({ simulationStatus, hasAgents }: ControlPanelProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const initializeSimulation = useMutation(api.simulation.state.initialize);
  const createAllAgents = useMutation(api.agents.mutations.createAll);
  const startSimulation = useMutation(api.simulation.state.start);
  const pauseSimulation = useMutation(api.simulation.state.pause);
  const resetAgents = useMutation(api.agents.mutations.resetAll);
  const resetSimulation = useMutation(api.simulation.state.reset);
  const runRound = useAction(api.simulation.orchestrator.runRound);

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

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSetup}
        disabled={isSettingUp || simulationStatus === "running"}
      >
        {isSettingUp ? (
          <CircleNotch className="size-4 animate-spin" />
        ) : (
          <GearSix className="size-4" weight="duotone" />
        )}
        Setup
      </Button>

      {simulationStatus === "running" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePause}
        >
          <Pause className="size-4" weight="fill" />
          Pause
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleStart}
          disabled={!hasAgents || isRunning}
        >
          {isRunning ? (
            <CircleNotch className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" weight="fill" />
          )}
          Start
        </Button>
      )}
    </div>
  );
}
