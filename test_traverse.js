const cheerio = require('cheerio');
const html = `<p>Here is an image: <img src="url1" alt="img1"> and some more text. <strong>Bold</strong> text.</p>`;
const $content = cheerio.load(html);
const paragraphs = [];

function extractBlock(elem) {
  let currentText = '';
  
  function flushText() {
    const t = currentText.trim();
    if (t) paragraphs.push(t);
    currentText = '';
  }

  function traverse(node) {
    if (node.type === 'text') {
      currentText += node.data;
    } else if (node.type === 'tag' && node.tagName === 'img') {
      flushText();
      const src = node.attribs.src;
      const alt = node.attribs.alt || '';
      if (src) paragraphs.push(`![IMG]${alt ? alt + '|' : ''}${src}`);
    } else if (node.type === 'tag') {
      node.children.forEach(traverse);
    }
  }

  traverse(elem);
  flushText();
}

$content('body').children().each((_, elem) => {
  extractBlock(elem);
});
console.log(paragraphs);
