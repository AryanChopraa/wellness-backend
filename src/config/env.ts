import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wellness-platform',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10),
  },
  venice: {
    apiKey: process.env.VENICE_API_KEY ?? '',
    model: process.env.VENICE_CHAT_MODEL ?? 'venice-uncensored',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    titleModel: process.env.OPENAI_TITLE_MODEL ?? 'gpt-4.1-nano',
  },
  gcs: {
    bucket: process.env.GCS_BUCKET ?? '',
    /** Path to service account JSON key file. Or set GOOGLE_APPLICATION_CREDENTIALS. */
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? process.env.GCS_KEY_FILENAME ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.RESEND_FROM ?? 'OTP <onboarding@resend.dev>',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '',
  },
};
