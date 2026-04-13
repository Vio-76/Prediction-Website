# Local Dev Server

## Start

```bash
npm run dev
```

Run this in a terminal (e.g. the VS Code terminal) from the `tournament-predictions/` folder. The site will be available at http://localhost:3000.

## Stop

Press **Ctrl+C** in the terminal where the dev server is running.

## Notes

- If you need to run `prisma generate` or `prisma db push`, stop the dev server first — it locks a file that Prisma needs to overwrite.
- After stopping, you can restart with `npm run dev` again at any time.
