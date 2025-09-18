# NodeAI - Robot Mission Orchestration Platform

## Tech Stack
A web application for natural-language robot mission orchestration with real-time 3D visualization.
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Zustand + Three.js
- **Backend**: Supabase (Auth, Postgres, Realtime) + Edge Functions
- **Realtime**: WebSocket for telemetry + Supabase Realtime for events
- **3D**: react-three-fiber + drei for 3D visualization
## Setup Instructions
### 1. Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Create a new Supabase project at [supabase.com](https://supabase.com)
3. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
### 2. Database Setup
1. Run the database migrations in your Supabase SQL editor:
   - Copy the contents of `supabase/migrations/create_core_tables.sql`
   - Paste and execute in the Supabase SQL editor
2. Seed the database with sample data:
   ```bash
   npm run db:seed
   ```
### 3. Edge Functions (Optional)
If you want to deploy the edge functions:
1. Install Supabase CLI (if not already installed)
2. Deploy the functions:
   ```bash
   supabase functions deploy plan
   ```
### 4. Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser
### 5. Authentication
The app uses Supabase Auth with email/password authentication:
- **Demo credentials**: demo@nodeai.com / demo123456
- **Sign up**: Create a new account using the sign up form
- **Email confirmation**: Disabled by default for development
## Features
- 🔐 **Authentication**: Email/password login with Supabase Auth
- 🗺️ **3D Visualization**: Real-time robot tracking in 3D space
- 🤖 **Robot Management**: Monitor robot status, battery, and position
- 🎯 **Mission Planning**: Natural language mission creation
- 📊 **Real-time Events**: Live telemetry and event logging
- 🏥 **Multi-site Support**: Manage multiple locations
- 📱 **Responsive Design**: Works on desktop and mobile
## Database Schema
- **sites**: Physical locations where robots operate
- **robots**: Robot fleet management and status
- **missions**: Mission tracking and natural language descriptions
- **mission_plans**: Generated mission plans with subtasks
- **events**: System events and telemetry data
## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run db:seed` - Seed database with sample data
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier