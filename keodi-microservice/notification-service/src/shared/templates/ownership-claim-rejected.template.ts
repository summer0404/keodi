const ownershipClaimRejectedTemplate = (reason: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ownership Claim Rejected</title>
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
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content h2 {
      margin-top: 0;
      color: #222;
      font-weight: 600;
    }
    .notice {
      background-color: #fff5f5;
      border: 2px dashed #ef4444;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      color: #b91c1c;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      color: #888;
      padding: 20px 10px 30px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Hello,</h2>
      <p>
        Unfortunately, your ownership claim could not be approved at this time.
      </p>
      <div class="notice">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>
        If you believe this is an error, please ensure your proof documents clearly link you to the business and try again.
      </p>
      <p style="margin-top:25px;">Best regards,<br/><b>Keodi Team</b></p>
    </div>
    <div class="footer">
      This is an automated message. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
`;

export default ownershipClaimRejectedTemplate;
