export default function ownershipClaimRejectedTemplate(reason: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Ownership Claim Update</h2>
      <p>Unfortunately, your ownership claim could not be approved at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you believe this is an error, please ensure your proof documents clearly link you to the business and try again.</p>
    </div>
  `;
}