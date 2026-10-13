# IPOS Handheld Web

Web version of the Windows Mobile handheld app (Source_HH). React + Vite + TypeScript.

    cp .env.example .env     # set VITE_API_BASE
    npm install
    npm run dev              # dev server
    npm test                 # quantity-allocation logic tests
    npm run build            # static files in dist/

The browser calls controller-api directly, so the backend must allow CORS for the web origin.
Camera scanning needs HTTPS and a browser with BarcodeDetector (Chrome on Android); hardware
scanners that type the code + Enter work in every input.

## Deploy (GitHub Pages)

Push to `main`; `.github/workflows/deploy.yml` tests, builds and publishes `dist/`.
One-time setup: repo Settings > Pages > Source = "GitHub Actions".
The site URL is `https://<user>.github.io/<repo>/`; ask the backend team to add that
origin (`https://<user>.github.io`) to the CORS allowlist of controller-api.
Optional repository variable `VITE_API_BASE` overrides the API host.
