import { describe, expect, it } from "vitest";
import { translate } from "../../../shared/i18n/messages";
import { createSignInSchema } from "./sign-in.schema";

const signInSchema = createSignInSchema((k) => translate("fr", k));

describe("createSignInSchema", () => {
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
