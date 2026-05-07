import axios from "axios";

export async function processFeed(urls: string[]) {
  try {
    const response = await axios.post("/api/process-feed", { urls });
    return response.data.results;
  } catch (error) {
    console.error("Feed API Error:", error);
    throw error;
  }
}
