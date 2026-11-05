import { describe, expect, it } from "vitest";
import { noticeError, quorum, tallyVotes, type WeightedUnit } from "../lph";

const units = (coefs: number[]): WeightedUnit[] => coefs.map((coefficient, i) => ({ unitId: `u${i}`, coefficient }));
// 10 units of 10% each
const ten = units(Array(10).fill(10));

describe("quorum", () => {
  it("requires majority of owners and coefficients on first call", () => {
    expect(quorum(ten, ten.slice(0, 6), false).reached).toBe(true);
    expect(quorum(ten, ten.slice(0, 5), false).reached).toBe(false);
  });
  it("requires both owners and coefficients", () => {
    const skew = units([40, 30, 5, 5, 5, 5, 5, 5]);
    // 5 of 8 owners but only 25% coefficient
    expect(quorum(skew, skew.slice(3), false).reached).toBe(false);
    // 2 of 8 owners with 70% coefficient
    expect(quorum(skew, skew.slice(0, 2), false).reached).toBe(false);
  });
  it("has no minimum on second call", () => {
    expect(quorum(ten, ten.slice(0, 2), true).reached).toBe(true);
  });
});

describe("tallyVotes", () => {
  const present = ten.slice(0, 8);
  const vote = (yes: number, no: number, abstain = 0) =>
    present.slice(0, yes + no + abstain).map((u, i) => ({
      unitId: u.unitId,
      choice: (i < yes ? "YES" : i < yes + no ? "NO" : "ABSTAIN") as "YES" | "NO" | "ABSTAIN",
    }));

  it("simple majority on first call counts all owners", () => {
    expect(tallyVotes({ majority: "SIMPLE", all: ten, present, votes: vote(6, 2), secondCall: false }).result).toBe("APPROVED");
    expect(tallyVotes({ majority: "SIMPLE", all: ten, present, votes: vote(5, 3), secondCall: false }).result).toBe("REJECTED");
  });

  it("simple majority on second call counts attendees", () => {
    expect(tallyVotes({ majority: "SIMPLE", all: ten, present, votes: vote(5, 3), secondCall: true }).result).toBe("APPROVED");
    expect(tallyVotes({ majority: "SIMPLE", all: ten, present, votes: vote(4, 4), secondCall: true }).result).toBe("REJECTED");
  });

  it("three fifths of all owners and coefficients", () => {
    expect(tallyVotes({ majority: "THREE_FIFTHS", all: ten, present, votes: vote(6, 2), secondCall: false }).result).toBe("APPROVED");
    expect(tallyVotes({ majority: "THREE_FIFTHS", all: ten, present, votes: vote(5, 3), secondCall: false }).result).toBe("REJECTED");
  });

  it("unanimity with absentees is provisional", () => {
    expect(tallyVotes({ majority: "UNANIMITY", all: ten, present, votes: vote(8, 0), secondCall: false }).result).toBe("PROVISIONAL");
    expect(tallyVotes({ majority: "UNANIMITY", all: ten, present: ten, votes: ten.map((u) => ({ unitId: u.unitId, choice: "YES" as const })), secondCall: false }).result).toBe("APPROVED");
    expect(tallyVotes({ majority: "UNANIMITY", all: ten, present, votes: vote(7, 1), secondCall: false }).result).toBe("REJECTED");
  });

  it("informative items have no vote", () => {
    expect(tallyVotes({ majority: "INFORMATIVE", all: ten, present, votes: [], secondCall: false }).result).toBe("NO_VOTE");
  });

  it("weights by coefficient", () => {
    const skew = units([60, 10, 10, 10, 10]);
    // 3 of 5 owners vote yes but only 30% of coefficient
    const votes = skew.map((u, i) => ({ unitId: u.unitId, choice: (i === 0 || i === 4 ? "NO" : "YES") as "YES" | "NO" }));
    const t = tallyVotes({ majority: "SIMPLE", all: skew, present: skew, votes, secondCall: false });
    expect(t.yes.coefficient).toBe(30);
    expect(t.result).toBe("REJECTED");
  });
});

describe("noticeError", () => {
  const now = new Date("2026-06-01T10:00:00Z");
  it("enforces 6 days for ordinaria", () => {
    expect(noticeError("ORDINARIA", new Date("2026-06-05T10:00:00Z"), now)).toMatch(/6 días/);
    expect(noticeError("ORDINARIA", new Date("2026-06-08T10:00:00Z"), now)).toBeNull();
  });
  it("allows short notice for extraordinaria", () => {
    expect(noticeError("EXTRAORDINARIA", new Date("2026-06-02T10:00:00Z"), now)).toBeNull();
  });
  it("rejects past dates", () => {
    expect(noticeError("EXTRAORDINARIA", new Date("2026-05-01T10:00:00Z"), now)).toMatch(/futura/);
  });
});
