import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAT_MODELS, DEFAULT_CHAT_MODEL, isChatModel, modelLabel, thinkingFor } from "./models.ts";

test("allowlist accepts exactly the three picker models", () => {
  assert.deepEqual(CHAT_MODELS.map((m) => m.id), ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"]);
  for (const m of CHAT_MODELS) assert.ok(isChatModel(m.id));
  assert.equal(isChatModel("gpt-5"), false);
  assert.equal(isChatModel("claude-opus-4-8"), false);
  assert.equal(isChatModel(undefined), false);
  assert.ok(isChatModel(DEFAULT_CHAT_MODEL));
});

test("labels fall back to the id", () => {
  assert.equal(modelLabel("claude-opus-5"), "Opus 5");
  assert.equal(modelLabel("something-else"), "something-else");
});

test("only Haiku gets an explicit thinking budget", () => {
  assert.deepEqual(thinkingFor("claude-haiku-4-5"), { type: "enabled", budget_tokens: 8000 });
  assert.equal(thinkingFor("claude-opus-5"), undefined);
  assert.equal(thinkingFor("claude-sonnet-5"), undefined);
});
