const resetPasswordTemplate = (code: string) => {
  return `
   <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f4f6f8;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          color: white;
          text-align: center;
          padding: 30px 10px 25px;
        }
        .header img {
          width: 120px;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }
        .content {
          padding: 35px 30px;
          text-align: left;
          line-height: 1.6;
        }
        .content h2 {
          margin-top: 0;
          color: #222;
          font-weight: 600;
        }
        .otp-box {
          background-color: #f2f8ff;
          border: 2px dashed #0b74de;
          padding: 15px;
          text-align: center;
          border-radius: 8px;
          margin: 20px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #0b74de;
          letter-spacing: 6px;
        }
        .footer {
          text-align: center;
          font-size: 13px;
          color: #888;
          padding: 20px 10px 30px;
          border-top: 1px solid #eee;
        }
        a {
          color: #0b74de;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h2>Hello,</h2>
          <p>We received a request to reset your password for your account.</p>
          <p>Please use the following OTP code to proceed with resetting your password:</p>

          <div class="otp-box">
            <div class="otp-code">${code}</div>
          </div>

          <p>This code is valid for <b>5 minutes</b>. Please do not share it with anyone.</p>
          <p>If you did not request a password reset, please ignore this email.</p>

          <p style="margin-top:25px;">Best regards,<br/><b>Keodi Team</b></p>
        </div>
        <div class="footer">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `;
};

export default resetPasswordTemplate;
