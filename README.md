MWITONGO E&E — Deployment & Configuration Guide
===============================================

[![Netlify Status](https://api.netlify.com/api/v1/badges/SITE_ID/deploy-status)](https://app.netlify.com/sites/kanyoro12/deploys)

Replace `SITE_ID` in the badge URL with your Netlify site's API ID (the badge image still requires the site API ID to work).

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
There is a deploy workflow (`.github/workflows/deploy-netlify.yml`) that will build and publish the `dist/` folder to Netlify when you push to `main`.

What you need to enable it:

- Repository secrets (set these in GitHub: Settings → Secrets & variables → Actions → New repository secret):
	- `NETLIFY_AUTH_TOKEN` — a personal access token from Netlify that allows deployments.
	- `NETLIFY_SITE_ID` — the site ID for the Netlify site you want to publish to.

How to obtain the values:

- NETLIFY_AUTH_TOKEN (via Netlify UI):
	1. Sign in to Netlify and click your avatar → User settings → Applications.
	2. Under "Personal access tokens" click "New access token", give it a name (e.g., "GitHub Actions"), and copy the token value.

- NETLIFY_SITE_ID (via Netlify UI):
	1. Go to your Site on Netlify, click Site settings → Site information.
	2. The "API ID" is the Site ID. Copy that value.

Alternatively, using the Netlify CLI (if you prefer):

```bash
# install the CLI if you don't have it
npm i -g netlify-cli

# login once interactively
netlify login

# list sites and find the site id you want
netlify sites:list
```

Then add the two values as GitHub repository secrets. Once the secrets are present, pushing to `main` will trigger the deploy workflow (or you can run the workflow manually via the Actions tab).

Notes about the workflow added to this repo:
- The deploy workflow now performs a small PNG → WebP conversion step on the runner before building so generated WebP assets are included in the build output.
- The workflow uses `npx netlify-cli deploy --dir=dist --auth=$NETLIFY_AUTH_TOKEN --site=$NETLIFY_SITE_ID --prod` to publish.

If you want, paste the values here and I can add them to the repo for you (I cannot add secrets on your behalf; you must add them in GitHub). I can also update the workflow to use a different secret name if you prefer.

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
