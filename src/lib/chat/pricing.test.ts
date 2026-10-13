import { test } from "node:test";
import assert from "node:assert/strict";
import { costUsd } from "./pricing.ts";

test("prices the measured first Opus turn (cache write + thinking) at about 41 cents", () => {
  const r = costUsd("claude-opus-5", {
    input_tokens: 24,
    cache_creation_input_tokens: 55256,
    cache_read_input_tokens: 0,
    output_tokens: 2675,
  });
  // 24*5 + 55256*5*1.25 + 2675*25 = 120 + 345350 + 66875 = 412345 µ$
  assert.equal(r.costUsd, 0.412345);
  assert.equal(r.cacheWriteTokens, 55256);
});

test("a cached follow-up on Opus costs mostly output", () => {
  const r = costUsd("claude-opus-5", { input_tokens: 109, cache_read_input_tokens: 55256, output_tokens: 2376 });
  // 109*5 + 55256*0.5 + 2376*25 = 545 + 27628 + 59400 = 87573 µ$
  assert.equal(r.costUsd, 0.087573);
});

test("missing cache fields count as zero and Haiku uses its own rates", () => {
  const r = costUsd("claude-haiku-4-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 });
  assert.equal(r.costUsd, 6);
  assert.equal(r.cacheReadTokens, 0);
});
