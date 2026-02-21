import twilio from 'twilio';
import { env } from '../config/env';

const client = twilio(env.twilio.accountSid, env.twilio.authToken);

/**
 * Send an OTP code to a phone number via Twilio SMS.
 * Throws if the API call fails.
 */
export async function sendOtpSms(to: string, code: string, expiresInMinutes: number): Promise<void> {
  await client.messages.create({
    from: env.twilio.from,
    to,
    body: `${code} is your My Peach sign-in code. It expires in ${expiresInMinutes} minutes. Never share this code with anyone.`,
  });
}
