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

Environment
-----------

Copy `.env.local.example` to `.env.local` and set your OpenAI API key:

```
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY
MOCK_AI=false
```

Keep `.env.local` out of source control.

Excel to PDF
------------

Excel files are rendered by LibreOffice in headless mode. This preserves the workbook's print layout, formatting, formulas, number formats, sheets, and page settings. The API does not fall back to a text or hand-drawn PDF renderer.

Install LibreOffice on Windows, then either add its `program` directory to `PATH` or set the executable explicitly in `.env.local`:

```
LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
```

The converter also checks `C:\Program Files`, `C:\Program Files (x86)`, and the per-user LibreOffice installation path. If no executable is found, Excel conversion returns a clear dependency error instead of generating a misleading PDF.

HTML to PDF
-----------

HTML files are rendered with Playwright Chromium through the existing `POST /api/pdf/convert` endpoint using `type=html-to-pdf`. The renderer accepts `.html` and `.htm`, uses the uploaded file directory as the secure base URL for local relative resources, blocks external network requests, honors print CSS and CSS page sizing, and returns a selectable-text PDF.

Install the browser in deployment environments with:

```bash
npx playwright install chromium
```

When using an existing system Chrome installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

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