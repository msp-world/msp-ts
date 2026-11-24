/**
 * 命名文法（对齐 msp-py 0.1.0a2 的 core/grammar.py）。
 *
 *   Node ID     ^[a-z0-9_-]+$
 *   Tool name   ^[a-z0-9_-]+$        ← 比 MCP 更严：无大写、无点号
 *   Signal path ^[a-z0-9_-]+(\.[a-z0-9_-]+)*$
 *   Pattern ID  ^[a-z0-9_-]+/[a-z0-9_-]+$
 *   Task state  ^(submitted|working|input-required|completed|failed|canceled)$
 */

const NODE_ID = /^[a-z0-9_-]+$/;
const TOOL_NAME = /^[a-z0-9_-]+$/;
const PATH = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
const PATTERN_ID = /^[a-z0-9_-]+\/[a-z0-9_-]+$/;
const TASK_STATE = /^(submitted|working|input-required|completed|failed|canceled)$/;

export function isValidNodeId(value: unknown): boolean {
  return typeof value === "string" && NODE_ID.test(value);
}

export function isValidToolName(value: unknown): boolean {
  return typeof value === "string" && TOOL_NAME.test(value);
}

export function isValidSignalPath(value: unknown): boolean {
  return typeof value === "string" && PATH.test(value);
}

export function isValidPatternId(value: unknown): boolean {
  return typeof value === "string" && PATTERN_ID.test(value);
}

export function isValidTaskState(value: unknown): boolean {
  return typeof value === "string" && TASK_STATE.test(value);
}
