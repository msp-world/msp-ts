/**
 * 工具结果值与标准 ContentBlock —— 错误即值（对齐 msp-py 0.1.0a2 的 core/content.py）。
 */

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export interface AudioContent {
  type: "audio";
  data: string;
  mimeType: string;
}

export interface BlobRef {
  type: "blob";
  path: string;
  mimeType: string;
  size?: number;
}

export type ContentBlock = TextContent | ImageContent | AudioContent | BlobRef | Record<string, unknown>;

export function textContent(text: string): TextContent {
  return { type: "text", text };
}

export function imageContent(data: string, mimeType = "image/png"): ImageContent {
  return { type: "image", data, mimeType };
}

export function audioContent(data: string, mimeType = "audio/wav"): AudioContent {
  return { type: "audio", data, mimeType };
}

export function blobRef(path: string, mimeType: string, size?: number): BlobRef {
  return { type: "blob", path, mimeType, ...(size !== undefined ? { size } : {}) };
}

/** 工具调用结果：错误即值，不抛异常（对齐 ToolResult 的语义）。 */
export class ToolResult {
  readonly content: ContentBlock[];
  readonly structuredContent?: unknown;
  readonly error?: string;

  constructor(content: ContentBlock[], structuredContent?: unknown, error?: string) {
    this.content = content;
    this.structuredContent = structuredContent;
    this.error = error;
  }

  get is_error(): boolean {
    return typeof this.error === "string" && this.error.length > 0;
  }

  unwrap(): unknown {
    if (this.is_error) {
      throw new Error(this.error);
    }
    return this.structuredContent !== undefined ? this.structuredContent : this.content;
  }
}
