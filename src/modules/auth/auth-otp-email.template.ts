interface BuildOtpVerificationEmailInput {
  expiresInMinutes: number;
  otp: string;
  productName: string;
}

interface EscapeHtmlInput {
  value: string;
}

interface OtpVerificationEmailContent {
  html: string;
  subject: string;
  text: string;
}

const otpPattern = /^\d{6}$/;

const escapeHtml = ({ value }: EscapeHtmlInput): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const buildOtpVerificationEmail = ({
  expiresInMinutes,
  otp,
  productName,
}: BuildOtpVerificationEmailInput): OtpVerificationEmailContent => {
  if (!otpPattern.test(otp)) {
    throw new Error('OTP email requires a six-digit numeric code');
  }

  if (!Number.isInteger(expiresInMinutes) || expiresInMinutes < 1) {
    throw new Error('OTP email requires a positive integer expiry');
  }

  const normalizedProductName = productName.trim();

  if (
    !normalizedProductName ||
    normalizedProductName.includes('\r') ||
    normalizedProductName.includes('\n')
  ) {
    throw new Error('OTP email requires a valid product name');
  }

  const expiresInMinutesText = String(expiresInMinutes);
  const expiryUnit = expiresInMinutes === 1 ? 'minute' : 'minutes';
  const escapedExpiresInMinutes = escapeHtml({ value: expiresInMinutesText });
  const escapedOtp = escapeHtml({ value: otp });
  const escapedProductName = escapeHtml({ value: normalizedProductName });
  const subject = `${normalizedProductName}: your one-time code`;
  const text = `${normalizedProductName}
Your one-time verification code

Use this six-digit code to finish signing in or creating your profile:

${otp}

This code expires in ${expiresInMinutesText} ${expiryUnit}.

If you didn't request this code, you can safely ignore this email.
Never share this code with anyone, including someone claiming to be from ${normalizedProductName}.

Meet people at your pace. Start meaningful conversations.`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
    <title>One-time verification code</title>
    <style type="text/css">
      body,
      table,
      td {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }

      table,
      td {
        mso-table-lspace: 0;
        mso-table-rspace: 0;
      }

      table {
        border-spacing: 0;
      }

      @media only screen and (max-width: 620px) {
        .email-container {
          width: 100% !important;
        }

        .outer-pad {
          padding: 16px 8px !important;
        }

        .mobile-pad {
          padding-right: 24px !important;
          padding-left: 24px !important;
        }

        .hero-title {
          font-size: 30px !important;
          line-height: 38px !important;
        }

        .otp-code {
          font-size: 38px !important;
          line-height: 46px !important;
          letter-spacing: 4px !important;
        }

        .hide-mobile {
          display: none !important;
        }
      }
    </style>
    <!--[if mso]>
    <style type="text/css">
      .otp-code {
        font-family: Consolas, "Courier New", monospace !important;
      }
    </style>
    <![endif]-->
  </head>
  <body bgcolor="#fff8f6" style="margin:0;padding:0;background-color:#fff8f6;color:#351326;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
      Your ${escapedProductName} code expires in ${escapedExpiresInMinutes} ${expiryUnit}.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff8f6" style="width:100%;border-collapse:collapse;background-color:#fff8f6;">
      <tr>
        <td class="outer-pad" align="center" style="padding:32px 12px;">
          <!--[if mso]>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
          <![endif]-->
          <table class="email-container" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffdfb" style="width:100%;max-width:600px;border-collapse:separate;background-color:#fffdfb;border:1px solid #f0cbd1;border-radius:18px;">
            <tr>
              <td height="4" bgcolor="#c72c52" style="height:4px;background-color:#c72c52;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>
            <tr>
              <td class="mobile-pad" bgcolor="#fffdfb" style="padding:22px 36px;background-color:#fffdfb;border-bottom:1px solid #f0cbd1;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td width="52" valign="middle" style="width:52px;">
                      <table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0" bgcolor="#c72c52" aria-hidden="true" style="width:40px;border-collapse:separate;background-color:#c72c52;background-image:linear-gradient(135deg,#c72c52 0%,#af3d22 100%);border-radius:9px;">
                        <tr>
                          <td height="40" align="center" valign="middle" style="height:40px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:40px;font-weight:700;mso-line-height-rule:exactly;">&#9829;</td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" style="color:#351326;font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.2px;">${escapedProductName}</td>
                    <td class="hide-mobile" align="right" valign="middle" style="color:#9d1d46;font-size:10px;line-height:16px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">Account security</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="mobile-pad" bgcolor="#fff0f2" style="padding:36px;background-color:#fff0f2;">
                <p style="margin:0 0 8px;color:#9d1d46;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">A quick check</p>
                <h1 class="hero-title" style="margin:0;color:#351326;font-size:36px;line-height:44px;font-weight:700;letter-spacing:-0.8px;">Here&rsquo;s your verification code.</h1>
                <p style="margin:14px 0 0;color:#6f4c5d;font-size:16px;line-height:25px;">Use it to finish signing in or creating your ${escapedProductName} profile.</p>
              </td>
            </tr>
            <tr>
              <td class="mobile-pad" bgcolor="#fffdfb" style="padding:36px;background-color:#fffdfb;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff0f2" style="width:100%;border-collapse:separate;background-color:#fff0f2;border:1px solid #f0cbd1;border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:24px 16px 7px;color:#9d1d46;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">Your six-digit code</td>
                  </tr>
                  <tr>
                    <td class="otp-code" align="center" aria-label="Verification code: ${escapedOtp}" style="padding:0 12px;color:#351326;font-family:'Courier New',Courier,monospace;font-size:44px;line-height:54px;font-weight:700;letter-spacing:6px;white-space:nowrap;mso-line-height-rule:exactly;">${escapedOtp}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:8px 16px 24px;color:#9d1d46;font-size:12px;line-height:18px;font-weight:700;">Expires in ${escapedExpiresInMinutes} ${expiryUnit}</td>
                  </tr>
                </table>
                <p style="margin:16px 0 28px;color:#6f4c5d;font-size:14px;line-height:22px;text-align:center;">Enter this code only in the ${escapedProductName} screen you just left.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff4e9" style="width:100%;border-collapse:separate;background-color:#fff4e9;border:1px solid #ffc392;border-radius:12px;">
                  <tr>
                    <td width="48" valign="top" style="width:48px;padding:18px 0 18px 18px;">
                      <table role="presentation" width="30" cellpadding="0" cellspacing="0" border="0" bgcolor="#af3d22" aria-hidden="true" style="width:30px;border-collapse:separate;background-color:#af3d22;border-radius:15px;">
                        <tr>
                          <td height="30" align="center" valign="middle" style="height:30px;color:#ffffff;font-size:15px;line-height:30px;font-weight:700;mso-line-height-rule:exactly;">!</td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:17px 18px 18px 10px;">
                      <p style="margin:0 0 4px;color:#832d20;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Keep your code private</p>
                      <p style="margin:0;color:#6f4c5d;font-size:14px;line-height:22px;">Didn&#39;t request this code? You can safely ignore this email. Never share it with anyone, including someone claiming to be from ${escapedProductName}.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="mobile-pad" bgcolor="#fff8f6" style="padding:24px 36px;background-color:#fff8f6;border-top:1px solid #f0cbd1;">
                <p style="margin:0;color:#9d1d46;font-size:14px;line-height:20px;font-weight:700;">${escapedProductName}</p>
                <p style="margin:4px 0 0;color:#6f4c5d;font-size:12px;line-height:19px;">Meet people at your pace. Start meaningful conversations.</p>
              </td>
            </tr>
          </table>
          <!--[if mso]>
              </td>
            </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    subject,
    text,
  };
};

export const AuthOtpEmailTemplateCollection = {
  buildOtpVerificationEmail,
};
