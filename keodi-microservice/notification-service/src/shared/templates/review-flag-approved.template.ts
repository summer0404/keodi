const reviewFlagApprovedTemplate = (placeName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flagged Review Removed</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden; }
    .content { padding: 35px 30px; line-height: 1.6; }
    .content h2 { margin-top: 0; color: #222; font-weight: 600; }
    .notice { background-color: #ebfff2; border: 2px dashed #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: 600; color: #15803d; }
    .footer { text-align: center; font-size: 13px; color: #888; padding: 20px 10px 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Your flag has been reviewed,</h2>
      <p>
        We have reviewed the review you flagged on <strong>${placeName}</strong> and found that it violates our community guidelines.
      </p>
      <div class="notice">
        The review has been removed.
      </div>
      <p>
        Thank you for helping keep Keodi a trustworthy platform. You can continue managing your place reviews from your dashboard.
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

export default reviewFlagApprovedTemplate;
