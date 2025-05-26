# Study Bible Quiz

A Next.js application for interactive Bible study through multiple-choice questions. Users can test their knowledge of scripture and get immediate feedback on their answers.

## Features

- Interactive multiple-choice quiz interface
- Real-time answer verification
- Score tracking with visual indicators (✅/❌)
- Bible passage references and links
- Responsive design with Tailwind CSS
- Supabase backend for question storage

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Supabase account and project

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd study-bible
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application expects a `questions` table in Supabase with the following structure:

```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correctIndex INTEGER NOT NULL,
  reference TEXT,
  url TEXT
);
```

## API Endpoints

- `GET /api/getQuestions` - Retrieves all questions (without correct answers)
- `POST /api/verify` - Verifies a submitted answer and returns correctness

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server