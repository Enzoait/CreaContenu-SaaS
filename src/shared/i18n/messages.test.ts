import { describe, expect, it } from "vitest";
import { translate } from "./messages";

describe("translate", () => {
  it("retourne la chaîne FR par défaut pour une clé connue", () => {
    expect(translate("fr", "shell.dashboard")).toBe("Tableau de bord");
  });

  it("retourne la chaîne EN pour locale en", () => {
    expect(translate("en", "shell.dashboard")).toBe("Dashboard");
  });

  it("remplace les variables {key} dans le texte", () => {
    expect(
      translate("fr", "dashboard.title", { suffix: "Jean" }),
    ).toBe("Dashboard créateur — Jean");
  });
});
