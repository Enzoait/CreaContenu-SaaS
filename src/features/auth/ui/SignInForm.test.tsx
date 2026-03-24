import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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

    await user.type(screen.getByLabelText("Adresse email"), "mauvais-email");
    await user.type(screen.getByLabelText("Mot de passe"), "123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Email invalide")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Le mot de passe doit contenir au moins 8 caracteres",
      ),
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
      screen.getByLabelText("Adresse email"),
      "test@creacontenu.com",
    );
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      email: "test@creacontenu.com",
      password: "password123",
    });
  });
});
