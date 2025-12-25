const verifyAccountTemplate = (url: string) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f6f8;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 30px auto;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #0078d7, #00a6ff);
        color: white;
        text-align: center;
        padding: 25px 10px;
      }
      .content {
        padding: 30px 25px;
        line-height: 1.6;
      }
      .content p {
        margin: 12px 0;
        font-size: 15px;
      }
      .button {
        display: inline-block;
        background-color: #0078d7;
        color: white !important;
        padding: 12px 22px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        margin: 20px 0;
        transition: background-color 0.3s;
      }
      .button:hover {
        background-color: #005bb5;
      }
      .footer {
        text-align: center;
        font-size: 13px;
        color: #777;
        padding: 15px 10px 25px;
        border-top: 1px solid #eee;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <p>Hello,</p>
        <p>Thank you for signing up. Please click the button below to verify your email address and activate your account:</p>
        <p style="text-align:center;">
          <a href="${url}" class="button">Verify Email</a>
        </p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #0078d7;">${url}</p>
        <p><b>Note:</b> This verification link will expire in <strong>1 hour</strong>.</p>
        <p>Best regards,<br>Keodi Team</p>
      </div>
      <div class="footer">
        This is an automated message. Please do not reply to this email.
      </div>
    </div>
  </body>
  </html>
  `;
};

export default verifyAccountTemplate;
