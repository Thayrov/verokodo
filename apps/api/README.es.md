# Verokodo API

Idiomas: [English](./README.md) | [Español](./README.es.md)

Servicio API en Hono para ingesta de perfiles y generación del oráculo.

## Comandos

- `bun run dev` - ejecuta el servidor API local en el puerto 3000

### Endpoints

- `GET /` - metadatos del servicio
- `GET /health` - comprobación de vida
- `POST /oracle` - genera una lectura con señales públicas de GitHub

### Variables requeridas

- `GOOGLE_GENERATIVE_AI_API_KEY`

### Variables opcionales

- `VEROKODO_MODEL` (por defecto: `gemini-3.1-flash-lite-preview`)
- `API_CORS_ALLOW_ORIGINS` (por defecto: `*`; lista separada por comas para origenes explicitos)
- `API_RATE_LIMIT_WINDOW_MS` (por defecto: `900000`)
- `API_RATE_LIMIT_MAX` (por defecto: `100`)
