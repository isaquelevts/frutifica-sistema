import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Frutifica <noreply@frutifica.com>',
    to: email,
    subject: 'Redefinir senha — Frutifica',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Redefinir sua senha</h2>
        <p>Clique no botão abaixo para redefinir sua senha. O link expira em 1 hora.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Redefinir senha
        </a>
        <p style="color:#6b7280;font-size:13px;">Se você não solicitou isso, ignore este email.</p>
      </div>
    `,
  });
}
