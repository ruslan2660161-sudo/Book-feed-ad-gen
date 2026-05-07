import axios from 'axios';

async function checkFeedStructure() {
  try {
    const response = await axios.get('https://feeds-cdn.cgorod.pw/feeds/VKBooks.xml', {
      responseType: 'stream'
    });
    
    let data = '';
    response.data.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 2000) {
        console.log(data.substring(0, 2000));
        response.data.destroy();
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error.message);
  }
}

checkFeedStructure();
