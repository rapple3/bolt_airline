# Bolt Airlines AI Assistant

An AI-powered travel assistant for Bolt Airlines that helps users with flight bookings, changes, and customer service inquiries.

## Features

- AI-powered chat interface
- Flight search and booking
- User profile management
- Multiple simulated user profiles
- Automated problem-solving capabilities
- Handoff to human agents when needed

## Tech Stack

- React
- TypeScript
- Vite
- TailwindCSS
- OpenAI API
- Vercel (deployment)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Add your OpenAI API key to the `.env` file
5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_OPENAI_API_KEY`: Your OpenAI API key

## Deployment

This project is configured for deployment on Vercel. To deploy:

1. Push your code to a Git repository
2. Import the project in Vercel
3. Set up the environment variables in Vercel dashboard
4. Deploy! 