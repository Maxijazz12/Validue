import { describe, it, expect } from "vitest";
import {
  checkContent,
  checkMultipleFields,
  enforceLength,
} from "@/lib/content-filter";

describe("checkContent", () => {
  // ─── Empty / whitespace ───
  it("allows empty string", () => {
    const r = checkContent("");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  it("allows whitespace-only string", () => {
    const r = checkContent("   \n\t  ");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  // ─── Clean content ───
  it("allows normal text", () => {
    const r = checkContent("This is a great idea for a SaaS product.");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  // ─── Blocked terms ───
  it("blocks hard-blocked slurs", () => {
    const r = checkContent("That person is a nigger");
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("community guidelines");
  });

  it("blocks slurs case-insensitively", () => {
    const r = checkContent("FAGGOT is not okay");
    expect(r.allowed).toBe(false);
  });

  it("uses word boundaries — avoids Scunthorpe problem", () => {
    const r = checkContent("I visited Scunthorpe last summer");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  // ─── Flagged terms ───
  it("flags mild profanity but allows it", () => {
    const r = checkContent("This idea is shit");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain("inappropriate");
  });

  it("flags profanity case-insensitively", () => {
    const r = checkContent("What the FUCK is this?");
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(true);
  });

  // ─── Spam patterns ───
  it("flags 10+ repeated characters", () => {
    const r = checkContent("aaaaaaaaaa");
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain("spam");
  });

  it("does NOT flag 9 repeated characters", () => {
    const r = checkContent("aaaaaaaaa");
    expect(r.flagged).toBe(false);
  });

  it("flags 50+ chars of ALL CAPS", () => {
    const r = checkContent("A".repeat(51));
    expect(r.flagged).toBe(true);
  });

  it("flags 49 repeated chars via repeated-char pattern", () => {
    // 49 A's triggers (.)\1{9,} (repeated char), not ALL CAPS
    const r = checkContent("A".repeat(49));
    expect(r.flagged).toBe(true);
  });

  it("flags multiple URLs separated by whitespace", () => {
    // Regex requires \s+ directly between URLs
    const r = checkContent("http://site1.com http://site2.com");
    expect(r.flagged).toBe(true);
  });

  it("does NOT flag URLs separated by words", () => {
    // "and" between URLs means \S+ doesn't match
    const r = checkContent("Check http://site1.com and http://site2.com");
    expect(r.flagged).toBe(false);
  });

  it("does NOT flag single URL", () => {
    const r = checkContent("Visit http://mysite.com for details");
    expect(r.flagged).toBe(false);
  });

  it("flags commercial spam keywords", () => {
    const r = checkContent("Click here for free money!");
    expect(r.flagged).toBe(true);
  });

  // ─── ReDoS protection ───
  it("handles long URL-heavy input without hanging", () => {
    const urls = Array.from({ length: 100 }, (_, i) => `http://site${i}.com`).join(" ");
    const start = performance.now();
    checkContent(urls);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100); // should complete in <100ms
  });

  // ─── Priority: blocked > flagged > clean ───
  it("blocks even when flagged terms also present", () => {
    const r = checkContent("fuck those nigger people");
    expect(r.allowed).toBe(false); // blocked takes priority
  });
});

describe("checkMultipleFields", () => {
  it("returns clean when all fields are clean", () => {
    const r = checkMultipleFields([
      { name: "title", text: "My Great Idea" },
      { name: "summary", text: "A helpful product" },
    ]);
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(false);
  });

  it("returns blocked field name", () => {
    const r = checkMultipleFields([
      { name: "title", text: "Good title" },
      { name: "summary", text: "nigger content" },
    ]);
    expect(r.allowed).toBe(false);
    expect(r.fieldName).toBe("summary");
  });

  it("returns first flagged field when none blocked", () => {
    const r = checkMultipleFields([
      { name: "title", text: "Good title" },
      { name: "tag_0", text: "shit" },
      { name: "tag_1", text: "fuck" },
    ]);
    expect(r.allowed).toBe(true);
    expect(r.flagged).toBe(true);
    expect(r.fieldName).toBe("tag_0");
  });
});

describe("enforceLength", () => {
  it("returns text unchanged when within limit", () => {
    const r = enforceLength("hello", 10);
    expect(r.text).toBe("hello");
    expect(r.truncated).toBe(false);
  });

  it("truncates text exceeding limit", () => {
    const r = enforceLength("hello world", 5);
    expect(r.text).toBe("hello");
    expect(r.truncated).toBe(true);
  });

  it("handles exact length", () => {
    const r = enforceLength("hello", 5);
    expect(r.text).toBe("hello");
    expect(r.truncated).toBe(false);
  });
});
