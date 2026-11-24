/**
 * Manifest —— 节点能力清单，握手时交换、变更时推送（对齐 msp-py 0.1.0a2）。
 */

export interface ToolSpec {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputTypes?: string[];
  annotations?: Record<string, unknown>;
}

export interface SkillSpec {
  name: string;
  summary?: string;
  whenToUse?: string;
  toolsUsed?: string[];
}

function stableEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 能力清单。版本号在每次变更时 +1，对端靠它判断「清单变没变」。 */
export class Manifest {
  version = 0;
  patterns: string[] = [];
  patternMetadata: Record<string, unknown> = {};
  capabilities: string[] = [];
  signals: { path: string; schema?: Record<string, unknown>; description?: string }[] = [];
  tools: ToolSpec[] = [];
  resources: unknown[] = [];
  prompts: unknown[] = [];
  skills: SkillSpec[] = [];
  clientCapabilities = { sampling: false, elicitation: false, roots: false };

  addTool(spec: ToolSpec): void {
    const existing = this.tools.findIndex((t) => t.name === spec.name);
    if (existing >= 0) {
      if (stableEqual(this.tools[existing], spec)) return;
      this.tools[existing] = spec;
    } else {
      this.tools.push(spec);
    }
    this.version += 1;
  }

  addSignal(path: string, opts: { schema?: Record<string, unknown>; description?: string } = {}): void {
    const entry = { path, schema: opts.schema, description: opts.description };
    const existing = this.signals.findIndex((s) => s.path === path);
    if (existing >= 0) {
      if (stableEqual(this.signals[existing], entry)) return;
      this.signals[existing] = entry;
    } else {
      this.signals.push(entry);
    }
    this.version += 1;
  }

  addSkill(spec: SkillSpec): void {
    const existing = this.skills.findIndex((s) => s.name === spec.name);
    if (existing >= 0) {
      if (stableEqual(this.skills[existing], spec)) return;
      this.skills[existing] = spec;
    } else {
      this.skills.push(spec);
    }
    this.version += 1;
  }

  toDict(): Record<string, unknown> {
    return {
      version: this.version,
      patterns: [...this.patterns],
      patternMetadata: { ...this.patternMetadata },
      capabilities: [...this.capabilities].sort(),
      signals: this.signals.map((s) => ({
        path: s.path,
        ...(s.schema && Object.keys(s.schema).length > 0 ? { schema: s.schema } : {}),
        ...(s.description ? { description: s.description } : {}),
      })),
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema ?? {},
        outputTypes: t.outputTypes ?? [],
        annotations: t.annotations ?? {},
      })),
      resources: [...this.resources],
      prompts: [...this.prompts],
      skills: this.skills.map((sk) => ({
        name: sk.name,
        summary: sk.summary ?? "",
        whenToUse: sk.whenToUse ?? "",
        toolsUsed: [...(sk.toolsUsed ?? [])],
      })),
      clientCapabilities: { ...this.clientCapabilities },
    };
  }
}

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === "boolean") return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isInteger(n)) return n;
  }
  return fallback;
}

/** 把对端自报的清单归一成安全形状，防止畸形字段搞崩本地视图或握手。 */
export function sanitizePeerManifest(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  out.version = asInt(src.version, 0);
  for (const field of ["tools", "signals", "resources", "prompts", "skills"]) {
    const val = src[field];
    out[field] = Array.isArray(val)
      ? val.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item))
      : [];
  }
  for (const field of ["patterns", "capabilities"]) {
    const val = src[field];
    out[field] = Array.isArray(val) ? val.filter((item) => typeof item === "string") : [];
  }
  if (!src.clientCapabilities || typeof src.clientCapabilities !== "object" || Array.isArray(src.clientCapabilities)) {
    out.clientCapabilities = {};
  }
  return out;
}
