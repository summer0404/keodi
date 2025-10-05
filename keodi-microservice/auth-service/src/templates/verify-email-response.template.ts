export const successVerifyAccountTemplate = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verified Successfully</title>
    <style>
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f6f8;
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
        color: #2563eb;
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
        background-color: #2563eb;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.25s ease;
    }

    .btn:hover {
        background-color: #1d4ed8;
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
        <h1>Email Verified Successfully!</h1>
        <p>Your email has been successfully verified. You can now log in and start exploring your account.</p>
        <a href="#" class="btn">Go to Login</a>
    </div>
    </body>
    </html>
    `
}

export const failVerifyAccountTemplate = (userId: number) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification Failed</title>
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
        <h1>Email Verification Failed</h1>
        <p>Sorry, your email verification link is invalid or has expired. Please request a new verification link to continue.</p>
        <a href='${process.env.RESEND_VERIFY_EMAIL_API}${userId}' class="btn">Resend Verification</a>
    </div>
    </body>
    </html>
    `
}

export const alreadyVerifiedTemplate = () => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Already Verified</title>
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
      <img src="https://cdn-icons-png.flaticon.com/512/845/845646.png" alt="Verified Icon" />
      <h1>Email Already Verified</h1>
      <p>Your email has already been verified. You can now safely log in to your account and enjoy our services.</p>
      <a href="#" class="btn">Go to Login</a>
  </div>
  </body>
  </html>
  `
}

export const emailNotRegisteredTemplate = () => {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Not Registered</title>
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
      <h1>Email Not Registered</h1>
      <p>The email address you entered is not registered in our system. Please make sure you’ve signed up before verifying your email.</p>
      <a href="#" class="btn">Go to Sign Up</a>
  </div>
  </body>
  </html>
  `
}

