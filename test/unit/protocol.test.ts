/** Protocol 0.1.0a2 对齐测试：ACK 顺序、MANIFEST_UPDATE 版本单调性、ToolResult 透传、grants 授权。 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { Manifest } from "../../src/core/manifest.ts";
import { ToolResult, imageContent } from "../../src/core/content.ts";
import { canPub, canReq, DEFAULT_NETWORK_GRANT, grantsFor, isLocalHost } from "../../src/core/grants.ts";
import { decodeSignal, encodeSignal, makeSignal, SignalType } from "../../src/core/signal.ts";
import { Protocol } from "../../src/protocol/protocol.ts";
import type { ConnectionLike, Endpoint, TransportLike } from "../../src/transport/base.ts";

class FakeConn implements ConnectionLike {
  onData: (frame: Buffer) => void = () => {};
  onClose: () => void = () => {};
  sent: Buffer[] = [];
  closed = false;

  send(frame: Buffer): void {
    this.sent.push(frame);
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.onClose();
    }
  }
}

class FakeTransport implements TransportLike {
  acceptHandler: (conn: ConnectionLike) => void = () => {};
  async listen(): Promise<Endpoint> {
    return { host: "127.0.0.1", port: 9999 };
  }
  setAcceptHandler(cb: (conn: ConnectionLike) => void): void {
    this.acceptHandler = cb;
  }
  async connect(): Promise<ConnectionLike> {
    return new FakeConn();
  }
  close(): void {}
}

test("入站握手：ACK 严格早于 onPeerConnected 内发起的 TOOL_CALL", async () => {
  const tr = new FakeTransport();
  const proto = new Protocol({ nodeId: "node_b", manifest: new Manifest(), transport: tr });
  await proto.listenAndServe();

  proto.onPeerConnected = (peerId) => {
    void proto.call(peerId, "ping_tool", {});
  };

  const conn = new FakeConn();
  tr.acceptHandler(conn);
  conn.onData(encodeSignal(makeSignal(SignalType.HELLO, "node_a", { payload: { manifest: { version: 1 } } })));
  await new Promise((r) => setTimeout(r, 20));

  assert.ok(conn.sent.length >= 2);
  assert.equal(decodeSignal(conn.sent[0]).type, SignalType.ACK);
  assert.equal(decodeSignal(conn.sent[1]).type, SignalType.TOOL_CALL);
  proto.stop();
});

test("MANIFEST_UPDATE：版本单调递增，丢弃陈旧版本", async () => {
  const tr = new FakeTransport();
  const proto = new Protocol({ nodeId: "node_b", manifest: new Manifest(), transport: tr });
  await proto.listenAndServe();

  const conn = new FakeConn();
  tr.acceptHandler(conn);
  conn.onData(encodeSignal(makeSignal(SignalType.HELLO, "node_a", { payload: { manifest: { version: 5, tools: [{ name: "v5" }] } } })));
  await new Promise((r) => setTimeout(r, 10));

  conn.onData(encodeSignal(makeSignal(SignalType.MANIFEST_UPDATE, "node_a", { payload: { manifest: { version: 3, tools: [{ name: "v3" }] } } })));
  assert.equal((proto.peerManifests.get("node_a")?.version as number), 5);

  conn.onData(encodeSignal(makeSignal(SignalType.MANIFEST_UPDATE, "node_a", { payload: { manifest: { version: 6, tools: [{ name: "v6" }] } } })));
  assert.equal((proto.peerManifests.get("node_a")?.version as number), 6);
  proto.stop();
});

test("runTool：透传 ToolResult 的 ImageContent 与 grants 拒绝未授权工具", async () => {
  const tr = new FakeTransport();
  const proto = new Protocol({
    nodeId: "node_b",
    manifest: new Manifest(),
    transport: tr,
    grants: { node_a: { req: ["snap"], pub: ["ok.*"], sub: true, rep: true } },
  });
  await proto.listenAndServe();

  proto.tool("snap", () => new ToolResult([imageContent("AAAA", "image/png")], { ok: true }));
  proto.tool("secret", () => ({ leaked: true }));

  const received: string[] = [];
  proto.on("ok.*", (s) => received.push(s.path!));
  proto.on("bad.*", (s) => received.push(s.path!));

  const conn = new FakeConn();
  tr.acceptHandler(conn);
  conn.onData(encodeSignal(makeSignal(SignalType.HELLO, "node_a", { payload: { manifest: { version: 1 } } })));
  await new Promise((r) => setTimeout(r, 10));

  conn.onData(encodeSignal(makeSignal(SignalType.TOOL_CALL, "node_a", { reqid: "r1", payload: { tool: "snap", args: {} } })));
  conn.onData(encodeSignal(makeSignal(SignalType.TOOL_CALL, "node_a", { reqid: "r2", payload: { tool: "secret", args: {} } })));
  conn.onData(encodeSignal(makeSignal(SignalType.SIGNAL, "node_a", { path: "ok.hi", payload: {} })));
  conn.onData(encodeSignal(makeSignal(SignalType.SIGNAL, "node_a", { path: "bad.hi", payload: {} })));
  await new Promise((r) => setTimeout(r, 20));

  const frames = conn.sent.map((b) => decodeSignal(b));
  const r1 = frames.find((f) => f.reqid === "r1")!;
  const r2 = frames.find((f) => f.reqid === "r2")!;
  assert.equal((r1.payload.content as any[])[0].type, "image");
  assert.ok(String(r2.payload.error).includes("未授权"));
  assert.deepEqual(received, ["ok.hi"]);
  proto.stop();
});

test("grants 辅助函数与 isLocalHost", () => {
  assert.equal(isLocalHost("127.0.0.1"), true);
  assert.equal(isLocalHost("::1"), true);
  assert.equal(isLocalHost("127.1"), false);
  assert.equal(isLocalHost("192.168.1.5"), false);
  const net = grantsFor(undefined, "peer_x", false);
  assert.deepEqual(net, DEFAULT_NETWORK_GRANT);
  assert.equal(canReq(net, "any"), false);
  assert.equal(canPub(net, "a.b"), false);
});
