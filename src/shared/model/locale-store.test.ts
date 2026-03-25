import { beforeEach, describe, expect, it } from "vitest";
import { selectLocale, useLocaleStore } from "./locale-store";

describe("useLocaleStore", () => {
  beforeEach(() => {
    useLocaleStore.setState({
      locale: "fr",
      setLocale: useLocaleStore.getState().setLocale,
    });
  });

  it("expose fr par défaut", () => {
    expect(selectLocale(useLocaleStore.getState())).toBe("fr");
  });

  it("setLocale met à jour la locale", () => {
    useLocaleStore.getState().setLocale("en");
    expect(selectLocale(useLocaleStore.getState())).toBe("en");
  });
});
