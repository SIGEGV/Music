import nodemailer from "nodemailer";
import { apiError } from "./apiError.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
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
    console.error(`❌ Error sending OTP to ${email}:`, error.message);
    throw new apiError(500, "Unable to Send Otp");
  }
};

export { sendOtp };
