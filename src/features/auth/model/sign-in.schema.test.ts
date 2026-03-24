import { describe, expect, it } from "vitest";
import { signInSchema } from "./sign-in.schema";

describe("signInSchema", () => {
  it("valide un payload correct", () => {
    const result = signInSchema.safeParse({
      email: "test@creacontenu.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejette un email invalide", () => {
    const result = signInSchema.safeParse({
      email: "email-invalide",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });
});
