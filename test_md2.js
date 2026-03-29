const cheerio = require('cheerio');
const html = `<body>
  <h1>Title</h1>
  <p>P1</p>
  <h2>Subtitle 1</h2>
  <p>P2</p>
  <h3>Subsubtitle</h3>
  <p>P3</p>
  <h2>Subtitle 2</h2>
  <p>P4</p>
  <blockquote><h2>Quote Heading</h2><p>P5</p></blockquote>
</body>`;
const $ = cheerio.load(html);

const headingElements = $('body > h1, body > h2, body > h3, body > h4, body > h5, body > h6');
console.log("Found headings:", headingElements.length);
headingElements.each((_, elem) => {
  const chapterTitle = $(elem).text();
  const level = parseInt(elem.tagName.replace('h', ''), 10);
  console.log("Heading:", chapterTitle, "Level:", level);
  
  const $elem = $(elem);
  let $nextAll = $elem.nextAll();
  let $nextHeading = $nextAll.filter('h1, h2, h3, h4, h5, h6').first();

  let content = '';
  if ($nextHeading.length > 0) {
    let $contents = $nextAll.slice(0, $nextAll.index($nextHeading));
    content = $contents.map((_, el) => $.html(el)).get().join('').trim();
  } else {
    content = $nextAll.map((_, el) => $.html(el)).get().join('').trim();
  }
  console.log("  Content:", content);
});
