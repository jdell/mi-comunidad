import { Prisma } from "@/generated/prisma/client";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface UnitSeed {
  label: string;
  floor: string | null;
  door: string | null;
  coefficient: Prisma.Decimal;
}

/** Split 100% into `n` equal coefficients (4 decimals); the last unit absorbs rounding. */
export function equalCoefficients(n: number): Prisma.Decimal[] {
  if (n <= 0) return [];
  const each = new Prisma.Decimal(100).dividedBy(n).toDecimalPlaces(4, Prisma.Decimal.ROUND_DOWN);
  const out = Array.from({ length: n }, () => each);
  out[n - 1] = new Prisma.Decimal(100).minus(each.times(n - 1));
  return out;
}

/**
 * Generate unit seeds. With floors × doorsPerFloor, labels look like "1ºA";
 * otherwise units are numbered "1".."N".
 */
export function generateUnits(opts: { count: number; floors?: number | null; doorsPerFloor?: number | null }): UnitSeed[] {
  const { floors, doorsPerFloor } = opts;
  if (floors && doorsPerFloor) {
    const coefs = equalCoefficients(floors * doorsPerFloor);
    const units: UnitSeed[] = [];
    for (let f = 1; f <= floors; f++) {
      for (let d = 0; d < doorsPerFloor; d++) {
        const door = LETTERS[d] ?? String(d + 1);
        units.push({ label: `${f}º${door}`, floor: String(f), door, coefficient: coefs[units.length]! });
      }
    }
    return units;
  }
  const coefs = equalCoefficients(opts.count);
  return coefs.map((coefficient, i) => ({ label: String(i + 1), floor: null, door: null, coefficient }));
}

export function sumCoefficients(units: { coefficient: Prisma.Decimal | number | string }[]) {
  return units.reduce((acc, u) => acc.plus(u.coefficient), new Prisma.Decimal(0)).toNumber();
}
