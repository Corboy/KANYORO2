MWITONGO E&E — Deployment & Configuration Guide
===============================================

This README explains how to finish the production setup for the site and how the automation added to this repository works.

1) Formspree (newsletter / contact form)
---------------------------------------
- Sign up at Formspree (https://formspree.io) and create a form. You'll receive an endpoint like:
	https://formspree.io/f/abcdxyz
- Configure the endpoint in one of two ways:
	- Quick (recommended for testing): open `index.html` and replace the placeholder in the `<meta name="formspree-endpoint" ...>` tag with your real Formspree URL.
	- Production (recommended): set a Netlify environment variable `FORMSPREE_ENDPOINT` (see Netlify section). The client will read the value from `window.FORMSPREE_ENDPOINT` when available.

2) Netlify deployment
---------------------
- The project includes `netlify.toml` configured to build with `npm run build` and publish `dist/`.
- To deploy on Netlify:
	1. Create a new site on Netlify and connect your GitHub repository.
	2. In Site settings -> Build & deploy -> Environment, add any env vars you need (e.g., FORMSPREE_ENDPOINT).
	3. Deploy — Netlify will run `npm run build` and publish the `dist/` folder.

3) GitHub Actions WebP generation
--------------------------------
- A workflow (`.github/workflows/webp-build.yml`) runs on push to `main` and does:
	- Installs webp tools on the runner.
	- Converts PNG files found in `public/` to `.webp` (quality 82).
	- Commits generated `.webp` files back to the repository (if any are created).
	- Runs `npm ci` and `npm run build` and uploads `dist/` as an artifact.

4) Optional: Automatic Netlify deploy from GitHub Actions
--------------------------------------------------------
- There's an additional deploy workflow template you can enable (see `.github/workflows/deploy-netlify.yml`). To enable automatic deploy from Actions, add two repository secrets:
	- `NETLIFY_AUTH_TOKEN` (personal access token from Netlify)
	- `NETLIFY_SITE_ID` (your Netlify site ID)
- With those secrets set, the workflow will publish the built `dist/` directory directly to your Netlify site.

5) Favicon and icons
--------------------
- A placeholder `public/favicon.png` is included. Replace it with a 32x32 PNG or an `.ico` file for best cross-browser support.
- The `public/site.webmanifest` references the PNG logo variants for PWA icons.

6) Sitemap & robots
--------------------
- `public/sitemap.xml` is present but contains `https://example.com/` placeholders. Replace `example.com` with your production domain so search engines index the correct URLs.

7) Next recommended actions
--------------------------
- Replace the Formspree placeholder with your real endpoint or set Netlify env var.
- Replace `example.com` in `public/sitemap.xml` and the JSON-LD in `index.html` with your production domain.
- Replace `public/favicon.png` with a real favicon or provide an `.ico` file.
- Optionally enable Netlify deploy workflow by adding the two secrets above.

If you want, paste your Formspree endpoint here and I will wire it into the site (inline) and commit the change for you.
