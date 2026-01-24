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
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        Loading data...
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
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
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="round"
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={{ stroke: "#27272a" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={{ stroke: "#27272a" }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(17, 17, 19, 0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "#71717a", marginBottom: 4 }}
            itemStyle={{ color: "#fafafa" }}
            formatter={(value, name) => {
              if (name === "cooperation") return [`${value}%`, "Cooperation"];
              return [String(value), "Betrayals"];
            }}
          />
          <Area
            type="monotone"
            dataKey="cooperation"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#cooperationGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
