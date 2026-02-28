import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions) {
    // Skip sending if no email credentials configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[MAIL SKIPPED] To: ${to} | Subject: ${subject}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: `"Inginium System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`[MAIL SENT] To: ${to} | Subject: ${subject}`);
    } catch (error) {
        console.error(`[MAIL ERROR] To: ${to}`, error);
    }
}

export async function sendApprovalEmail(
    email: string,
    entityType: string,
    entityName: string
) {
    return sendEmail({
        to: email,
        subject: `✅ Your ${entityType} request has been approved`,
        html: `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #16a34a;">Request Approved</h2>
        <p>Your request for <strong>${entityName}</strong> has been <strong>approved</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">— Inginium Resource Management System</p>
      </div>
    `,
    });
}

export async function sendRejectionEmail(
    email: string,
    entityType: string,
    entityName: string
) {
    return sendEmail({
        to: email,
        subject: `❌ Your ${entityType} request has been rejected`,
        html: `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #dc2626;">Request Rejected</h2>
        <p>Your request for <strong>${entityName}</strong> has been <strong>rejected</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">— Inginium Resource Management System</p>
      </div>
    `,
    });
}

export async function sendPromotionEmail(
    email: string,
    entityType: string,
    entityName: string
) {
    return sendEmail({
        to: email,
        subject: `🎉 You've been promoted from the waitlist!`,
        html: `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #2563eb;">Waitlist Promotion</h2>
        <p>Great news! Your request for <strong>${entityName}</strong> (${entityType}) has been <strong>promoted from the waitlist</strong> and is now approved.</p>
        <p style="color: #64748b; font-size: 14px;">— Inginium Resource Management System</p>
      </div>
    `,
    });
}

export async function sendCancellationEmail(
    email: string,
    entityType: string,
    entityName: string
) {
    return sendEmail({
        to: email,
        subject: `🚫 Your ${entityType} request has been cancelled`,
        html: `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #f59e0b;">Request Cancelled</h2>
        <p>Your request for <strong>${entityName}</strong> has been <strong>cancelled</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">— Inginium Resource Management System</p>
      </div>
    `,
    });
}
