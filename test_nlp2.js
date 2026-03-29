const regex = /[^。！？]+[。！？]/g;
const para = "![IMG]开发测试|https://substackcdn.com/image/fetch/$s_!XWY3!,w_1456/something.png";
const isChinese = /[\u4e00-\u9fa5]/.test(para);
console.log("isChinese:", isChinese);
let sentences = [];
if (isChinese) sentences = para.match(regex) || [];
console.log(sentences);
