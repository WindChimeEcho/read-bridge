const cheerio = require('cheerio');
const $ = cheerio.load('<table><tr><td>A</td></tr></table>');
const elem = $('table')[0];
console.log($.html(elem));
