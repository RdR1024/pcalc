// pcalc.test.js  -- unit tests for pcalc.js  Execute with Jest
const P = require("./pcalc.js");
const pcalc = P.pcalc;
const calcvars = P.calcvars;
var WG = "`pr Rain=0.2` `pr Sprinkler:Rain=0.01` `pr Sprinkler:-Rain=0.4` `pr Wet:-Sprinkler,-Rain=0` `pr Wet:-Sprinkler,Rain=0.8` `pr Wet:Sprinkler,-Rain=0.9` `pr Wet:Sprinkler,Rain=0.99` `%pr Wet?` ";
var WG = "`pr Rain=0.2` `pr Sprinkler:Rain=0.01` `pr Sprinkler:-Rain=0.4` `pr Wet:-Sprinkler,-Rain=0` `pr Wet:-Sprinkler,Rain=0.8` `pr Wet:Sprinkler,-Rain=0.9` `pr Wet:Sprinkler,Rain=0.99` `%pr Wet?` ";
var Simple = "<p>`probability of Y given X is 50%`</p><p>`probability of X is 50%`</p><p>So, the `%probability of Y?`</p>";
var Kernel = "`pr S=1%` `pr V1=5%` `pr V2=5%` `pr V3=5%` `pr W1p=1%` `pr W2p=1%` `pr W3p=1%` `pr W1:W1p=100%` `pr W1:S=90%` `pr W2:W2p=100%` `pr W2:S=90%` `pr W3:W3p=100%`  `pr W3:S=90%` `pr W1:V1 & -S=40%` `pr W2:V2 & -S=40%` `pr W3:V3 & -S=40%` `%pr W1?` `%pr W2?` `%pr W3?` `%pr W3: W1,V1,W2,V2?` `%pr S:W1,V1,W2,V2,W3,V3?`"; 
var Loop = "`pr X:Y=0.5` `pr Y:X=0.5` `pr Y?`";
var Unbalanced = "`pr X=0.5";
var Black = "`pr Plane=10%` `pr Drone=5%` `pr Intercept:Plane=85%` `pr Intercept: -Plane=10%` `pr Report: Drone=95%` `pr Report: -Drone=5%` `pr RusExpert: Plane=80%` `pr RusExpert: -Plane=40%` `pr USExpert: Drone=70%` `pr USExpert: -Drone=20%` `pr Radar:Drone=95%` `pr Radar: Plane=90%` `pr Radar: -(Plane or Drone) =0.5%` `%pr Plane: (Intercept & Report & Radar &  -RusExpert & -USExpert)`";


test("zero input", () => {
    expect(pcalc("")).toEqual(0);
});

test("rubbish input", () => {
    expect(pcalc(";asdjfg;likuser")).toEqual(false);
});

test("single number input", () =>{
    expect(pcalc("1")).toEqual(1);
});

test("max integer input", () =>{
    expect(pcalc("9007199254740991")).toEqual(9007199254740991);
});

test("single float input", () =>{
    expect(pcalc("2.718281828459045")).toEqual(2.718281828459045);
});

test("single float input - no leading 0", () =>{
    expect(pcalc(".718281828459045")).toEqual(0.718281828459045);
});

test("single scientific notation input: 2e2", () =>{
    expect(pcalc("2e2")).toEqual(4);
});

test("single scientific notation input: 10e-2", () =>{
    expect(pcalc("10e-2")).toEqual(0.01);
});

test("single scientific notation input: 5.25e-0.25", () =>{
    expect(pcalc("5.25e-0.25")).toEqual(0.6606328636027614);
});

test("single scientific notation input: 10e-.25", () =>{
    expect(pcalc("10e-.25")).toEqual(0.5623413251903491);
});

test("calculate 1+2*3", () => {
    expect(pcalc("1+2*3")).toEqual(7);
});


test("calculate 1+-2*3", () => {
    expect(pcalc("1+-2*3")).toEqual(-5);
});

test("calculate -1+-2*3", () => {
    expect(pcalc("-1+-2*3")).toEqual(-7);
});

test("calculate 1+4/2", () => {
    expect(pcalc("1+4/2")).toEqual(3);
});

test("calculate (1+2)*3", () => {
    expect(pcalc("(1+2)*3")).toEqual(9);
});

test("calculate -(1+2)*3", () => {
    expect(pcalc("-(1+2)*3")).toEqual(-9);
});

test("calculate 10^2", () => {
    expect(pcalc("10^2")).toEqual(100);
});

test("use variable in arithmetic X=10", () =>{
    expect(pcalc("X=10")).toEqual(10);
});

test("calculate missing parenthesis (1+2", () => {
    expect(pcalc("(1+2")).toEqual(false);
});

test("erroneous arithmetic term like 1*foo", () => {
    expect(pcalc("1+foo")).toEqual(false);
    expect(pcalc("1-foo")).toEqual(false);
    expect(pcalc("1^foo")).toEqual(false);
    expect(pcalc("1*foo")).toEqual(false);
    expect(pcalc("1/foo")).toEqual(false);
});

test("divide by zero: 1/0", () => {
    expect(pcalc("1/0")).toEqual(Infinity);
});

test("divide by zero: 0/0", () => {
    expect(pcalc("0/0")).toEqual(0/0);
});

/* can't make throws work in Jest
test("value of unknown probability variable", () => {
    expect(pcalc("pr Z & Q")).toThrowError("no variables given in the probability network null");
});
*/
test("declare prob Y = 20%", () => {
    expect(pcalc("prob Y = 20%")).toEqual(0.2);
});

test("declare different probability functors", () => {
    expect(pcalc("probability of Y = 20%")).toEqual(0.2);
    expect(pcalc("probability Y=0")).toEqual(0);
    expect(pcalc("prob Y=0.5")).toEqual(0.5);
    expect(pcalc("pr Y=0.6")).toEqual(0.6);
    expect(pcalc("chance of Y=0.4")).toEqual(0.4);
    expect(pcalc("chance Y=0.2")).toEqual(0.2);
});

/* can't make throws work in Jest
test("Erroneous probability logic pr X | pr Y", () => {
    expect(pcalc("pr Rain | pr Sprinkler")).toThrowError("no variables given in the probability network null");
});
*/
test("Missing parenthesis in probability logic", () => {
    expect(pcalc("prob (Rain | Sprinkler")).toEqual(false);
    expect(pcalc("prob -(Rain | Sprinkler")).toEqual(false);
});

/* can't make throws work in Jest
test("Erroneous condition in prob logic", () => {
    expect(pcalc("pr Rain: foo")).toThrowError("no variables given in the probability network null");
});
*/

test("Result of wetgrass", () => {
    expect(calcvars(WG)).toMatch(/id="r0"> 45%/);
});

test("Result of Kernel", () => {
    expect(calcvars(Kernel)).toMatch(/id="r0"> 10%/);
});

test("Result of Blacksite", () => {
    expect(calcvars(Black)).toMatch(/id="r0"> 53%/);
});

test("Result of Loop", () => {
    expect(calcvars(Loop)).toMatch(/id="r0"> error: variable dependency issue/);
});