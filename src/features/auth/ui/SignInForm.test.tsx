import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { translate } from "../../../shared/i18n/messages";
import { SignInForm } from "./SignInForm";

const mutateAsyncMock = vi.fn<
  (payload: { email: string; password: string }) => Promise<void>
>(() => Promise.resolve());

vi.mock("../model/use-sign-in-mutation", () => ({
  useSignInMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("SignInForm", () => {
  it("affiche les erreurs de validation", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignInForm />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(translate("fr", "auth.fieldEmail")),
      "mauvais-email",
    );
    await user.type(
      screen.getByLabelText(translate("fr", "auth.fieldPassword")),
      "123",
    );
    await user.click(
      screen.getByRole("button", { name: translate("fr", "auth.signInSubmit") }),
    );

    expect(
      await screen.findByText(translate("fr", "auth.validationEmailInvalid")),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(translate("fr", "auth.validationPasswordMin8")),
    ).toBeInTheDocument();
  });

  it("soumet quand le formulaire est valide", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignInForm />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(translate("fr", "auth.fieldEmail")),
      "test@creacontenu.com",
    );
    await user.type(
      screen.getByLabelText(translate("fr", "auth.fieldPassword")),
      "password123",
    );
    await user.click(
      screen.getByRole("button", { name: translate("fr", "auth.signInSubmit") }),
    );

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      email: "test@creacontenu.com",
      password: "password123",
    });
  });
});
