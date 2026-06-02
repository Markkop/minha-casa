import { beforeEach, describe, expect, it, vi } from "vitest";

const tokenMock = vi.hoisted(() => vi.fn());

vi.mock("$lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ subscribe: vi.fn() }),
    token: tokenMock
  }
}));

describe("getApiToken", () => {
  beforeEach(async () => {
    tokenMock.mockReset();
    const { clearCachedToken } = await import("./auth");
    clearCachedToken();
  });

  it("shares one in-flight JWT request across concurrent callers", async () => {
    let resolveToken: (value: { data: { token: string }; error: null }) => void = () => {};
    tokenMock.mockReturnValue(
      new Promise((resolve) => {
        resolveToken = resolve;
      })
    );

    const { getApiToken } = await import("./auth");
    const first = getApiToken();
    const second = getApiToken();
    resolveToken({ data: { token: "jwt" }, error: null });

    await expect(Promise.all([first, second])).resolves.toEqual(["jwt", "jwt"]);
    expect(tokenMock).toHaveBeenCalledTimes(1);
  });

  it("uses the cached token while it is fresh", async () => {
    tokenMock.mockResolvedValue({ data: { token: "jwt" }, error: null });

    const { getApiToken } = await import("./auth");
    await expect(getApiToken()).resolves.toBe("jwt");
    await expect(getApiToken()).resolves.toBe("jwt");

    expect(tokenMock).toHaveBeenCalledTimes(1);
  });
});
