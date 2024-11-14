const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

module.exports.authDalgo = async (req, res) => {

    const apiBaseUrl = `https://janaagraha.dalgo.in/api/v1/`;

    const payload = {
        "password": "Cityfinance@123",
        "username": "cityfinance.in",
        "refresh": true,
        "provider": "db"
    };

    try {

        let auth = await axios.post(`${apiBaseUrl}security/login`, payload, {
            withCredentials: true // Allows sending and receiving cookies with the request
        });
        // console.log('auth', auth.data.access_token);
        // axios.defaults.headers.get['Authorization'] = 'Bearer hjmkhjkh' //+ auth.data.access_token;
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + auth.data.access_token;
        let csrf = await axios.get(`${apiBaseUrl}security/csrf_token/`, {
            withCredentials: true // Allows sending and receiving cookies with the request
        });

        const guestPayload = {
            "user": {
                "username": "cityfinance.in",
                "first_name": "Cityfinance",
                "last_name": "in"
            },
            "resources": [
                {
                    "type": "dashboard",
                    "id": "6476518a-7dfd-4614-87c2-8a315c9ece25"
                },
                {
                    "type": "dashboard",
                    "id": "463904ae-53e5-4e86-8f41-314ad84fe11b"
                }
            ],
            "rls": []
        }
        axios.defaults.headers.common['X-CSRFToken'] = csrf.data.result;
        let guest = await axios.post(`${apiBaseUrl}security/guest_token/`,
            guestPayload,
            {
                withCredentials: true,
                headers: {
                    'Authorization': 'Bearer ' + auth.data.access_token,
                    'X-CSRFToken': csrf.data.result,
                    // 'X-CSRFToken': 'IjVhOGE4ZTI4ZGQ0NjM5OGM2OWYyZTIzODg2NWMyYzgxNGE2NzJmODgi.ZzR91A.36aCWT31DQsQNtcUVODvRaTQby8',
                    'Content-Type': 'application/json',
                    'Referer': 'https://janaagraha.dalgo.in',
                    // 'Cookie': 'session=eyJfZnJlc2giOmZhbHNlLCJjc3JmX3Rva2VuIjoiNWE4YThlMjhkZDQ2Mzk4YzY5ZjJlMjM4ODY1YzJjODE0YTY3MmY4OCIsImxvY2FsZSI6ImVuIn0.ZzRXQQ.daeOrhPeVK0oUStQPgKgvpW0hHY'
                }
            });

        res.status(200).json(csrf.data);
    } catch (e) {
        console.error('error', e);
        res.status(400).json(e);
    }


};

module.exports.authCookie = async (req, res) => {

    const apiBaseUrl = `https://janaagraha.dalgo.in/api/v1/`;

    const payload = {
        "password": "Cityfinance@123",
        "username": "cityfinance.in",
        "refresh": true,
        "provider": "db"
    };

    try {

        const cookieJar = new tough.CookieJar();

        // Wrap Axios with the cookie jar support
        const client = wrapper(axios.create({
            baseURL: apiBaseUrl,
            jar: cookieJar,          // Attach the cookie jar to Axios
            withCredentials: true,    // Enable cookies in requests
        }));

        let auth = await client.post(`${apiBaseUrl}security/login`, payload);
        // console.log('auth', auth.data.access_token);
        // axios.defaults.headers.get['Authorization'] = 'Bearer hjmkhjkh' //+ auth.data.access_token;
        client.defaults.headers.common['Authorization'] = 'Bearer ' + auth.data.access_token;
        let csrf = await client.get(`${apiBaseUrl}security/csrf_token/`);

        const guestPayload = {
            "user": {
                "username": "cityfinance.in",
                "first_name": "Cityfinance",
                "last_name": "in"
            },
            "resources": [
                {
                    "type": "dashboard",
                    "id": "6476518a-7dfd-4614-87c2-8a315c9ece25"
                }
            ],
            "rls": []
        }
        client.defaults.headers.common['X-CSRFToken'] = csrf.data.result;
        let guest = await client.post(`${apiBaseUrl}security/guest_token/`,
            guestPayload,
            {
                // headers: {
                //     'Referer': 'https://janaagraha.dalgo.in',
                //     // 'Cookie': 'session=eyJfZnJlc2giOmZhbHNlLCJjc3JmX3Rva2VuIjoiNWE4YThlMjhkZDQ2Mzk4YzY5ZjJlMjM4ODY1YzJjODE0YTY3MmY4OCIsImxvY2FsZSI6ImVuIn0.ZzRXQQ.daeOrhPeVK0oUStQPgKgvpW0hHY'
                // }
            });

        res.status(200).json(guest.data);
    } catch (e) {
        console.error('error', e);
        res.status(400).json(e);
    }


};