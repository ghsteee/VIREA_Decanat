import assert from "node:assert/strict";
import { createECDH } from "node:crypto";
import test from "node:test";
import {
  parsePushTarget,
  pushEndpoint,
} from "../../src/server/push-subscription";

test("только HTTPS-адреса известных поставщиков push", () => {
  for (const host of [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
    "wns.notify.windows.com",
  ]) {
    assert.equal(pushEndpoint(`https://${host}/subscription`)?.hostname, host);
  }
  assert.ok(pushEndpoint("https://wns.notify.windows.com/?token=test"));
  for (const endpoint of [
    "https://example.invalid/subscription",
    "https://push.apple.com.example.invalid/subscription",
    "https://fcm.googleapis.com:8443/subscription",
    "http://fcm.googleapis.com/subscription",
    "https://fcm.googleapis.com/",
  ]) {
    assert.equal(pushEndpoint(endpoint), null);
  }
});

test("подписка принимает корректные ключи браузера", () => {
  const ecdh = createECDH("prime256v1");
  const target = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    p256dh: ecdh.generateKeys().toString("base64url"),
    auth: Buffer.alloc(16, 1).toString("base64url"),
  };
  assert.deepEqual(parsePushTarget(target), target);
  assert.equal(parsePushTarget({ ...target, auth: "invalid" }), null);
  assert.equal(
    parsePushTarget({
      ...target,
      p256dh: Buffer.alloc(65, 4).toString("base64url"),
    }),
    null,
  );
});
