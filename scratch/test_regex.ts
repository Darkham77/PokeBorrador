
const regex = /transform:\s*.*?\b(Blur|Scale|Invert|GrayScale|Opacity|Brightness|Translate|Rotate)\(/g;
const fix = (match) => match.replace(/\b(Blur|Scale|Invert|GrayScale|Opacity|Brightness|Translate|Rotate)\(/g, (m) => m.toLowerCase());

const test = "  transform: Translatey(-2px) Scale(1.1);";
console.log("Original:", test);
const result = test.replace(regex, (m) => fix(m));
console.log("Result:  ", result);

const test2 = "  transform: Scale(1.2); transform: Scale(1.3);";
console.log("Original 2:", test2);
const result2 = test2.replace(regex, (m) => fix(m));
console.log("Result 2:  ", result2);
