import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./change-password.schema";

describe("changePasswordSchema", () => {
  it("valide un payload correct", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "password123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });

    expect(result.success).toBe(true);
  });

  it("rejette des mots de passe differents", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "password123",
      newPassword: "newpassword123",
      confirmPassword: "different123",
    });

    expect(result.success).toBe(false);
  });

  it("rejette le meme mot de passe", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "password123",
      newPassword: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(false);
  });
});
