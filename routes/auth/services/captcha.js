
const request = require("request");
const Config = require("../../../config/app_config");


function verifyRecaptchaToken(token, remoteIp) {
    // console.log("CAPTCHA Verification Started", token, remoteIp);
    return new Promise((resolve, reject) => {
        if (!Config.CAPTCHA.ENABLED) {
            return resolve({
                success: true,
                skipped: true,
                message: "recaptcha validation disabled"
            });
        }

        if (!token) {
            return reject(new Error("Token is empty or invalid"));
        }

        const secretKey = Config.CAPTCHA.SECRETKEY;
        const url =
            "https://www.google.com/recaptcha/api/siteverify?secret=" +
            secretKey +
            "&response=" +
            token +
            "&remoteip=" +
            remoteIp;

        request(url, function (err, response, body) {
            if (err) {
                return reject(err);
            }

            try {
                const parsedBody = JSON.parse(body);
                console.log("CAPTCHA Verification Result", parsedBody);
                if (parsedBody.success !== undefined && !parsedBody.success) {
                    return reject(new Error("recaptcha failed"));
                }

                resolve(parsedBody);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
}

module.exports = { verifyRecaptchaToken };

module.exports.captcha = async (req, res, next) => {
    try {
        await verifyRecaptchaToken(
            req.body.recaptcha || req.body.captcha,
            req.connection.remoteAddress
        );

        if (typeof next === "function") {
            return next();
        }

        return res.status(200).send({ success: true, message: 'recaptcha passed' });
    } catch (error) {
        return res.status(400).send({
            success: false,
            message: error.message || 'recaptcha failed'
        });
    }
};

