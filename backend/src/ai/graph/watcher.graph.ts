import { END, START, StateGraph } from '@langchain/langgraph';
import { env } from '../../config/env.js';
import { WATCHER_NODE_NAME, watcherNode } from '../nodes/watcher.node.js';
import { watcherStateSchema } from './watcher.state.js';

/**
 * The Watcher graph.
 *
 *   START -> WATCHER -> END
 *
 * Intentionally the simplest graph that can exist: one node, no branches, no
 * checkpointer (a run is a single request/response and never resumes). Boss,
 * authority selection and assignment will be appended after WATCHER in later
 * prompts - the node name and the state schema are what they will build on.
 *
 * The node carries a hard timeout so a hung provider cannot pin a background
 * run open forever; a timeout surfaces as a normal node error, which the
 * service reports as `WATCHER_UNAVAILABLE` and leaves the issue in REPORTED.
 */
export const watcherGraph = new StateGraph(watcherStateSchema)
  .addNode(WATCHER_NODE_NAME, watcherNode, { timeout: env.WATCHER_TIMEOUT_MS })
  .addEdge(START, WATCHER_NODE_NAME)
  .addEdge(WATCHER_NODE_NAME, END)
  .compile();

export type WatcherGraph = typeof watcherGraph;
