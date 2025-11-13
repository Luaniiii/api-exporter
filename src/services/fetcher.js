const axios = require('axios');


async function fetchEndpoint(endpoint) {
    const opts = {
        method: endpoint.method || 'GET',
        url: endpoint.url,
        headers: endpoint.headers || {},
        timeout: 30000,
    };
    const res = await axios(opts);
    return res.data;
}


module.exports = { fetchEndpoint };