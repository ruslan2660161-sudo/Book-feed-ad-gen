import sax from "sax";
import axios from "axios";

async function testParse() {
  const response = await axios.get('https://feeds-cdn.cgorod.pw/feeds/VKBooks.xml', {
    responseType: 'stream'
  });

  const saxStream = sax.createStream(false, { trim: true, normalize: true });
  
  let count = 0;
  
  saxStream.on("opentag", (node) => {
    if (node.name === "offer" || node.name === "OFFER") {
      count++;
      if (count % 10000 === 0) {
        console.log(`Parsed ${count} offers`);
      }
    }
  });

  saxStream.on("error", function (this: any, e) {
    console.error("XML Parse Error:", e.message);
    this._parser.error = null;
    this._parser.resume();
  });

  saxStream.on("end", () => {
    console.log(`Finished parsing. Total offers: ${count}`);
  });

  response.data.pipe(saxStream);
}

testParse();
