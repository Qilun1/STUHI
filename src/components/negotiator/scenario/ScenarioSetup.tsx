import { useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Mountains,
  Package,
  Globe,
  Lock,
  MagnifyingGlass,
  Brain,
  Lightning,
  CheckCircle,
  PushPin,
  CircleNotch,
  CaretDown,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

const PRESETS: Array<{
  id: string;
  label: string;
  query: string;
  icon: ReactNode;
}> = [
  {
    id: "greenland",
    label: "Greenland Purchase",
    query: "US purchasing Greenland from Denmark",
    icon: <Mountains className="size-6 text-cyan-400" weight="duotone" />,
  },
  {
    id: "trade",
    label: "US-China Trade War",
    query: "US China tariff trade negotiations",
    icon: <Package className="size-6 text-amber-400" weight="duotone" />,
  },
  {
    id: "climate",
    label: "Climate Agreement",
    query: "International climate emissions agreement negotiations",
    icon: <Globe className="size-6 text-green-400" weight="duotone" />,
  },
  {
    id: "hostage",
    label: "Hostage Exchange",
    query: "International hostage prisoner exchange negotiations",
    icon: <Lock className="size-6 text-red-400" weight="duotone" />,
  },
];


interface ScenarioSetupProps {
  onScenarioCreated: (id: Id<"scenarios">) => void;
}

export function ScenarioSetup({ onScenarioCreated }: ScenarioSetupProps) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [activeScenarioId, setActiveScenarioId] = useState<Id<"scenarios"> | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const createScenario = useAction(api.scenarios.actions.createFromTopic);

  // Poll for scenario status while loading
  const scenario = useQuery(
    api.scenarios.queries.get,
    activeScenarioId ? { id: activeScenarioId } : "skip"
  );

  // Check if scenario is ready
  useEffect(() => {
    if (scenario && scenario.status === "ready" && activeScenarioId) {
      onScenarioCreated(activeScenarioId);
    }
  }, [scenario, activeScenarioId, onScenarioCreated]);

  const handleCreate = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setLoadingMessage("Starting research...");

    try {
      // AI will automatically determine the relevant parties based on the topic
      const id = await createScenario({ topic: query });
      setActiveScenarioId(id);
    } catch (error) {
      console.error("Failed to create scenario:", error);
      setLoading(false);
      setLoadingMessage("");
    }
  };

  // Update loading message based on scenario status
  useEffect(() => {
    if (scenario && loading && scenario.statusMessage) {
      setLoadingMessage(scenario.statusMessage);
    }
  }, [scenario?.statusMessage, loading]);

  if (loading) {
    const activity = scenario?.researchActivity || [];
    const currentStep = activity.length > 0 ? activity[activity.length - 1] : null;

    // Get icon for activity type
    const getIcon = (type: string, isLatest: boolean = false) => {
      const iconClass = `size-4 ${isLatest ? "text-cyan-400" : "text-zinc-500"}`;
      switch (type) {
        case "search":
          return <MagnifyingGlass className={iconClass} weight="duotone" />;
        case "analyze":
          return <Brain className={iconClass} weight="duotone" />;
        case "generate":
          return <Lightning className={iconClass} weight="duotone" />;
        case "complete":
          return <CheckCircle className={`size-4 text-green-400`} weight="fill" />;
        default:
          return <PushPin className={iconClass} weight="duotone" />;
      }
    };

    return (
      <div className="max-w-lg mx-auto p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 mb-4">
            <div className="scale-150">
              {currentStep ? getIcon(currentStep.type, true) : <MagnifyingGlass className="size-6 text-cyan-400 animate-pulse" weight="duotone" />}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            Researching Scenario
          </h2>
          <p className="text-zinc-500 text-sm">
            This may take 30-60 seconds...
          </p>
        </div>

        {/* Activity feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 max-h-96 overflow-y-auto">
          {activity.length === 0 ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <CircleNotch className="size-4 animate-spin" />
              <span>Initializing...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item, i) => {
                const isLatest = i === activity.length - 1;
                const hasData = item.data && (item.data.sources?.length || item.data.items?.length);
                const isExpanded = expandedItem === i;

                return (
                  <div key={i}>
                    <div
                      onClick={() => hasData && setExpandedItem(isExpanded ? null : i)}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                        isLatest ? "text-white bg-zinc-800/50" : "text-zinc-500"
                      } ${hasData ? "cursor-pointer hover:bg-zinc-800" : ""}`}
                    >
                      <div className={isLatest ? "animate-pulse" : ""}>
                        {getIcon(item.type, isLatest)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isLatest ? "font-medium" : ""}`}>
                          {item.message}
                        </p>
                        {item.detail && (
                          <p
                            className={`text-xs truncate ${
                              isLatest ? "text-zinc-400" : "text-zinc-600"
                            }`}
                          >
                            {item.detail}
                          </p>
                        )}
                      </div>
                      {hasData && (
                        <CaretDown className={`size-3 text-zinc-500 ${isExpanded ? "rotate-180" : ""} transition-transform`} />
                      )}
                      {isLatest && item.type !== "complete" && !hasData && (
                        <span className="text-zinc-600 animate-pulse">...</span>
                      )}
                    </div>

                    {/* Expanded data */}
                    {isExpanded && item.data && (
                      <div className="ml-8 mt-2 space-y-2 text-xs">
                        {/* Sources */}
                        {item.data.sources && item.data.sources.length > 0 && (
                          <div className="space-y-1">
                            {item.data.sources.map((src, j) => (
                              <a
                                key={j}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-zinc-800/50 rounded border border-zinc-700 hover:border-blue-500 transition-colors"
                              >
                                <p className="text-blue-400 truncate">{src.title}</p>
                                {src.snippet && (
                                  <p className="text-zinc-500 text-xs mt-1 line-clamp-2">
                                    {src.snippet}...
                                  </p>
                                )}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Items (facts, parties, outcomes) */}
                        {item.data.items && item.data.items.length > 0 && (
                          <div className="space-y-1">
                            {item.data.items.map((text, j) => (
                              <div
                                key={j}
                                className="p-2 bg-zinc-800/50 rounded border border-zinc-700 text-zinc-300 whitespace-pre-wrap"
                              >
                                {text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-4">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (activity.length / 12) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-3">
          Negotiation Simulator
        </h1>
        <p className="text-zinc-400 text-lg">
          Train AI on real-world negotiation scenarios.
          <br />
          Research the web, generate parties, discover optimal strategies.
        </p>
      </div>

      {/* Custom scenario input */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Create your own scenario
        </label>
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate(topic)}
            placeholder="e.g., Tesla union negotiations, Brexit trade deal..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => handleCreate(topic)}
            disabled={!topic.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 px-6 py-3 rounded-lg font-medium text-white transition-colors"
          >
            Research
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-zinc-950 text-zinc-600">
            or choose a preset
          </span>
        </div>
      </div>

      {/* Preset scenarios */}
      <div className="grid grid-cols-2 gap-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleCreate(preset.query)}
            className="group bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-5 text-left transition-all shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{preset.icon}</div>
              <div>
                <span className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                  {preset.label}
                </span>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                  {preset.query}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Info footer */}
      <div className="mt-12 text-center text-xs text-zinc-600">
        <p>
          Powered by web research (Tavily) + AI generation (OpenAI GPT-4)
        </p>
      </div>
    </div>
  );
}
