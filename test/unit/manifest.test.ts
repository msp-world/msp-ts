/** Manifest 序列化形状与命名文法。 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { Manifest, sanitizePeerManifest } from "../../src/core/manifest.ts";
import {
  isValidNodeId,
  isValidPatternId,
  isValidSignalPath,
  isValidTaskState,
  isValidToolName,
} from "../../src/core/grammar.ts";

test("Manifest.toDict：10 个容器字段齐全（对齐 msp-py 0.1.0a2）", () => {
  const m = new Manifest();
  const d = m.toDict();
  assert.deepEqual(Object.keys(d).sort(), [
    "capabilities", "clientCapabilities", "patternMetadata", "patterns",
    "prompts", "resources", "signals", "skills", "tools", "version",
  ]);
});

test("Manifest：工具、信号与技能登记会推进 version，重复相同项不空转", () => {
  const m = new Manifest();
  const v0 = m.version;
  m.addTool({ name: "echo", description: "回声" });
  assert.ok(m.version > v0, "登记工具必须递增 version");
  const v1 = m.version;
  m.addTool({ name: "echo", description: "回声" });
  assert.equal(m.version, v1, "重复相同工具不空转 version");
  m.addSignal("sensor.temp");
  assert.ok(m.version > v1);
  const v2 = m.version;
  m.addSkill({ name: "greet", summary: "打招呼", whenToUse: "首次连接", toolsUsed: ["echo"] });
  assert.ok(m.version > v2);
  assert.equal((m.toDict().skills as any[])[0].whenToUse, "首次连接");
});

test("Manifest：sanitizePeerManifest 对畸形对端清单容错", () => {
  const clean = sanitizePeerManifest({
    version: "12",
    tools: [{ name: "a" }, "bad", 42],
    signals: "not-a-list",
    clientCapabilities: [1, 2],
  });
  assert.equal(clean.version, 12);
  assert.deepEqual(clean.tools, [{ name: "a" }]);
  assert.deepEqual(clean.signals, []);
  assert.deepEqual(clean.clientCapabilities, {});
});

test("Manifest：工具描述按 ToolDescriptor 形状输出", () => {
  const m = new Manifest();
  m.addTool({ name: "echo", description: "回声", inputSchema: { type: "object" } });
  const tool = (m.toDict().tools as any[])[0];
  assert.deepEqual(Object.keys(tool).sort(), [
    "annotations", "description", "inputSchema", "name", "outputTypes",
  ]);
});

test("文法：工具名/节点名/模式 ID/任务状态校验", () => {
  assert.ok(isValidToolName("get_weather"));
  assert.ok(!isValidToolName("esp.led"), "点号是 path 的分隔符，工具名里非法");
  assert.ok(!isValidToolName("GetWeather"), "大写非法");
  assert.ok(isValidNodeId("esp32_a"));
  assert.ok(isValidSignalPath("sensor.soil.moisture"));
  assert.ok(!isValidSignalPath("sensor..moisture"));
  assert.ok(isValidPatternId("msp/task"));
  assert.ok(!isValidPatternId("msp"));
  assert.ok(!isValidPatternId("msp/task/extra"));
  assert.ok(isValidTaskState("input-required"));
  assert.ok(!isValidTaskState("input_required"));
});
