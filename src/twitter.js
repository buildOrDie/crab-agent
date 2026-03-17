import { TwitterApi } from "twitter-api-v2";

let twitterClient = null;

function getClient() {
  if (twitterClient) return twitterClient;

  const required = [
    "TWITTER_API_KEY",
    "TWITTER_API_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET",
  ];

  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
  }

  twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  return twitterClient;
}

/**
 * Post a tweet as the $CRAB agent
 */
export async function postTweet(text) {
  const client = getClient();
  const rwClient = client.readWrite;
  const result = await rwClient.v2.tweet(text);
  console.log("🐦 Tweet ID:", result.data.id);
  return result.data;
}
