import assert from "node:assert/strict";
import { test } from "node:test";
import { startResilientPoll } from "@/lib/poll-backoff";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("a never-resolving poll times out, retries, then recovers", async () => {
  let calls = 0;
  let hang = true;
  const statuses: boolean[] = [];
  const stop = startResilientPoll({
    timeoutMs: 40,
    poll: () => {
      calls += 1;
      if (hang) return new Promise(() => {});
      return Promise.resolve("ok");
    },
    onEnded: () => {
      throw new Error("a timeout must not end the room");
    },
    onReconnecting: (reconnecting) => statuses.push(reconnecting),
  });

  await delay(800);
  assert.ok(calls >= 2, `polling continued after timeout, calls=${calls}`);

  await delay(2200);
  assert.ok(statuses.includes(true), `expected reconnecting, saw ${statuses.join(",")}`);

  hang = false;
  await delay(1500);
  assert.equal(statuses.at(-1), false);
  assert.ok(calls >= 4, `expected another poll after recovery, calls=${calls}`);
  stop();
});
