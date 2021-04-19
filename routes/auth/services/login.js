
const User = require('../../../models/User');
const Service = require('../../../service');
const { createToken } = require('./createToken')
const { getUSer } = require('./getUser')

module.exports.login = async (req, res) => {
    /**Conditional Query For CensusCode/ULB Code **/
    try {
        let user = await getUSer(req.body);
        console.log(user)
        let sessionId = req.headers.sessionid;
        let isMatch = await Service.compareHash(
            req.body.password,
            user.password
        );
        if (isMatch) {
            let token = await createToken(user, sessionId);
            return res.status(200).json({
                success: true,
                message: ``,
                token: token,
                user: {
                    name: user.name,
                    email: user.email,
                    isActive: user.isActive,
                    role: user.role,
                    state: user.state,
                    ulb: user.ulb,
                }
            })
        } else {
            let update = Service.incLoginAttempts(user);
            if (!user.ulbflagForEmail) {
                user.email = user.accountantEmail;
                let up = await User.update({ _id: user._id }, update).exec();
            }
            let attempt = user;
            return res.status(400).json({ message: `Invalid credentials.`, loginAttempts: attempt.loginAttempts })
        }

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
            loginAttempts: error.loginAttempts
        })
    }
};