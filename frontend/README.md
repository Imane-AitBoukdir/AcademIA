# AcademIA — Frontend

React + Vite frontend for the AcademIA platform.

## Stack

- **React 18** with hooks
- **Vite 4** for bundling
- **React Router v6** for navigation
- **Framer Motion** for animations
- **Lucide React** for icons
- **Tailwind CSS** + custom CSS design system

## Setup

```bash
npm install
npm run dev      # development server on http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Key Pages

| Route | Page |
|-------|------|
| `/` | Home (landing) |
| `/signin` | Sign in |
| `/signup` | Sign up |
| `/dashboard` | Student dashboard |
| `/courses/:level/:subject` | Course viewer |

## Design Tokens

Defined in `src/index.css` under `:root`:

- `--primary: #6C47B8`
- `--bg: #F8F9FB`
- `--text: #1A1A2E`
- Neutral shadows, 10px border radii
