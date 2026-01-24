/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_llmAgent from "../agents/llmAgent.js";
import type * as agents_mutations from "../agents/mutations.js";
import type * as agents_personalities from "../agents/personalities.js";
import type * as agents_queries from "../agents/queries.js";
import type * as agents_voices from "../agents/voices.js";
import type * as evolution_evolve from "../evolution/evolve.js";
import type * as evolution_helpers from "../evolution/helpers.js";
import type * as evolution_personalityEvolution from "../evolution/personalityEvolution.js";
import type * as evolution_roundRunner from "../evolution/roundRunner.js";
import type * as games from "../games.js";
import type * as messages from "../messages.js";
import type * as negotiationRounds_mutations from "../negotiationRounds/mutations.js";
import type * as negotiationRounds_queries from "../negotiationRounds/queries.js";
import type * as negotiations_engine from "../negotiations/engine.js";
import type * as negotiations_multiPartyEngine from "../negotiations/multiPartyEngine.js";
import type * as negotiations_multiPartyMutations from "../negotiations/multiPartyMutations.js";
import type * as negotiations_mutations from "../negotiations/mutations.js";
import type * as negotiations_queries from "../negotiations/queries.js";
import type * as negotiations_strategies from "../negotiations/strategies.js";
import type * as research_extract from "../research/extract.js";
import type * as research_generate from "../research/generate.js";
import type * as research_search from "../research/search.js";
import type * as scenarios_actions from "../scenarios/actions.js";
import type * as scenarios_mutations from "../scenarios/mutations.js";
import type * as scenarios_queries from "../scenarios/queries.js";
import type * as simulation_orchestrator from "../simulation/orchestrator.js";
import type * as simulation_scorer from "../simulation/scorer.js";
import type * as simulation_state from "../simulation/state.js";
import type * as simulation_strategyMutations from "../simulation/strategyMutations.js";
import type * as simulation_strategyQueries from "../simulation/strategyQueries.js";
import type * as simulation_strategyRunner from "../simulation/strategyRunner.js";
import type * as simulation_voice from "../simulation/voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/llmAgent": typeof agents_llmAgent;
  "agents/mutations": typeof agents_mutations;
  "agents/personalities": typeof agents_personalities;
  "agents/queries": typeof agents_queries;
  "agents/voices": typeof agents_voices;
  "evolution/evolve": typeof evolution_evolve;
  "evolution/helpers": typeof evolution_helpers;
  "evolution/personalityEvolution": typeof evolution_personalityEvolution;
  "evolution/roundRunner": typeof evolution_roundRunner;
  games: typeof games;
  messages: typeof messages;
  "negotiationRounds/mutations": typeof negotiationRounds_mutations;
  "negotiationRounds/queries": typeof negotiationRounds_queries;
  "negotiations/engine": typeof negotiations_engine;
  "negotiations/multiPartyEngine": typeof negotiations_multiPartyEngine;
  "negotiations/multiPartyMutations": typeof negotiations_multiPartyMutations;
  "negotiations/mutations": typeof negotiations_mutations;
  "negotiations/queries": typeof negotiations_queries;
  "negotiations/strategies": typeof negotiations_strategies;
  "research/extract": typeof research_extract;
  "research/generate": typeof research_generate;
  "research/search": typeof research_search;
  "scenarios/actions": typeof scenarios_actions;
  "scenarios/mutations": typeof scenarios_mutations;
  "scenarios/queries": typeof scenarios_queries;
  "simulation/orchestrator": typeof simulation_orchestrator;
  "simulation/scorer": typeof simulation_scorer;
  "simulation/state": typeof simulation_state;
  "simulation/strategyMutations": typeof simulation_strategyMutations;
  "simulation/strategyQueries": typeof simulation_strategyQueries;
  "simulation/strategyRunner": typeof simulation_strategyRunner;
  "simulation/voice": typeof simulation_voice;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
