import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function App() {
  const simulationState = useQuery(api.simulation.state.get);
  const agents = useQuery(api.agents.queries.list);

  const initializeSimulation = useMutation(api.simulation.state.initialize);
  const createAllAgents = useMutation(api.agents.mutations.createAll);
  const startSimulation = useMutation(api.simulation.state.start);
  const pauseSimulation = useMutation(api.simulation.state.pause);
  const resetAgents = useMutation(api.agents.mutations.resetAll);
  const resetSimulation = useMutation(api.simulation.state.reset);

  const handleSetup = async () => {
    await resetAgents();
    await createAllAgents();
    try {
      await initializeSimulation({});
    } catch {
      // Already initialized, just reset
      await resetSimulation();
    }
  };

  return (
    <div className="min-h-screen bg-void text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border bg-surface p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl font-bold uppercase tracking-wider text-split">
              STUHI
            </h1>
            <span className="text-muted-foreground text-sm">
              The Trust Arena
            </span>
          </div>
          <div className="flex items-center gap-4">
            {simulationState && (
              <Badge
                variant={
                  simulationState.status === "running" ? "split" : "outline"
                }
              >
                {simulationState.status.toUpperCase()}
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              ROUND {simulationState?.currentRound ?? 0}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-120px)]">
          {/* Left Column - Leaderboard */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                {agents === undefined ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 bg-elevated" />
                    ))}
                  </div>
                ) : agents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No agents yet. Click Setup to create agents.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {agents.map((agent, index) => (
                      <div
                        key={agent._id}
                        className="flex items-center gap-2 p-2 bg-elevated border border-border"
                      >
                        <span className="text-muted-foreground w-6 text-right">
                          {index + 1}.
                        </span>
                        <Badge
                          variant={agent.type as keyof typeof Badge}
                          className="font-mono"
                        >
                          {agent.badge}
                        </Badge>
                        <span className="flex-1 truncate text-sm">
                          {agent.name}
                        </span>
                        <span className="text-split font-bold">
                          {agent.totalScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button onClick={handleSetup} variant="outline">
                  SETUP
                </Button>
                {simulationState?.status === "running" ? (
                  <Button onClick={() => pauseSimulation()} variant="steal">
                    PAUSE
                  </Button>
                ) : (
                  <Button
                    onClick={() => startSimulation()}
                    variant="split"
                    disabled={!simulationState || agents?.length === 0}
                  >
                    START
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Active Matches */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Active Matches</CardTitle>
              </CardHeader>
              <CardContent className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">
                  {simulationState?.status === "running"
                    ? "Matches will appear here during simulation..."
                    : "Start simulation to see matches"}
                </p>
              </CardContent>
            </Card>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Network</CardTitle>
                </CardHeader>
                <CardContent className="aspect-square flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Graph visualization
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cooperation Timeline</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    Sparkline chart
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
