import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.resend.apiKey);

function otpEmailHtml(code: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your OTP Code</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#1a1a2e;padding:32px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:0.5px;">Wellness Platform</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 48px 32px;">
                <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">Your sign-in code</h2>
                <p style="margin:0 0 32px;color:#555;font-size:15px;line-height:1.6;">
                  Use the code below to sign in. It expires in <strong>${expiresInMinutes} minutes</strong>.
                </p>
                <div style="background:#f0f4ff;border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;">
                  <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#1a1a2e;font-family:monospace;">${code}</span>
                </div>
                <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
                  If you didn't request this code, you can safely ignore this email.<br/>
                  Never share this code with anyone.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 48px;border-top:1px solid #f0f0f0;text-align:center;">
                <p style="margin:0;color:#aaa;font-size:12px;">&copy; ${new Date().getFullYear()} Wellness Platform. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

/**
 * Send an OTP code to an email address via Resend.
 * Throws if the API call fails.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  expiresInMinutes: number
): Promise<void> {
  const { error } = await resend.emails.send({
    from: env.resend.from,
    to,
    subject: `${code} is your Wellness Platform sign-in code`,
    html: otpEmailHtml(code, expiresInMinutes),
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
