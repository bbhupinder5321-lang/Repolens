This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Tests

Run the test suite with:

```bash
npm test
```

Run linting and a production build before opening a pull request:

```bash
npm run lint
npm run build
```

## Optional local AI insights (Ollama)

RepoLens's deterministic analyzers and score calculation work without AI. To generate AI summaries, recommendations, and a prioritized session-only to-do list, install [Ollama](https://ollama.com), start its local service, and pull a model:

```bash
ollama pull llama3.2
```

By default, the AI endpoint connects to `http://127.0.0.1:11434` and uses the `llama3.2` model. You can override these server-side settings in your local `.env.local` file:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

Restart `npm run dev` after changing environment variables. If Ollama is not running or the model is missing, RepoLens shows an actionable error; the existing static analysis remains available. AI advice is advisory and should be checked against the repository. AI feedback and checked to-do items currently remain in the browser session and are not stored on a server.
