
const Config = require('../../../config/app_config');
const request = require('request');

module.exports.captcha = (req, res) => {
    const secretKey = Config.CAPTCHA.SECRETKEY;
    let token = req.body.recaptcha;
    if (token === null || token === undefined) {
        res.status(201).send({
            success: false,
            message: 'Token is empty or invalid',
        });
        return console.error('token empty');
    }
    const url =
        'https://www.google.com/recaptcha/api/siteverify?secret=' +
        secretKey +
        '&response=' +
        token +
        '&remoteip=' +
        req.connection.remoteAddress;
    request(url, function (err, response, body) {
        body = JSON.parse(body);
        //check if the validation failed
        if (body.success !== undefined && !body.success) {
            res.send({ success: false, message: 'recaptcha failed' });
            return console.error('failed');
        }
        //if passed response success message to client
        res.send({ success: true, message: 'recaptcha passed' });
    });
};