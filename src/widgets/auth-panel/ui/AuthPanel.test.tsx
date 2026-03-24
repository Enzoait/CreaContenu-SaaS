import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthPanel } from "./AuthPanel";

vi.mock("../../../features/auth", () => ({
  SignInForm: () => <div>SignInFormMock</div>,
  SignUpForm: () => <div>SignUpFormMock</div>,
}));

describe("AuthPanel", () => {
  it("affiche la connexion par defaut et bascule vers inscription", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText("SignInFormMock")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inscription" }));

    expect(screen.getByText("SignUpFormMock")).toBeInTheDocument();
  });
});
