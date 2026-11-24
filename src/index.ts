/**
 * 公开出口。对外只暴露这些名字——内部目录结构可以动，import 路径不必跟着动。
 */

export { MSPNode } from "./node.ts";
export type { MSPNodeOptions } from "./node.ts";

export { Manifest, sanitizePeerManifest } from "./core/manifest.ts";
export type { SkillSpec, ToolSpec } from "./core/manifest.ts";
export { SignalType, encodeSignal, decodeSignal, makeSignal } from "./core/signal.ts";
export type { Signal } from "./core/signal.ts";
export {
  ToolResult,
  textContent,
  imageContent,
  audioContent,
  blobRef,
} from "./core/content.ts";
export type {
  ContentBlock,
  TextContent,
  ImageContent,
  AudioContent,
  BlobRef,
} from "./core/content.ts";
export {
  DEFAULT_NETWORK_GRANT,
  LOCAL_FULL_GRANT,
  isLocalHost,
  grantsFor,
  canReq,
  canPub,
  canSub,
  canRep,
} from "./core/grants.ts";
export type { PeerGrant, GrantsConfig } from "./core/grants.ts";
export {
  isValidNodeId,
  isValidPatternId,
  isValidSignalPath,
  isValidTaskState,
  isValidToolName,
} from "./core/grammar.ts";

export { patternMatches } from "./protocol/matcher.ts";
export { FrameDecoder, frameMessage } from "./protocol/framing.ts";
export { Protocol } from "./protocol/protocol.ts";
export type { ToolHandler, SignalHandler } from "./protocol/protocol.ts";

export { TcpConnection, TcpTransport } from "./transport/tcp.ts";
export type { ConnectionLike, Endpoint, TransportLike } from "./transport/base.ts";
export { DirectoryDiscovery } from "./discovery/directory.ts";
export { DirectoryPresence } from "./presence/directory.ts";
export type { DiscoveredEndpoint, Discovery } from "./discovery/base.ts";
