import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function CooperationChart() {
  const timeline = useQuery(api.agents.queries.cooperationTimeline, {
    limit: 20,
  });

  if (!timeline) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading data...
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No rounds completed yet
      </div>
    );
  }

  // Format data for chart
  const data = timeline.map((t) => ({
    round: t.round,
    cooperation: Math.round(t.cooperationRate * 100),
    betrayals: t.betrayalCount,
  }));

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cooperationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff88" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="round"
            tick={{ fill: "#666", fontSize: 10 }}
            axisLine={{ stroke: "#333" }}
            tickLine={{ stroke: "#333" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#666", fontSize: 10 }}
            axisLine={{ stroke: "#333" }}
            tickLine={{ stroke: "#333" }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#141414",
              border: "2px solid #333",
              borderRadius: 0,
              fontFamily: "JetBrains Mono",
              fontSize: 12,
            }}
            labelStyle={{ color: "#999" }}
            formatter={(value, name) => {
              if (name === "cooperation") return [`${value}%`, "Cooperation"];
              return [String(value), "Betrayals"];
            }}
          />
          <Area
            type="monotone"
            dataKey="cooperation"
            stroke="#00ff88"
            strokeWidth={2}
            fill="url(#cooperationGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
