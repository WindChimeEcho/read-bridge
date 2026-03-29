const cheerio = require('cheerio');
const html = `
<body>
  <h1>Main Title</h1>
  <p>Introduction paragraph 1</p>
  <p>Introduction paragraph 2</p>
  <h2>First Chapter</h2>
  <p>Chapter 1 content</p>
  <h2>Second Chapter</h2>
  <p>Chapter 2 content</p>
</body>
`;
const $ = cheerio.load(html);

const h2Elements = $('h2');
const $bodyChildren = $('body').children();
const firstH2Index = $bodyChildren.index(h2Elements.first());

if (firstH2Index > 0) {
  const beforeH2 = $bodyChildren.slice(0, firstH2Index);
  const content = beforeH2.map((_, el) => $.html(el)).get().join('');
  console.log("BEFORE H2:\n", content);
}
