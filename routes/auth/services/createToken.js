const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const LoginHistory = require('../../../models/LoginHistory');
const Config = require('../../../config/app_config');
const Helper = require('../../../_helper/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const Service = require('../../../service');

function buildTokenPayload(user) {
    const source =
        user && typeof user.toObject === 'function' ? user.toObject() : user || {};
    const keys = [
        '_id',
        // 'email',
        // 'role',
        // 'name',
        // 'ulb',
        // 'state',
        // 'isActive',
        // 'isRegistered',
    ];
    const data = {};

    keys.forEach((key) => {
        if (source[key] !== undefined) {
            data[key] = source[key];
        }
    });

    data.passwordExpires = source.passwordExpires;

    return data;
}

function issueAccessToken(data) {
    return jwt.sign(
        {
            ...data,
            purpose: 'WEB',
        },
        Config.JWT.SECRET,
        {
            expiresIn: Config.JWT.TOKEN_EXPIRY,
        }
    );
}

function issueRefreshToken(userId) {
    return jwt.sign(
        { sub: userId.toString() },
        Config.JWT.REFRESH_SECRET,
        { expiresIn: Config.JWT.REFRESH_TOKEN_EXPIRY }
    );
}

async function saveRefreshToken(userId, refreshToken) {
    const hash = await Service.getHash(refreshToken);
    await User.findByIdAndUpdate(userId, { refreshTokenHash: hash }).exec();
}

async function createAuthTokens(user, sessionId, body) {
    const data = buildTokenPayload(user);
    const inactiveTime = Date.now() + Helper.INACTIVETIME.TIME;

    const loginHistory = new LoginHistory({
        user: user._id,
        loggedInAt: new Date(),
        visitSession: ObjectId.isValid(sessionId) ? ObjectId(sessionId) : null,
        inactiveSessionTime: inactiveTime,
        loginType: body?.type ? body.type : '15thFC',
    });

    const lh = await loginHistory.save();

    const tokenPayload = {
        ...data,
        lh_id: lh._id,
        sessionId: ObjectId.isValid(sessionId) ? sessionId : null,
    };

    const token = issueAccessToken(tokenPayload);
    const refreshToken = issueRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    const updates = {
        $set: { loginAttempts: 0 },
    };

    if (!user.emailFlag) {
        user.email = user.accountantEmail;
    }

    await User.update({ ulb: ObjectId(user.ulb), role: 'ULB' }, updates).exec();

    return { token, refreshToken };
}

async function rotateRefreshToken(user, loginHistory) {
    const tokenPayload = {
        ...buildTokenPayload(user),
        lh_id: loginHistory._id,
        sessionId: loginHistory.visitSession || null,
    };

    const token = issueAccessToken(tokenPayload);
    const refreshToken = issueRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    return { token, refreshToken };
}

module.exports.buildTokenPayload = buildTokenPayload;
module.exports.issueAccessToken = issueAccessToken;
module.exports.issueRefreshToken = issueRefreshToken;
module.exports.saveRefreshToken = saveRefreshToken;
module.exports.rotateRefreshToken = rotateRefreshToken;
module.exports.createAuthTokens = createAuthTokens;
module.exports.createToken = async (user, sessionId, body) => {
    const tokens = await createAuthTokens(user, sessionId, body);
    return tokens.token;
};
