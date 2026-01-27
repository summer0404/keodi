export const resendSuccessTemplate = () => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Email Resent</title>
  <style>
  body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f6f8;
      color: #333;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
  }

  .card {
      background-color: #fff;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      padding: 36px 28px;
      max-width: 400px;
      text-align: center;
      margin: 15px;
      animation: fadeIn 0.6s ease-in-out;
  }

  .card img {
      width: 80px;
      margin-bottom: 18px;
  }

  .card h1 {
      color: #16a34a;
      font-size: 22px;
      margin-bottom: 10px;
      font-weight: 600;
  }

  .card p {
      font-size: 15px;
      color: #555;
      margin: 8px 0 22px;
      line-height: 1.6;
  }

  .btn {
      display: inline-block;
      padding: 11px 22px;
      background-color: #16a34a;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.25s ease;
  }

  .btn:hover {
      background-color: #15803d;
  }

  @media (max-width: 480px) {
      .card {
          padding: 28px 20px;
      }
      .card h1 {
          font-size: 20px;
      }
      .btn {
          width: 100%;
          padding: 13px;
      }
  }

  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }
  </style>
  </head>
  <body>
  <div class="card">
      <img src="https://cdn-icons-png.flaticon.com/512/845/845646.png" alt="Success Icon" />
      <h1>Verification Link Sent!</h1>
      <p>We've successfully resent a verification email to your inbox. Please check your email and click the link to verify your account.</p>
      <a href="#" class="btn">Go to Login</a>
  </div>
  </body>
  </html>
  `
}

export const resendFailedTemplate = () => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resend Verification Failed</title>
  <style>
  body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f6f8;
      color: #333;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
  }

  .card {
      background-color: #fff;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      padding: 36px 28px;
      max-width: 400px;
      text-align: center;
      margin: 15px;
      animation: fadeIn 0.6s ease-in-out;
  }

  .card img {
      width: 80px;
      margin-bottom: 18px;
  }

  .card h1 {
      color: #dc2626;
      font-size: 22px;
      margin-bottom: 10px;
      font-weight: 600;
  }

  .card p {
      font-size: 15px;
      color: #555;
      margin: 8px 0 22px;
      line-height: 1.6;
  }

  .btn {
      display: inline-block;
      padding: 11px 22px;
      background-color: #dc2626;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.25s ease;
  }

  .btn:hover {
      background-color: #b91c1c;
  }

  @media (max-width: 480px) {
      .card {
          padding: 28px 20px;
      }
      .card h1 {
          font-size: 20px;
      }
      .btn {
          width: 100%;
          padding: 13px;
      }
  }

  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }
  </style>
  </head>
  <body>
  <div class="card">
      <img src="https://cdn-icons-png.flaticon.com/512/463/463612.png" alt="Error Icon" />
      <h1>Failed to Resend Verification</h1>
      <p>We were unable to resend your verification email at this time. Please try again later or contact support if the issue persists.</p>
      <a href="#" class="btn">Try Again</a>
  </div>
  </body>
  </html>
  `
}

export const resendTooSoonTemplate = (remainingSeconds: number, userId: string) => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resend Too Soon</title>
  <style>
  body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f6f8;
      color: #333;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
  }

  .card {
      background-color: #fff;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      padding: 36px 28px;
      max-width: 400px;
      text-align: center;
      margin: 15px;
      animation: fadeIn 0.6s ease-in-out;
  }

  .card img {
      width: 80px;
      margin-bottom: 18px;
  }

  .card h1 {
      color: #ea580c;
      font-size: 22px;
      margin-bottom: 10px;
      font-weight: 600;
  }

  .card p {
      font-size: 15px;
      color: #555;
      margin: 8px 0 18px;
      line-height: 1.6;
  }

  .countdown {
      font-size: 17px;
      color: #ea580c;
      font-weight: 600;
      margin-bottom: 22px;
  }

  .btn {
      display: inline-block;
      padding: 11px 22px;
      background-color: #ea580c;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.25s ease;
  }

  .btn:hover {
      background-color: #c2410c;
  }

  @media (max-width: 480px) {
      .card {
          padding: 28px 20px;
      }
      .card h1 {
          font-size: 20px;
      }
      .btn {
          width: 100%;
          padding: 13px;
      }
  }

  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
  }
  </style>
  </head>
  <body>
  <div class="card">
      <img src="https://cdn-icons-png.flaticon.com/512/463/463574.png" alt="Wait Icon" />
      <h1>Resend Too Soon</h1>
      <p>You’ve recently requested to resend your verification email.<br>
      Please wait before trying again.</p>

      <div class="countdown" id="countdown"></div>

      <a href="#" class="btn" id="btn" style="pointer-events: none; opacity: 0.6;">Resend Disabled</a>
  </div>

  <script>
    let remaining = ${remainingSeconds};
    const countdownEl = document.getElementById('countdown');
    const btn = document.getElementById('btn');

    function updateCountdown() {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      countdownEl.textContent = "Please wait " + minutes + "m " + seconds + "s";
      if (remaining <= 0) {
        countdownEl.textContent = "You can now resend your email!";
        btn.textContent = "Resend Now";
        btn.style.opacity = 1;
        btn.style.pointerEvents = "auto";
        btn.href = "${process.env.RESEND_VERIFY_EMAIL_API}${userId}"; // TODO: add actual resend link here
        clearInterval(interval);
      }
      remaining--;
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
  </script>
  </body>
  </html>
  `
}
