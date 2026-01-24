import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";

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
        // Already initialized, just reset
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
      // Trigger first round
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
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          onClick={handleSetup}
          variant="outline"
          disabled={isSettingUp || simulationStatus === "running"}
        >
          {isSettingUp ? "SETTING UP..." : "SETUP"}
        </Button>
        {simulationStatus === "running" ? (
          <Button onClick={handlePause} variant="steal">
            PAUSE
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            variant="split"
            disabled={!hasAgents || isRunning}
          >
            {isRunning ? "STARTING..." : "START"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
