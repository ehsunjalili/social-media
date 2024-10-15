const redis = require('redis');

const redisClient = redis.createClient();
redisClient.on('error', (err) => {
    console.log(err);
});
redisClient.connect().then(() => {
    console.log('Redis connected !');
});

module.exports = redisClient