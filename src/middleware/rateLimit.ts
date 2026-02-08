import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** General auth routes: 100 requests per 15 min per IP */
export const authGeneralLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP send (signup, signin, otp/send): 5 requests per 15 min per IP */
export const otpSendLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  message: { error: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP verify: 10 requests per 15 min per IP */
export const otpVerifyLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
