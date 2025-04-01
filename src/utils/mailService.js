import nodemailer from "nodemailer";
import { apiError } from "./apiError.js";
import { GMAIL, MESSAGES, STATUS_CODES } from "./utils.constants.js";

const transporter = nodemailer.createTransport({
  service: GMAIL,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendOtp = async (email, otp) => {
  try {
    const mailOption = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `${otp} is your verification code`,
      text: `
      Hello there,

      Your OTP code is ${otp}.
      To verify your account, enter this code.
      Verification code will expire in 5 minutes.

      If you didn't request this code,
      you can ignore this message.


      With regards,
      Music
      `,
    };
    await transporter.sendMail(mailOption);
    return true;
  } catch (error) {
    console.error(`Error sending OTP to ${email}:`, error.message);
    throw new apiError(STATUS_CODES.INTERNAL_SERVER_ERROR, MESSAGES.OTP_FAILED);
  }
};

export { sendOtp };
