# Verokodo

Idiomas: [English](./README.md) | [Español](./README.es.md)

Una experiencia inmersiva para desarrolladores que lee un perfil público de programación y devuelve una profecía estilo oráculo basada en datos públicos reales.

## Demo

- URL de demo del hackathon: próximamente

## Qué Es

- Ingresa un nombre de usuario público (GitHub primero, GitLab opcional)
- Obtiene señales públicas del perfil (perfil, repositorios, README del perfil)
- Genera una salida de oráculo dramática y accionable con IA
- Presenta resultados en un flujo inmersivo impulsado por CSS
- Comparte una profecía final

El Tier 1 usa solo datos públicos: sin autenticación y sin acceso a repositorios privados.

## Estado Actual

- Rutas web: `/` -> `/loading` -> `/result`
- Rutas API: `GET /`, `GET /health`, `POST /oracle`
- Pipeline de `POST /oracle`: validación de request, ingesta de GitHub, generación con IA, validación de respuesta

## Stack

- Frontend: Astro (`apps/web`)
- Backend: Hono sobre Bun (`apps/api`)
- Contratos compartidos: esquemas Zod (`packages/shared`)
- SDK de IA: Vercel AI SDK con proveedor de Google
- Modelo: configurable con `VEROKODO_MODEL` (por defecto `gemini-3.1-flash-lite-preview`)

## Configuración Local

1. Copia `.env.example` a `.env` y define `GOOGLE_GENERATIVE_AI_API_KEY`
2. Instala dependencias: `bun install`
3. Inicia la API: `bun run dev:api`
4. Inicia la web en otra terminal: `bun run dev:web`
5. Abre la app y ejecuta una lectura con un username de GitHub

Variables de entorno:

- `GOOGLE_GENERATIVE_AI_API_KEY` (requerida)
- `VEROKODO_MODEL` (opcional)
- `PUBLIC_API_BASE_URL` (opcional, por defecto `http://localhost:3000`)

## Checklist de Cumplimiento del Hackathon

- [ ] App desplegada en CubePath
- [ ] Repositorio público
- [ ] `README.md` con enlace al demo
- [ ] Capturas/GIFs de la experiencia
- [ ] Explicar el uso de CubePath en la documentación
- [ ] Registrar proyecto vía issue antes de la fecha límite
- [ ] Asegurar que el proyecto funcione completamente al momento de revisión

## Documentación Adicional

- Decisiones y notas de arquitectura: `docs/DECISIONS.md`
