// loading  the library
const express = require('express');
const path = require('path');
const axios = require('axios');
const redis = require('redis');
const app = express();


const API_URL = 'http://data.fixer.io/';

// connect to Redis
const REDIS_URL = '//localhost:6379';
const client = redis.createClient(REDIS_URL);

client.on('connect', () => {
    console.log(`connected to redis`);
});
client.on('error', err => {
    console.log(`Error: ${err}`);
});


const bluebird = require("bluebird");
// make node_redis promise compatible
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: path.join(__dirname, 'views')
    });
});
app.get('/rate/:date', (req, res) => {
    const date = req.params.date;

    const url = `${API_URL}/api/latest?access_key=d0f7e265b0b49ed7898ea494816c7db4&format=1`;
    const countKey = `USD:${date}:count`;
    const ratesKey = `USD:${date}:rates`;
    console.log(countKey);
    let count;
    client
        .incrAsync(countKey)
        .then(result => {
            count = result;
            return count;
        })
        .then(() => client.hgetallAsync(ratesKey))
        .then(rates => {
            // checking if rates existing in redis
            if (rates) {
                return res.json({ rates, count });
            }

            // else getting from the api
            axios.get(url).then(response => {
                client
                    .hmsetAsync(ratesKey, response.data.rates)
                    .catch(e => {
                        console.log(e)
                    });

                return res.json({
                    count,
                    rates: response.data.rates
                });
            }).catch(error => res.json(error.response.data))

        })
        .catch(e => {
            console.log(e)
        });

});


// starting server
const port = process.env.port || 5000;

app.listen(port, () => {
    console.log(`App listening on port ${port}!`)
});