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
import type * as games from "../games.js";
import type * as messages from "../messages.js";
import type * as simulation_orchestrator from "../simulation/orchestrator.js";
import type * as simulation_scorer from "../simulation/scorer.js";
import type * as simulation_state from "../simulation/state.js";
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
  games: typeof games;
  messages: typeof messages;
  "simulation/orchestrator": typeof simulation_orchestrator;
  "simulation/scorer": typeof simulation_scorer;
  "simulation/state": typeof simulation_state;
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
