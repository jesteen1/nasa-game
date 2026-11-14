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

## Cross-platform installs (Windows + Linux)

Native packages (`lightningcss`, `@next/swc`, `@tailwindcss/oxide`, `@rollup/rollup-*`,
`@esbuild/*`, `sharp`) are OS/CPU-specific. A `node_modules` tree copied between Linux and
Windows is missing the other platform's binaries and fails with errors such as:

```
Cannot find module '../lightningcss.win32-x64-msvc.node'
```

Do **not** copy `node_modules` or `.next` between machines. If a shared folder already
contains them, the project repairs itself:

- `npm run dev|build|test|lint` run `scripts/ensure-native-deps.mjs` first, which reads
  `package-lock.json`, detects the current OS/CPU, and installs only the missing native
  packages into `node_modules` (without touching the other platform's packages).
- Manual repair: `npm run fix:native`
- Pre-warm one tree for every platform (Linux/Windows/macOS):
  `npm run fix:native -- --platform=all`
- Verify without changing anything: `node scripts/ensure-native-deps.mjs --check`
- If a tree is deeply corrupted, delete `node_modules` and `.next`, then `npm ci`.

Run `npm ci` on each machine at least once if you are not sharing a folder.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
