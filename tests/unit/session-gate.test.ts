import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import { requireSession } from "@/server/auth/session";
import { UnauthorizedError } from "@/server/errors";

describe("unauthenticated session gate", () => {
  it("throws when there is no session user", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    await expect(requireSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns the session when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user_1", email: "a@b.c", name: "A", image: null },
      expires: new Date(Date.now() + 60_000).toISOString(),
    });

    const session = await requireSession();
    expect(session.user.id).toBe("user_1");
  });
});
