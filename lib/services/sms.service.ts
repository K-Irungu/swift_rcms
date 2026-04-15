import AfricasTalking from "africastalking";

const client = AfricasTalking({
  username: process.env.AFRICASTALKING_USERNAME!,
  apiKey: process.env.AFRICASTALKING_API_KEY!,
});
// const sender = process.env.AFRICASTALKING_SENDER_ID!;

const sms = client.SMS;

export const smsService = {
  async send(phoneNumber: string, message: string) {
    try {
      const result = await sms.send({
        to: phoneNumber,
        message
        // Uncomment at node_modules/@types/africastalking/index.d.ts 
        // Commented out sender here and in type definition to avoid issues with sandbox mode. In production,  would include the sender ID.
        // Messages and otps found in africas talking dashboard
        // from: sender, 
      });

      console.log("SMS sent:", result);
      return result;
    } catch (error) {
      console.error("SMS send failed:", error);
      throw new Error("Failed to send SMS");
    }
  },
};
