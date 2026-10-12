# 🚀 Deployment Guide: Vercel + Render (or Railway)

This repository is configured for decoupled cloud deployment:
* **Frontend**: Hosted on **Vercel** (Global Edge CDN, automatic HTTPS, continuous deployment from GitHub).
* **Backend**: Hosted on **Render** (or **Railway** / **Fly.io**) (supports persistent Python runtime, spaCy NLP model, and persistent WebSockets).

---

## Part 1: Deploy Backend to Render (Free Tier)

1. Push your repository to **GitHub**.
2. Sign up / Log in to [render.com](https://render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Set the following settings:
   * **Name**: `syntaxsense-backend`
   * **Language**: `Python`
   * **Branch**: `main`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   * **Plan**: `Free`
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://syntaxsense-backend.onrender.com`).

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Vercel automatically detects the Vite framework settings from [vercel.json](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/vercel.json):
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   * `VITE_API_URL` = `https://your-backend-name.onrender.com`
   * `VITE_WS_URL` = `wss://your-backend-name.onrender.com`
6. Click **Deploy**.

Within 30 seconds, your site is live with global SSL and full real-time WebSocket connectivity!

---

## Configuration Files Added

* [vercel.json](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/vercel.json): SPA rewrite rules to avoid 404s on browser refreshes.
* [render.yaml](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/render.yaml): Render Blueprint for 1-click infrastructure deployment.
* [Procfile](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/Procfile): Process definition for Railway / Heroku / Dokku.
* [Dockerfile](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/Dockerfile): Container configuration for Docker / Google Cloud Run / AWS.
* [src/apiConfig.js](file:///c:/Users/ishan/OneDrive/Desktop/Syntactic-Aspect-Based-Sentiment-Analysis-Using-Dependency-Parsing/src/apiConfig.js): Automatic environment resolution between local development and cloud URLs.
