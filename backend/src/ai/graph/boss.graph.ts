import { END, START, StateGraph } from '@langchain/langgraph';
import { env } from '../../config/env.js';
import { BOSS_NODE_NAME, bossNode } from '../nodes/boss.node.js';
import { bossStateSchema } from './boss.state.js';

export const bossGraph = new StateGraph(bossStateSchema)
  .addNode(BOSS_NODE_NAME, bossNode, { timeout: env.BOSS_TIMEOUT_MS })
  .addEdge(START, BOSS_NODE_NAME)
  .addEdge(BOSS_NODE_NAME, END)
  .compile();

export type BossGraph = typeof bossGraph;
