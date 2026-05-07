const lowRatingReviewTemplate = (reviewerName: string, rating: number, placeName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Low-Rating Review</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); overflow: hidden; }
    .content { padding: 35px 30px; line-height: 1.6; }
    .content h2 { margin-top: 0; color: #222; font-weight: 600; }
    .notice { background-color: #fef2f2; border: 2px dashed #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: 600; color: #b91c1c; }
    .stars { font-size: 24px; color: #f59e0b; letter-spacing: 2px; }
    .footer { text-align: center; font-size: 13px; color: #888; padding: 20px 10px 30px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>New review on <strong>${placeName}</strong>,</h2>
      <p>
        <strong>${reviewerName}</strong> left a low-rating review on your place.
      </p>
      <div class="notice">
        <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
        Rating: ${rating} / 5
      </div>
      <p>
        We encourage you to respond to this review from your dashboard. Engaging with customer feedback helps build trust with potential visitors.
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

export default lowRatingReviewTemplate;
