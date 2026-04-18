const sass = require('sass');

const scss = `
.test {
  transform: scale(#{1.05});
}
`;

try {
  const result = sass.compileString(scss);
  console.log("SUCCESS:");
  console.log(result.css);
} catch (e) {
  console.log("FAILED:");
  console.log(e.message);
}
