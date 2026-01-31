
# 🚀 TimeXP: Gamified Student Productivity

TimeXP is a high-performance, gamified schedule tracker designed for students. It combines tactical planning with an XP-based progression system to make time management engaging and rewarding.

## ✨ Key Features
- **Mission Dashboard**: Real-time tracking of your daily schedule with a precision timeline.
- **XP System**: Earn points for completing tasks and level up your academic rank.
- **Tactical Intel**: AI-driven schedule analysis powered by Gemini 3 Flash.
- **Hybrid Storage**: Works instantly via `localStorage` or syncs globally with **Supabase**.
- **Family Management**: Parent/Mentor mode to oversee student progress and authorize tasks.

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
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
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
4. **Environment Variables**: Add your `API_KEY` (and optional Supabase keys) in the Netlify site settings under **Environment variables**.

## 🛡️ Database Configuration (Optional)
This app works out of the box using your browser's local storage. To enable cloud sync:
1. Create a project at [Supabase](https://supabase.com).
2. Create a `profiles` table and a `daily_logs` table.
3. Provide the URL and Anon Key in your environment variables.

---
*Built with React, Vite, Tailwind CSS, and Google Gemini.*
