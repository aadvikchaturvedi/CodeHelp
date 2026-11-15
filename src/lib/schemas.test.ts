import { describe, it } from "node:test";
import assert from "node:assert";
import { ChatRequestSchema } from "./schemas";

describe("ChatRequestSchema", () => {
  it("accepts messages with an optional attached file", () => {
    const parsed = ChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Explain this" }],
      attachedFile: { name: "a.ts", content: "const x = 1", language: "typescript" },
    });
    assert.ok(parsed.success);
  });

  it("requires at least one message", () => {
    assert.strictEqual(ChatRequestSchema.safeParse({ messages: [] }).success, false);
  });

  it("rejects unknown roles", () => {
    const parsed = ChatRequestSchema.safeParse({
      messages: [{ role: "system", content: "x" }],
    });
    assert.strictEqual(parsed.success, false);
  });

  it("rejects an attached file without content", () => {
    const parsed = ChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "hi" }],
      attachedFile: { name: "a.ts" },
    });
    assert.strictEqual(parsed.success, false);
  });
});
