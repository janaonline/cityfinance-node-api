const User = require('../../../models/User');
const Service = require('../../../service');
const Response = require('../../../service').response;



module.exports.resendAccountVerificationLink = async (req, res) => {
    try {
        let ulbflagForEmail = false;
        let query = [
            { censusCode: req.sanitize(req.body.email) },
            { sbCode: req.sanitize(req.body.email) },
        ];
        if (req.body.email.includes('@')) {
            ulbflagForEmail = true;
            query = [{ email: req.sanitize(req.body.email), isDeleted: false }];
        }
        let keys = [
            '_id',
            'email',
            'role',
            'name',
            'isEmailVerified',
            'isLocked',
            'accountantEmail',
        ];
        let user = await User.findOne({ $or: query }, keys.join(' ')).exec();
        if (!user) return Response.BadRequest(res, req.body, `Email not Found`);
        if (user.isEmailVerified)
            return Response.BadRequest(
                res,
                req.body,
                'Account is already activated.'
            );
        if (user.isLocked)
            return Response.BadRequest(
                res,
                req.body,
                'Activation link cannot be send since account is locked. Kindly wait until account is unlocked, then try again.'
            );
        const validUserTypes = ['USER', 'ULB', 'STATE', 'PARTNER', 'MoHUA'];
        if (!validUserTypes.includes(user.role))
            return Response.BadRequest(
                res,
                req.body,
                `Account Reactivation feature is not available for role: ${user.role}.`
            );
        /**
         * @description In case of USER role, the password is already set during registeration process. But for others, the password need to be set after account is verified.
         */
        if (!ulbflagForEmail) {
            user.email = user.accountantEmail;
        }
        const data = {
            _id: user['_id'],
            email: user['email'],
            role: user['role'],
            name: user['name'],
            forgotPassword: user.role !== 'USER',
        };

        let link = await Service.emailVerificationLink(
            user._id,
            req.currentUrl,
            true
        );
        const template = Service.emailTemplate.sendAccountReActivationEmail(
            user,
            link,
            ulbflagForEmail
        );
        // let mailOptions = {
        //     to: user.email,
        //     subject: template.subject,
        //     html: template.body,
        // };
        let mailOptions =     {
            Destination: {
              /* required */
              ToAddresses: [user.email]
            },
            Message: {
              /* required */
              Body: {
                /* required */
                Html: {
                  Charset: "UTF-8",
                  Data:  template.body
                },
              },
              Subject: {
                Charset: 'UTF-8',
                Data:template.subject
              }
            },
            Source: process.env.EMAIL,
            /* required */
            ReplyToAddresses: [process.env.EMAIL],
          }
        Service.sendEmail(mailOptions);
        return Response.OK(
            res,
            {},
            `Account verification link sent to ${user.email}`
        );
    } catch (e) {
        console.error(e);
        return Response.BadRequest(res, req.body, `Exception occurred.`);
    }
};