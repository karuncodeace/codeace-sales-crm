/**
 * Simple script to test email sending functionality
 * Run with: node scripts/test-email.js recipient@example.com
 * 
 * Make sure your .env.local file has the SMTP configuration set up
 * 
 * Note: This script requires environment variables to be loaded.
 * In Next.js, environment variables are automatically loaded from .env.local
 * If running this script directly, you may need to install dotenv:
 * npm install dotenv
 */

// Try to load dotenv if available (optional)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, environment variables should be set manually or via Next.js
  console.log('ℹ️  dotenv not found. Make sure environment variables are set.\n');
}

const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing SMTP Configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease add these to your .env.local file');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}\n`);

  // Determine secure connection
  const port = Number(process.env.SMTP_PORT);
  const secure = port === 465;

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Verify connection
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Get test email from command line or use default
    const testEmail = process.argv[2] || process.env.SMTP_USER;
    
    if (!testEmail) {
      console.error('❌ Please provide a test email address');
      console.log('Usage: node scripts/test-email.js recipient@example.com');
      process.exit(1);
    }

    // Send test email
    console.log(`📧 Sending test email to: ${testEmail}...`);
    const info = await transporter.sendMail({
      from: `"CRM Test" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: 'Test Email from CRM',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from your CRM system.</p>
        <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sent at: ${new Date().toLocaleString()}<br>
          Message ID: ${info.messageId}
        </p>
      `,
      text: 'This is a test email from your CRM system. If you received this email, your SMTP configuration is working correctly!',
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);
    console.log('📬 Please check your inbox (and spam folder) for the test email.');

  } catch (error) {
    console.error('\n❌ Error sending email:');
    console.error(`   ${error.message}\n`);

    if (error.code === 'EAUTH') {
      console.error('💡 Tip: Check your SMTP_USER and SMTP_PASS credentials.');
      console.error('   For Gmail, make sure you\'re using an App Password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('💡 Tip: Check your SMTP_HOST and SMTP_PORT settings.');
      console.error('   Verify your network connection and firewall settings.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Tip: Connection timed out. Check your SMTP server settings.');
    }

    process.exit(1);
  }
}

// Run the test
testEmail().catch(console.error);

