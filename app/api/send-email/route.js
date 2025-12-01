import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { to, subject, message } = await req.json();

    // Validate required fields
    if (!to || !subject || !message) {
      return Response.json(
        { error: "Missing required fields: to, subject, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return Response.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Check if SMTP configuration is provided
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return Response.json(
        { error: "SMTP configuration is missing. Please check your environment variables." },
        { status: 500 }
      );
    }

    // Determine if secure connection should be used (port 465 typically uses SSL/TLS)
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure, // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional options for better compatibility
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false,
      },
    });

    // Verify transporter configuration
    await transporter.verify();

    // Send mail
    const info = await transporter.sendMail({
      from: `"Codeace Sales CRM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: message,
    });

    return Response.json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error("SMTP Error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to send email";
    
    if (error.code === "EAUTH") {
      errorMessage = "SMTP authentication failed. Please check your credentials.";
    } else if (error.code === "ECONNECTION") {
      errorMessage = "Failed to connect to SMTP server. Please check your SMTP settings.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
