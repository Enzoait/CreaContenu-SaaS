import { describe, expect, it } from "vitest";
import { translate } from "../../../shared/i18n/messages";
import { createChangePasswordSchema } from "./change-password.schema";

const schema = createChangePasswordSchema((key) => translate("fr", key));

describe("createChangePasswordSchema", () => {
  it("valide un payload correct", () => {
    const result = schema.safeParse({
      currentPassword: "password123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });

    expect(result.success).toBe(true);
  });

  it("rejette des mots de passe differents", () => {
    const result = schema.safeParse({
      currentPassword: "password123",
      newPassword: "newpassword123",
      confirmPassword: "different123",
    });

    expect(result.success).toBe(false);
  });

  it("rejette le meme mot de passe", () => {
    const result = schema.safeParse({
      currentPassword: "password123",
      newPassword: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(false);
  });
});
