const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

module.exports.authCookie = async (req, res) => {

    const apiBaseUrl = process.env.DALGO_API_BASEURL;

    const payload = {
        "username": process.env.DALGO_USERNAME,
        "password": process.env.DALGO_PASSWORD,
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
        // auth dalgo
        let auth = await client.post(`${apiBaseUrl}security/login`, payload);

        // get csrf
        client.defaults.headers.common['Authorization'] = 'Bearer ' + auth.data.access_token;
        let csrf = await client.get(`${apiBaseUrl}security/csrf_token/`);

        // get guest token
        const guestPayload = {
            "user": {
                "username": process.env.DALGO_USERNAME,
                // "first_name": "Cityfinance",
                // "last_name": "in"
            },
            "resources": req.body.resources,
            "rls": []
        };
        client.defaults.headers.common['X-CSRFToken'] = csrf.data.result;
        let guest = await client.post(`${apiBaseUrl}security/guest_token/`, guestPayload);

        res.status(200).json(guest.data);
    } catch (e) {
        // console.error('error', e);
        res.status(400).json({ msg: 'something went wrong' });
    }


};