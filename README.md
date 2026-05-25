# aboutme — Alejandro Vargas Meyer

Personal portfolio site. Static HTML/CSS/JS, deployed on Vercel.

## Stack
- Plain HTML / CSS / vanilla JS — no build step
- Fonts via Google Fonts (Archivo Black, Space Grotesk, Caveat, JetBrains Mono)
- Hosted on Vercel; assets cached via `vercel.json`

## Local preview
```sh
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy
Pushes to `main` auto-deploy via the Vercel <-> GitHub integration.
For a manual deploy: `vercel --prod`.

## Pages
- `index.html` — home
- `gio.html` — GIO Sports (founder)
- `cadena.html` — Cadena A (social + production)
- `consulting.html` — web consulting (MSV Interiors, Hoyo 19)
- `social.html` — pop-culture + pickleball pages
