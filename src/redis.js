const Redis = require('ioredis');

const redisUri = process.env.REDIS_URI;
const redis = new Redis(redisUri);

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

const redisClient = redis;
// const redisClient = redis.createClient();
// redisClient.on('error', (err) => {
//     console.log(err);
// });
// redisClient.connect().then(() => {
//     console.log('Redis connected !');
// });

module.exports = redisClient