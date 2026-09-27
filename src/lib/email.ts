/**
 * Email via Resend REST API (no SDK dependency). In dev (no RESEND_API_KEY),
 * OTPs are logged to the console instead of sent.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

async function sendRaw(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Attendance <noreply@attendance.local>";
  if (!apiKey) {
    console.warn(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.html.replace(/<[^>]+>/g, " ")}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}

export async function sendOtpCode(email: string, otp: string): Promise<void> {
  await sendRaw({
    to: email,
    subject: `Your attendance login code: ${otp}`,
    html: `<p>Your office attendance OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes. Do not share it.</p>`,
  });
}

export async function sendNotification(to: string, subject: string, html: string): Promise<void> {
  await sendRaw({ to, subject, html });
}