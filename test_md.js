const MarkdownIt = require('markdown-it');
const cheerio = require('cheerio');
const md = new MarkdownIt();
const text = `![OpenDev](https://substackcdn.com/image/fetch/$s_!XWY3!,w_1456,c_limit,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd0465e70-d947-488c-9565-9924593322a9_998x477.png)
And a table:

| Column 1 | Column 2 |
|----------|----------|
| A        | B        |
`;
const html = md.render(text);
console.log("HTML:", html);
const $content = cheerio.load(html);

// mimic extractParagraphs
$content('body').children().each((_, elem) => {
  const tagName = elem.tagName;
  console.log("TAG:", tagName);
  if (tagName === 'p') {
    const imgs = $content(elem).find('img');
    console.log("P IMGS LENGTH:", imgs.length);
    imgs.each((_, imgElem) => {
      console.log("IMG SRC:", $content(imgElem).attr('src'));
    });
  } else if (tagName === 'table') {
    console.log("FOUND TABLE");
    console.log("TABLE OUTER HTML:", cheerio.html(elem));
  }
});
