# WESTSIDE — Vercel Deployment Guide

## Overview
WESTSIDE is a Next.js 15 app deployed on **Vercel** — the zero-config platform built for Next.js.
After deployment, Vercel gives you a **public URL** (e.g. `https://westside.vercel.app`) accessible from anywhere in the world.

---

## Step 1 — Push Code to GitHub

Vercel deploys from a Git repository. Do this once:

```bash
# In your project folder (C:\Users\acer\Desktop\Westside)
git init
git add .
git commit -m "Initial commit — WESTSIDE AI Fashion App"
```

Then create a new repository on https://github.com/new and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/westside.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Create a Vercel Account

1. Go to **https://vercel.com**
2. Click **"Sign Up"** → choose **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

---

## Step 3 — Import Your Project

1. In the Vercel dashboard click **"Add New → Project"**
2. Find and select your **westside** repository
3. Vercel auto-detects Next.js — no build settings needed
4. Click **"Deploy"** (first deploy takes ~2 minutes)

---

## Step 4 — Add Environment Variables (CRITICAL)

Without this, the AI chat will not work. In Vercel:

1. Go to your project → **Settings → Environment Variables**
2. Add the following variable:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `YOUR_ACTUAL_KEY_HERE` (copy from your .env.local file) |

3. Set it for **Production**, **Preview**, and **Development**
4. Click **"Save"**
5. Go to **Deployments** → click the three dots on your latest deploy → **"Redeploy"**

---

## Step 5 — Get Your Live URL

After deployment Vercel gives you:

- **Production URL**: `https://westside-YOUR_USERNAME.vercel.app`
- **Custom domain** (optional): Add under Settings → Domains

Share this URL with anyone — it works globally, no server setup needed.

---

## Auto-Deployments (CI/CD)

Every time you push to GitHub, Vercel automatically rebuilds and redeploys:

```bash
# Make changes locally
git add .
git commit -m "Update products"
git push
# → Vercel deploys in ~1 minute automatically
```

---

## Custom Domain (Optional)

1. Buy a domain (GoDaddy, Namecheap, Google Domains)
2. Vercel dashboard → Settings → Domains → Add domain
3. Follow Vercel's DNS instructions (add CNAME/A record)
4. SSL certificate is added automatically — free

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude AI API key for the chat stylist |

**Never commit** `.env.local` to GitHub — it's already in `.gitignore`.

---

## Performance on Vercel

| Feature | Status |
|---------|--------|
| Edge CDN (global) | ✅ Automatic |
| HTTPS / SSL | ✅ Automatic |
| Image optimization (avif/webp) | ✅ Configured |
| Static page caching | ✅ Automatic |
| API route timeout | 30 seconds (configured in vercel.json) |
| Region | Mumbai (bom1) — closest to India |

---

## Troubleshooting

**Chat returns error / no response**
→ Check that `ANTHROPIC_API_KEY` is set in Vercel environment variables and redeploy.

**Images not loading**
→ Only `images.unsplash.com` is whitelisted in `next.config.ts`. All product images use Unsplash — this is fine.

**Build fails**
→ Run `npm run build` locally first. Fix any TypeScript errors before pushing.

**504 Gateway Timeout on chat**
→ Claude API sometimes takes >10s. The `maxDuration: 30` in `vercel.json` gives it 30 seconds.

---

## Local Development

```bash
cd C:\Users\acer\Desktop\Westside
npm install
npm run dev
# → http://localhost:3000
```
