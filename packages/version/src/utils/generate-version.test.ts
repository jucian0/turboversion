import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockState: {
  recommendation: { releaseType?: string };
  commitsLength: number;
} = {
  recommendation: {},
  commitsLength: 0,
};

jest.mock(
  "conventional-recommended-bump",
  () =>
    (_options: unknown, callback: (error: unknown, result: unknown) => void) =>
      callback(null, mockState.recommendation)
);

jest.mock("./git", () => ({
  getCommitsLength: () => mockState.commitsLength,
}));

import { generateVersion } from "./generate-version";

const base = {
  preset: "conventionalcommits",
  tagPrefix: "v",
  prereleaseIdentifier: "rc",
};

beforeEach(() => {
  mockState.recommendation = {};
  mockState.commitsLength = 0;
});

describe("generateVersion", () => {
  describe("with a prerelease as the latest tag", () => {
    it("closes it when nothing new is waiting to be released", async () => {
      expect(await generateVersion({ ...base, latestTag: "v1.5.1-rc.0" })).toBe(
        "1.5.1"
      );
    });

    it("closes it when the only commit is not conventional", async () => {
      mockState.commitsLength = 1;

      expect(await generateVersion({ ...base, latestTag: "v1.5.1-rc.0" })).toBe(
        "1.5.1"
      );
    });

    it("lets a fix close it at the same numbers", async () => {
      mockState.recommendation = { releaseType: "patch" };
      mockState.commitsLength = 1;

      expect(await generateVersion({ ...base, latestTag: "v1.5.1-rc.0" })).toBe(
        "1.5.1"
      );
    });

    it("lets a feature outrank the close", async () => {
      mockState.recommendation = { releaseType: "minor" };
      mockState.commitsLength = 1;

      expect(await generateVersion({ ...base, latestTag: "v1.5.1-rc.0" })).toBe(
        "1.6.0"
      );
    });

    it("keeps the prerelease stream going when another one is asked for", async () => {
      expect(
        await generateVersion({
          ...base,
          latestTag: "v1.5.1-rc.0",
          prerelease: true,
        })
      ).toBe("1.5.1-rc.1");
    });

    it("honours an explicit bump over the close", async () => {
      expect(
        await generateVersion({
          ...base,
          latestTag: "v1.5.1-rc.0",
          type: "minor",
        })
      ).toBe("1.6.0");
    });
  });

  describe("with a stable version as the latest tag", () => {
    it("returns null when no commit came in", async () => {
      expect(await generateVersion({ ...base, latestTag: "v1.5.0" })).toBeNull();
    });

    it("returns null when commits came in but none is conventional", async () => {
      mockState.commitsLength = 3;

      expect(await generateVersion({ ...base, latestTag: "v1.5.0" })).toBeNull();
    });

    it("bumps on a conventional commit", async () => {
      mockState.recommendation = { releaseType: "patch" };
      mockState.commitsLength = 1;

      expect(await generateVersion({ ...base, latestTag: "v1.5.0" })).toBe(
        "1.5.1"
      );
    });

    it("opens a prerelease when one is asked for", async () => {
      mockState.recommendation = { releaseType: "patch" };
      mockState.commitsLength = 1;

      expect(
        await generateVersion({
          ...base,
          latestTag: "v1.5.0",
          prerelease: true,
        })
      ).toBe("1.5.1-rc.0");
    });
  });
});
