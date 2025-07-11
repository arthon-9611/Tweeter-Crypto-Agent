import asyncio
import csv
import os
from datetime import datetime
from random import randint
from twikit import Client, TooManyRequests
from configparser import ConfigParser

MINIMUM_TWEETS = 10
QUERY = '(crypto OR bitcoin OR ethereum OR dogecoin OR shiba OR memecoin OR defi) lang:en'

# Load login credentials
config = ConfigParser()
config.read('config.ini')
username = config['X']['username']
email = config['X']['email']
password = config['X']['password']

# Initialize Twitter client
client = Client(language='en-US')

async def login():
    if not os.path.exists('cookies.json') or os.stat('cookies.json').st_size == 0:
        print(f'{datetime.now()} - Logging in...')
        await client.login(auth_info_1=username, auth_info_2=email, password=password)
        client.save_cookies('cookies.json')  # Save cookies after login

async def get_tweets(tweets):
    if tweets is None:
        print(f'{datetime.now()} - Getting tweets...')
        tweets = await client.search_tweet(QUERY, product='Top')  # Await async call
    else:
        wait_time = randint(5, 10)
        print(f'{datetime.now()} - Getting next tweets after {wait_time} seconds...')
        await asyncio.sleep(wait_time)  # Use asyncio.sleep()
        tweets = await tweets.next()  # Await async call

    return tweets

async def fetch_tweets():
    await login()
    client.load_cookies('cookies.json')

    tweet_count = 0
    tweets = None

    with open('crypto_tweets.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Tweet_count', 'Username', 'Text', 'Created At', 'Retweets', 'Likes'])

    while tweet_count < MINIMUM_TWEETS:
        try:
            tweets = await get_tweets(tweets)
        except TooManyRequests as e:
            rate_limit_reset = datetime.fromtimestamp(e.rate_limit_reset)
            print(f'{datetime.now()} - Rate limit reached. Waiting until {rate_limit_reset}')
            wait_time = (rate_limit_reset - datetime.now()).total_seconds()
            await asyncio.sleep(wait_time)
            continue

        if not tweets:
            print(f'{datetime.now()} - No more tweets found')
            break

        for tweet in tweets:
            tweet_count += 1
            tweet_data = [
                tweet_count,
                tweet.user.name,
                tweet.text.replace('\n', ' '),
                tweet.created_at,
                tweet.retweet_count,
                tweet.favorite_count
            ]

            with open('crypto_tweets.csv', 'a', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow(tweet_data)

        print(f'{datetime.now()} - Collected {tweet_count} tweets')

    print(f'{datetime.now()} - Done! Total tweets collected: {tweet_count}')

def collect_tweets() -> None:
    asyncio.run(fetch_tweets())  # Pass the username to the async function
    return True

collect_tweets()