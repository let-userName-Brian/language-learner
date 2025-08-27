# SMTP Email Setup for Parent Invitations

## For Hosted Supabase (Production)

Since you're using hosted Supabase, you need to configure SMTP in your Supabase dashboard:

### 1. Go to Supabase Dashboard
1. Navigate to Authentication → Settings
2. Scroll down to "SMTP Settings"  
3. Click "Enable Custom SMTP"

### 2. Configure SMTP Provider

**For Gmail:**
```
Host: smtp.gmail.com
Port: 587
User: your-email@gmail.com
Password: your-gmail-app-password
Sender name: Language Learning App
Sender email: your-email@gmail.com
```

**For SendGrid (Recommended for production):**
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: your-sendgrid-api-key
Sender name: Language Learning App
Sender email: noreply@yourdomain.com
```

### 3. Get Gmail App Password (if using Gmail)

1. Go to your Google Account settings
2. Enable 2-factor authentication if not already enabled
3. Go to "App passwords" 
4. Generate a new app password for "Mail"
5. Use this app password (not your regular Gmail password)

### 4. Configure Email Templates

In your Supabase Dashboard → Authentication → Settings → Email Templates:

1. **Update "Invite user" template** for new parent invitations
2. **Update "Reset Password" template** for existing parent notifications

### 5. Test the Configuration

After configuring SMTP and templates, test by adding a student. You should receive emails immediately.

## What Happens Now

When you add a student:

1. ✅ **Parent account is created immediately** in the database
2. ✅ **Parent profile is added to `user_profiles`** table  
3. ✅ **Parent-student relationship is established**
4. ✅ **Invitation email is sent** to the parent's email address
5. ✅ **Parent can click the link** to set their password and sign in

## For Production

Consider using a dedicated email service like:
- SendGrid
- Mailgun  
- Amazon SES
- Postmark

These are more reliable than Gmail for production use.

## Testing Locally

If SMTP is not configured, emails will be captured by Inbucket (available at http://127.0.0.1:54324) for testing purposes.
