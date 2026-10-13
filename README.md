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
