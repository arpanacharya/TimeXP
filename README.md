
# 🚀 TimeXP: Gamified Student Productivity

TimeXP is a high-performance, gamified schedule tracker designed for students. It combines tactical planning with an XP-based progression system to make time management engaging and rewarding.

## ✨ Key Features
- **Mission Dashboard**: Real-time tracking of your daily schedule with a precision timeline.
- **XP System**: Earn points for completing tasks and level up your academic rank.
- **Tactical Intel**: AI-driven schedule analysis powered by Gemini 3 Flash.
- **Neon Cloud Persistence**: Serverless Postgres storage for your work history.
- **Guided Onboarding**: Interactive tutorial for new specialists.

## 🛠️ Local Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd timexp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root:
   ```env
   API_KEY=your_gemini_api_key
   NEON_DATABASE_URL=your_neon_connection_string
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🌐 Netlify Deployment

1. **Push to GitHub**: Create a new repository and push your code.
2. **Connect to Netlify**: Select your repository in the Netlify dashboard.
3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. **Environment Variables**: Add your `API_KEY` and `NEON_DATABASE_URL` in the Netlify site settings.

## 🛡️ Neon Database Configuration
This app uses **Neon.tech** for serverless storage. To set up your database:
1. Create a project at [Neon](https://neon.tech).
2. Run the SQL schema found in the app description to create the `profiles` and `daily_logs` tables.
3. Provide the Connection String in your environment variables.

---
*Built with React, Vite, Tailwind CSS, Neon DB, and Google Gemini.*
