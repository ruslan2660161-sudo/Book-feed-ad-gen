import axios from 'axios';

async function checkFeed() {
  try {
    const response = await axios.head('https://feeds-cdn.cgorod.pw/feeds/VKBooks.xml');
    console.log('Content-Length:', response.headers['content-length']);
    console.log('Content-Type:', response.headers['content-type']);
  } catch (error) {
    console.error('Error fetching feed headers:', error.message);
  }
}

checkFeed();
