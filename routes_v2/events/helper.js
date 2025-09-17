const { sendEmail } = require('../../service/email-v2');

// Takes recipientEmails[], sender Id: update@... 
const sendEmailFn = async (recipientEmails) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Validate email list
    const invalidEmails = recipientEmails.filter(email => !emailPattern.test(email));
    if (invalidEmails.length > 0) {
        console.error("Invalid email addresses found:", invalidEmails);
        return {
            success: false,
            message: "One or more recipient email addresses are invalid.",
            invalidEmails,
        };
    }

    // Optional: Add recipients to DB or log them (TODO)
    // await saveRecipientsToDB(recipientEmails, documentId);

    // Get email content
    const emailContent = getEmailContent();
    if (!emailContent || !emailContent.subject || !emailContent.body) {
        console.error("Invalid email content for document:");
        return {
            success: false,
            message: "Email content is missing or malformed.",
        };
    }

    // Construct mail options
    const mailOptions = {
        Source: process.env.NEWSLETTER_EMAIL,
        Destination: { ToAddresses: recipientEmails },
        ReplyToAddresses: [process.env.NEWSLETTER_EMAIL],
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: emailContent.body,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: emailContent.subject,
            },
        },
    };

    // Send email
    try {
        const response = await sendEmail(mailOptions);
        console.log("Email sent successfully:", response);

        return {
            success: true,
            message: "Email sent successfully.",
            data: response,
        };

    } catch (error) {
        console.error("Failed to send email", {
            error: error.message,
            stack: error.stack,
        });

        return {
            success: false,
            message: "Failed to send email.",
            error: error.message,
        };
    }
};

// Helper: Create email conent.
// TODO: Fetch this from DB.
const getEmailContent = () => {
    return {
        subject: `Success! You're registered for Understanding Revenue Data`,
        body:
            `
      <div style="background-color: '#f4fbf7'; padding: 2rem 3rem">
        <p style="text-align: center;">
            <span style="color: '#0dcaf0'; font-weight: 'bold'; font-size: 1.75rem;">city</span>
            <span style="color: '#183367'; font-weight: 'bold'; font-size: 1.75rem;">finance.in</span>
        </p>

        <div style="margin-top: 1rem; background-color: '#ffffff'; padding: 2rem 3rem; border-radius: 5px">

            <p style="font-size: 1.5rem;">You're now registered for:</p>
            <p style="font-size: 1.5rem;font-weight: bold;">Understanding Revenue Data</p>
            <p style="margin: 0; padding: 0">When: Thursday, SEP 11, 11:00 AM - 12:00 PM</p>
            <p style="margin: 0; padding: 0">Where: Google Meet
                <a href="https://meet.google.com/wax-hfgv-cwf">https://meet.google.com/wax-hfgv-cwf</a>
            </p>

            <hr />
            <p>You'll receive a reminder 24 hours and 15 minutes before the session.</p>

            <br>Regards,<br>
            <p>City Finance Team</p>

        </div>
      </div>
    `,
    };
};

module.exports = {
    sendEmailFn,
}