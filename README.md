# AcademIA

An EdTech platform for Moroccan students (primary and middle school), providing interactive courses, exercises, mock exams, and an AI-powered teacher assistant.

## Features

- **Dashboard** — personalized greeting, quick resume of last course/exercise, and AI suggestions
- **Subjects** — browse all subjects by school year with photo cards
- **Courses** — chapter-based lesson viewer
- **Exercises** — practice exercises per subject
- **Mock Exams** — timed exam simulations
- **Prof IA** — AI teacher to answer student questions in real time
- **Profile** — student account management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Icons | Lucide React |
| Routing | React Router v6 |
| Backend | Coming soon |

## Project Structure

```
AcademIA/
├── frontend/        # React + Vite app
│   ├── src/
│   │   ├── components/   # Sidebar, Navbar, AppLayout
│   │   ├── pages/        # Dashboard, Courses, Home, SignIn, SignUp
│   │   ├── lib/          # Curriculum helpers
│   │   ├── data/         # Subject/chapter JSON data
│   │   └── services/     # API services (WIP)
│   └── public/
└── backend/         # API server (coming soon)
```

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
cd frontend
npm run build
```

## License

MIT
