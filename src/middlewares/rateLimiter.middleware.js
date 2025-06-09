import rateLimit from "express-rate-limit";
/**
 * @middleware otpVerifyLimiter
 * @description Rate limiter middleware for OTP verification requests to prevent brute-force attacks.
 *
 * Applies a limit of 5 OTP verification attempts per IP address every 15 minutes.
 * If the limit is exceeded, it responds with HTTP 429 (Too Many Requests).
 *
 * @usage Attach this middleware to the OTP verification route:
 *    router.post('/verify-otp', otpVerifyLimiter, verifyUserOtpAndRegister);
 *
 * @returns {Function} Express middleware function
 *
 * @status 429 - If the request exceeds the allowed number of attempts
 *
 * @example
 * import { otpVerifyLimiter } from './middlewares/rateLimiter.js';
 * router.post('/verify-otp', otpVerifyLimiter, verifyUserOtpAndRegister);
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 429,
    message: "Too many OTP attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
