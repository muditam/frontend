import { roundMoney } from "./money";

describe("roundMoney", () => {
  test.each([
    [465 - (465 * 99.6) / 100, 1.86],
    [465 - (465 * 99) / 100, 4.65],
    [(465 * 99.7) / 100, 463.61],
    [465 - roundMoney((465 * 99.7) / 100), 1.39],
    [200.1 + 100.2, 300.3],
  ])("rounds %p to currency precision", (input, expected) => {
    expect(roundMoney(input)).toBe(expected);
  });
});
