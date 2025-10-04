// src/channels/templates/otp-en.template.ts
const resetPasswordTemplate = (code: string) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Dear,</h2>
      <p>We received a request to reset your password.</p>
      <p>Your OTP code is:</p>
      <h1 style="color: #4CAF50;">${code}</h1>
      <p>This OTP is valid for <b>5 minutes</b>. Please do not share it with anyone.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/>Keodi Team</p>
    </div>
  `;
}

export default resetPasswordTemplate
