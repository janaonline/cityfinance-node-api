
const User = require('../../../models/User');
const Helper = require('../../../_helper/constants');
const Service = require('../../../service');
const Response = require('../../../service').response;


module.exports.forgotPassword = async (req, res) => {
    let msg = `Requested ULB Code/Census Code:${req.body.email} is not registered.`;
    let verify_msg = `Requested ULB Code/Census Code:${req.body.email} is not verified.`;
    let ulbflagForEmail = false;
    let query = [
        { censusCode: req.sanitize(req.body.email) },
        { sbCode: req.sanitize(req.body.email) },
    ];
    if (req.body.email.includes('@')) {
        ulbflagForEmail = true;
        msg = `Requested email:${req.body.email} is not registered.`;
        verify_msg = `Requested email:${req.body.email} is not verified.`;
        query = [{ email: req.sanitize(req.body.email) }];
    }

    try {
        let user = await User.findOne({ $or: query }).exec();
        if (user) {
            if (user.isDeleted) {
                return Response.BadRequest(res, {}, msg);
            } else if (!user.isEmailVerified) {
                return Response.BadRequest(res, {}, verify_msg);
            }
            else if (!user.isRegistered && user.role == 'ULB') {
                return Response.BadRequest(res, {}, 'Profile Not Updated. Please Login with the credentials received from your State Office.');
            } else if (user.isLocked) {
                return Response.BadRequest(
                    res,
                    {},
                    `Your account is temporarily locked for 1 hour`
                );
            } else {
                let newPassword = Service.getRndInteger(
                    10000,
                    99999
                ).toString();
                let passwordHash = await Service.getHash(newPassword);
                let passwordExpires =
                    Date.now() + Helper.PASSWORDEXPIRETIME.TIME; // 1 hour
                let passwordHistory = setPasswordHistory(user, passwordHash);
                if (!ulbflagForEmail) {
                    user.email = user.accountantEmail;
                }
                try {
                    //let du = await User.update({_id:user._id},{$set:{passwordHistory:passwordHistory,password:passwordHash,passwordExpires:passwordExpires}});
                    let du = await User.update(
                        { _id: user._id },
                        { $set: { isPasswordResetInProgress: false } }
                    );
                    let keys = ['_id', 'email', 'role', 'name'];
                    let data = {};
                    for (k in user) {
                        if (keys.indexOf(k) > -1) {
                            data[k] = user[k];
                        }
                    }
                    data['purpose'] = 'EMAILVERFICATION';
                    data['forgotPassword'] = true;
                    let link = await Service.emailVerificationLink(
                        user._id,
                        req.currentUrl,
                        true
                    );
                    let template = Service.emailTemplate.userForgotPassword(
                        user.name,
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
                        `Link sent to email ${user.email}`
                    );
                } catch (e) {
                    return Response.BadRequest(
                        res,
                        {},
                        `Exception: ${e.message}.`
                    );
                }
            }
        } else {
            return Response.BadRequest(
                res,
                {},
                `Requested email:${req.body.email} is not registered.`
            );
        }
    } catch (e) {
        return Response.BadRequest(res, {}, `Exception:${e.message}`);
    }
};

module.exports.gettingHash = async(req,res)=>{
    let str = req.body.input
   let output = await Service.getHash(str)
   res.json({
       hash: output
   })
}

function setPasswordHistory(user, passwordHash) {
    if (
        Array.isArray(user.passwordHistory) &&
        user.passwordHistory.length < 3
    ) {
        user.passwordHistory.push(passwordHash);
    } else {
        user.passwordHistory.shift();
        user.passwordHistory.push(passwordHash);
    }
    return user.passwordHistory;
}
