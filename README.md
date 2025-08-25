This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Email Service Application

A comprehensive email sending service with Microsoft SQL Server integration, featuring:
- 📧 **Email Queue Processing** with PDF attachments and encryption
- 🗄️ **Database Integration** with Dynamic SMTP configuration  
- 📊 **Real-time Dashboard** with service monitoring and statistics
- ⚙️ **Configuration Management** with auto-restart capabilities
- 🔐 **Secure Authentication** with encrypted credential storage

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

4. **Follow the setup wizard** to configure your database and email settings

5. **Start sending emails!**

## 🔧 Emergency Credential Reset

If you forget your login credentials, use the emergency reset script:

```bash
node reset-credentials.js
```

This will reset your username and password to `admin`/`admin`. See `CREDENTIAL_RESET_GUIDE.md` for detailed instructions.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
