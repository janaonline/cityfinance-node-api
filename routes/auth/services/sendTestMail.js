const Service = require("../../../service");
module.exports.sendMail = async(req,res) =>{
console.log('Hi')
let params = {
    Destination: {
      /* required */
      ToAddresses: ['vishu.gupta.dtu@gmail.com']
    },
    Message: {
      /* required */
      Body: {
        /* required */
        Html: {
          Charset: "UTF-8",
          Data: `<h3>Hi $\{name\}!</h3><br/>
  <p>Your OTP for Something Something Service Hub is:<em> $\{otp\}</em>
  </p><br/>
  <p>Regards,<br/>
  Something Something Service Hub Team</p>
  `
        },
      
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `$\{otp\} is the  OTP for Something Something Service Hub!`
      }
    },
    Source: process.env.EMAIL,
    /* required */
    ReplyToAddresses: [process.env.EMAIL],
  };
await Service.sendEmail(params);

return res.send('mail sent')
}