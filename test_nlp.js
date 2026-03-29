const nlp = require('compromise');
const doc = nlp("![IMG]OpenDev|https://substackcdn.com/image/fetch/$s_!XWY3!,w_1456/something.png");
console.log(doc.sentences().out('array'));
