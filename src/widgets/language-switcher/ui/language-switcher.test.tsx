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

  it("affiche le sélecteur et met à jour la locale", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox", { name: /langue/i });
    expect(select).toHaveValue("fr");

    await user.selectOptions(select, "en");
    expect(useLocaleStore.getState().locale).toBe("en");
  });
});
