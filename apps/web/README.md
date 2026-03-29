# Verokodo Web

Languages: [English](./README.md) | [Español](./README.es.md)

Astro frontend for the Verokodo immersive oracle experience.

## Commands

- `bun run dev` - start Astro dev server
- `bun run build` - build static output
- `bun run preview` - preview built site

### Routes

- `/` - primary crystal-ball experience (idle -> loading -> result)
- `/loading` - legacy transition route
- `/result` - legacy result route

### Optional env

- `PUBLIC_API_BASE_URL` (default: `http://localhost:3000`)
