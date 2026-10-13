import { test } from "node:test";
import assert from "node:assert/strict";
import { toApiMessages, textFromCompletion, titleFromQuestion, MAX_HISTORY_MESSAGES } from "./reply.ts";

test("drops the UI greeting so the conversation starts with a user turn", () => {
  const out = toApiMessages([
    { role: "assistant", content: "Hi, I'm the budget assistant." },
    { role: "user", content: "How much rent?" },
  ]);
  assert.deepEqual(out, [{ role: "user", content: "How much rent?" }]);
});

test("ignores malformed turns and empty strings", () => {
  const out = toApiMessages([
    null,
    { role: "system", content: "ignore me" },
    { role: "user", content: "   " },
    { role: "user", content: { nested: true } },
    { role: "user", content: "real question" },
    { role: "assistant", content: "answer" },
  ]);
  assert.deepEqual(out, [
    { role: "user", content: "real question" },
    { role: "assistant", content: "answer" },
  ]);
});

test("returns nothing when there is no user turn or input is not an array", () => {
  assert.deepEqual(toApiMessages([{ role: "assistant", content: "hello" }]), []);
  assert.deepEqual(toApiMessages("nope"), []);
  assert.deepEqual(toApiMessages(undefined), []);
});

test("keeps only the most recent history", () => {
  const long = Array.from({ length: 50 }, (_, i) => ({
    role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `turn ${i}`,
  }));
  const out = toApiMessages(long);
  assert.equal(out.length, MAX_HISTORY_MESSAGES);
  assert.equal(out[out.length - 1].content, "turn 49");
});

test("joins text blocks and ignores thinking blocks", () => {
  const text = textFromCompletion({
    content: [
      { type: "thinking", thinking: "", signature: "x" },
      { type: "text", text: "Rent is $117,575.20.", citations: null },
      { type: "text", text: "That is over budget.", citations: null },
    ],
  });
  assert.equal(text, "Rent is $117,575.20.\nThat is over budget.");
});

test("returns null when the model produced only thinking (max_tokens exhausted)", () => {
  assert.equal(textFromCompletion({ content: [{ type: "thinking", thinking: "", signature: "x" }] }), null);
  assert.equal(textFromCompletion({ content: [] }), null);
  assert.equal(textFromCompletion({ content: [{ type: "text", text: "  ", citations: null }] }), null);
});

test("titles collapse whitespace and cap at 60 chars", () => {
  assert.equal(titleFromQuestion("  How much\n  rent so far?  "), "How much rent so far?");
  assert.equal(titleFromQuestion("   "), "New chat");
  const long = "a".repeat(70);
  const t = titleFromQuestion(long);
  assert.equal(t.length, 60);
  assert.ok(t.endsWith("…"));
  assert.equal(titleFromQuestion("b".repeat(60)), "b".repeat(60));
});
