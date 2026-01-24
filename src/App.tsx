import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Dashboard components
import { ActiveMatches } from "@/components/dashboard/ActiveMatches";
import { ControlPanel } from "@/components/dashboard/ControlPanel";

// Match components
import { MatchDialog } from "@/components/matches/MatchDialog";

// Visualization components
import { TrustNetwork } from "@/components/visualization/TrustNetwork";
import { CooperationChart } from "@/components/visualization/CooperationChart";

import type { Id } from "../convex/_generated/dataModel";

export default function App() {
  const simulationState = useQuery(api.simulation.state.get);
  const agents = useQuery(api.agents.queries.list);

  // Match dialog state
  const [selectedGameId, setSelectedGameId] = useState<Id<"games"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectGame = (gameId: Id<"games">) => {
    setSelectedGameId(gameId);
    setDialogOpen(true);
  };

  const currentRound = simulationState?.currentRound ?? 0;

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
              ROUND {currentRound}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-120px)]">
          {/* Left Column - Leaderboard & Controls */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto h-[calc(100%-60px)]">
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
                          variant={agent.type as "diplomat"}
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
            <ControlPanel
              simulationStatus={simulationState?.status}
              hasAgents={!!agents && agents.length > 0}
            />
          </div>

          {/* Right Column - Active Matches & Visualizations */}
          <div className="flex flex-col gap-4">
            {/* Active Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Matches</span>
                  {currentRound > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      Round {currentRound}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentRound > 0 ? (
                  <ActiveMatches
                    roundNumber={currentRound}
                    onSelectGame={handleSelectGame}
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    Start simulation to see matches
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Row - Visualizations */}
            <div className="grid grid-cols-2 gap-4 flex-1">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Trust Network</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)]">
                  <TrustNetwork />
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Cooperation Timeline</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)]">
                  <CooperationChart />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Match Reenactment Dialog */}
      <MatchDialog
        gameId={selectedGameId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
