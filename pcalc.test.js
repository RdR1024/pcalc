// pmath.test.js  -- unit tests for pmath.js  Execute with Jest
const P = require("./pcalc.js");
const pcalc = P.pcalc;

test("zero input", () => {
    expect(pcalc("")).toEqual(0);
});