import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

const mutateMock = vi.fn();

vi.mock("../model/use-sign-out-mutation", () => ({
  useSignOutMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    mutateMock.mockClear();
  });

  it("appelle mutate au clic", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
  });
});
