import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocaleStore } from "../../../shared/model/locale-store";
import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    useLocaleStore.setState({
      locale: "fr",
      setLocale: useLocaleStore.getState().setLocale,
    });
  });

  it("affiche FR actif et passe à EN au clic", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const en = screen.getByRole("button", { name: /anglais/i });
    expect(screen.getByRole("button", { name: /français/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(en);
    expect(useLocaleStore.getState().locale).toBe("en");
  });
});
