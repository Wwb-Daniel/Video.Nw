# OmniPlay - Modern Video Sharing Platform

OmniPlay is a modern video sharing application built with React, TypeScript, and Supabase. It provides a TikTok-like experience where users can upload, view, and interact with short-form videos.

## Features

- Complete user authentication (sign up, login)
- Video upload and playback
- Infinite scroll video feed
- User profiles
- Video interactions (likes, comments)
- Search functionality
- Responsive design for all devices

## Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Supabase (Authentication, Database, Storage)
- **State Management:** Zustand
- **Routing:** React Router
- **Build Tool:** Vite

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables by copying `.env.example` to `.env` and adding your Supabase credentials

4. Start the development server:
   ```
   npm run dev
   ```

## Supabase Setup

Before running the application, you need to set up Supabase:

1. Create a new Supabase project
2. Run the SQL migration in `supabase/migrations/create_initial_schema.sql`
3. Set up Storage bucket (REQUIRED):
   - Go to Storage in your Supabase dashboard
   - Click "Create new bucket"
   - Name the bucket exactly "videos" (case-sensitive)
   - Enable public access for the bucket
   - Set the following CORS configuration for the bucket:
     ```json
     {
       "cors_rules": [
         {
           "allowed_origins": ["*"],
           "allowed_methods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
           "allowed_headers": ["*"],
           "expose_headers": ["Content-Range", "Range"],
           "max_age_seconds": 3000
         }
       ]
     }
     ```
4. Update the `.env` file with your Supabase URL and anon key

## Project Structure

- `/src/components` - React components organized by feature
- `/src/pages` - Page components for different routes
- `/src/lib` - Utility functions and shared code
- `/src/store` - Zustand stores for state management
- `/supabase` - Supabase migrations and configuration

## License

MIT