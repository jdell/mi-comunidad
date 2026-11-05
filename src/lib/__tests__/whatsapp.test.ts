import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("whatsapp helpers", () => {
  it("sanitizes template params", async () => {
    const { sanitizeParam, toWhatsAppNumber } = await import("../whatsapp");
    expect(sanitizeParam("Hola\n\nvecinos\tde     la comunidad")).toBe("Hola · vecinos · de   la comunidad");
    expect(sanitizeParam("x".repeat(20), 10)).toHaveLength(10);
    expect(toWhatsAppNumber("+34 612 345 678")).toBe("34612345678");
  });
});
