/**
 * 授权表 grants —— 对齐 msp-py 0.1.0a2 core/grants.py（security.md §3）。
 *
 * - 授权与能力分离：grants 是本地策略，不进 Manifest；
 * - 四个动作：req / pub / sub / rep；
 * - 非本机默认姿态：只留应答通道（req=[], pub=false, sub=false, rep=true）。
 */
import { patternMatches } from "../protocol/matcher.ts";

export interface PeerGrant {
  /** true = 全部工具；string[] = 允许的工具名精确列表；false = 全拒 */
  req: boolean | string[];
  /** true = 全部信号；string[] = 允许的路径模式列表；false = 全拒 */
  pub: boolean | string[];
  /** true = 全部信号；string[] = 允许的路径模式列表；false = 全拒 */
  sub: boolean | string[];
  /** 是否允许接收应答（tool_result / error 等） */
  rep: boolean;
}

export type GrantsConfig = Record<string, Partial<PeerGrant>>;

export const DEFAULT_NETWORK_GRANT: Readonly<PeerGrant> = {
  req: [],
  pub: false,
  sub: false,
  rep: true,
};

export const LOCAL_FULL_GRANT: Readonly<PeerGrant> = {
  req: true,
  pub: true,
  sub: true,
  rep: true,
};

function isDottedQuad(text: string): boolean {
  const parts = text.split(".");
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!part || !/^\d{1,3}$/.test(part) || Number(part) > 255) return false;
  }
  return true;
}

/** 判定 host 是否属于本机回环（127.0.0.0/8 完整四段、::1、localhost、::ffff:127.x.y.z）。 */
export function isLocalHost(host: unknown): boolean {
  if (typeof host !== "string" || !host.trim()) return false;
  const h = host.trim().toLowerCase();
  if (h === "::1" || h === "localhost") return true;
  if (h.startsWith("::ffff:")) return isLocalHost(h.slice(7));
  if (h.startsWith("127.") && isDottedQuad(h)) return true;
  return false;
}

export function grantsFor(
  grants: GrantsConfig | undefined,
  peerId: string,
  isLocal = true,
): PeerGrant {
  const base = isLocal ? LOCAL_FULL_GRANT : DEFAULT_NETWORK_GRANT;
  if (!grants) return { ...base };
  const entry = grants[peerId] ?? grants["*"];
  if (!entry) return { ...base };
  return {
    req: entry.req !== undefined ? entry.req : base.req,
    pub: entry.pub !== undefined ? entry.pub : base.pub,
    sub: entry.sub !== undefined ? entry.sub : base.sub,
    rep: entry.rep !== undefined ? entry.rep : base.rep,
  };
}

export function canReq(grant: PeerGrant, toolName: string): boolean {
  if (grant.req === true) return true;
  if (grant.req === false) return false;
  return grant.req.includes(toolName);
}

export function canPub(grant: PeerGrant, signalPath: string): boolean {
  if (grant.pub === true) return true;
  if (grant.pub === false) return false;
  return grant.pub.some((p) => p === "**" || patternMatches(p, signalPath));
}

export function canSub(grant: PeerGrant, signalPath: string): boolean {
  if (grant.sub === true) return true;
  if (grant.sub === false) return false;
  return grant.sub.some((p) => p === "**" || patternMatches(p, signalPath));
}

export function canRep(grant: PeerGrant): boolean {
  return grant.rep === true;
}
