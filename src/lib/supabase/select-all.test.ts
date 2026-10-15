import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAll } from "./select-all.ts";

const fakeTable = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

function pager(rows: { id: number }[], calls: [number, number][]) {
  return (from: number, to: number) => {
    calls.push([from, to]);
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  };
}

test("returns every row past the page size", async () => {
  const calls: [number, number][] = [];
  const { data, error } = await selectAll(pager(fakeTable(2500), calls), 1000);
  assert.equal(error, null);
  assert.equal(data?.length, 2500);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("an exact multiple of the page size needs one extra empty page", async () => {
  const calls: [number, number][] = [];
  const { data } = await selectAll(pager(fakeTable(2000), calls), 1000);
  assert.equal(data?.length, 2000);
  assert.equal(calls.length, 3);
});

test("stops on the first error and returns no partial data", async () => {
  const err = { message: "boom", details: "", hint: "", code: "X" } as never;
  let n = 0;
  const { data, error } = await selectAll(() => Promise.resolve(n++ === 0 ? { data: fakeTable(1000), error: null } : { data: null, error: err }), 1000);
  assert.equal(data, null);
  assert.equal(error, err);
});
