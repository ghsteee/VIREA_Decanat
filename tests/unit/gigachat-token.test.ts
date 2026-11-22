import assert from "node:assert/strict";
import test from "node:test";
import { parseAccessToken } from "../../src/server/gigachat-token";

const now = 1_679_471_400_000;

test("токен принимается со сроком в секундах и миллисекундах", () => {
  for (const expires_at of [1_679_471_442, 1_679_471_442_000]) {
    assert.deepEqual(
      parseAccessToken({ access_token: "test", expires_at }, now),
      {
        value: "test",
        expiresAt: 1_679_471_442_000,
      },
    );
  }
});

test("просроченный токен и неверный формат ответа отклоняются", () => {
  for (const expires_at of [1_679_471_399, now, "1679471442", NaN, Infinity]) {
    assert.equal(
      parseAccessToken({ access_token: "test", expires_at }, now),
      null,
    );
  }
  assert.equal(parseAccessToken({ expires_at: 1_679_471_442 }, now), null);
});
