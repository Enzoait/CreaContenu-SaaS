import { describe, expect, it } from "vitest";
import { profileSettingsSchema } from "./profile-settings.schema";

describe("profileSettingsSchema", () => {
  it("accepts un profil valide", () => {
    const parsed = profileSettingsSchema.parse({
      displayName: "Aurélien",
      bio: "Créateur vidéo",
      phone: "",
      notifyEmail: true,
    });
    expect(parsed.displayName).toBe("Aurélien");
    expect(parsed.notifyEmail).toBe(true);
  });

  it("rejette un nom affiché vide", () => {
    expect(() =>
      profileSettingsSchema.parse({
        displayName: "   ",
        bio: "",
        phone: "",
        notifyEmail: false,
      }),
    ).toThrow();
  });
});
