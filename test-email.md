# Email Testing Guide

## 1. Environment Setup

Add these variables to your `.env.local` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### For Gmail:
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password as `SMTP_PASS`

### For Other Providers:
- **Outlook/Hotmail**: `smtp-mail.outlook.com`, port `587`
- **SendGrid**: `smtp.sendgrid.net`, port `587`, use API key as password
- **Custom SMTP**: Check your provider's documentation

## 2. Testing Methods

### Method 1: Test via UI (Recommended)
1. Start your development server: `npm run dev`
2. Navigate to a lead detail page: `http://localhost:3000/leads/[lead-id]`
3. Click on the email address in the Contact Information section
4. Fill in the email form:
   - To: (pre-filled with lead's email)
   - Subject: Test Email
   - Message: This is a test email from the CRM
5. Click "Send Email"
6. Check the recipient's inbox

### Method 2: Test via API Directly
Use curl, Postman, or any HTTP client:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "message": "<p>This is a test email</p>"
  }'
```

### Method 3: Browser Console Test
Open browser console on any page and run:

```javascript
fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'your-email@example.com',
    subject: 'Test Email',
    message: '<p>This is a test email from the browser console</p>'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

## 3. Troubleshooting

### Error: "SMTP configuration is missing"
- Check that all SMTP environment variables are set in `.env.local`
- Restart your development server after adding variables

### Error: "SMTP authentication failed"
- Verify your SMTP_USER and SMTP_PASS are correct
- For Gmail, make sure you're using an App Password, not your regular password
- Check if 2-Step Verification is enabled (required for Gmail)

### Error: "Failed to connect to SMTP server"
- Verify SMTP_HOST and SMTP_PORT are correct
- Check your firewall/network settings
- Try different ports: 587 (TLS) or 465 (SSL)

### Email not received
- Check spam/junk folder
- Verify the "to" email address is correct
- Check server logs for detailed error messages
- Some email providers have sending limits

## 4. Testing Checklist

- [ ] Environment variables are set correctly
- [ ] Development server is running
- [ ] Can open email modal from lead detail page
- [ ] Form validation works (try submitting empty form)
- [ ] Email sends successfully
- [ ] Email appears in recipient's inbox
- [ ] Activity is logged in the lead's activity timeline
- [ ] Error messages display correctly for invalid inputs

## 5. Common SMTP Settings

### Gmail
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Outlook/Hotmail
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### SendGrid
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Yahoo
```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

