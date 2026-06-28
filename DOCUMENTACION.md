# Documentación técnica — Valkyria SaaS

> Plataforma full-stack para la periodización y el seguimiento de atletas de powerlifting,
> con autorregulación asistida por Inteligencia Artificial basada en el **Método RV**
> (Rubén Castro & Víctor Vázquez).

**Última actualización:** Junio 2026
**Estado:** En desarrollo activo · Desplegado en `https://valkyria-saas.vercel.app`

---

## Índice

1. [Problemática](#1-problemática)
2. [Solución propuesta](#2-solución-propuesta)
3. [Usuarios y roles](#3-usuarios-y-roles)
4. [Arquitectura del sistema](#4-arquitectura-del-sistema)
5. [Stack tecnológico](#5-stack-tecnológico)
6. [Modelo de datos](#6-modelo-de-datos)
7. [API REST](#7-api-rest)
8. [Seguridad](#8-seguridad)
9. [Lógica de dominio](#9-lógica-de-dominio)
10. [Integración con IA](#10-integración-con-ia)
11. [Despliegue e infraestructura](#11-despliegue-e-infraestructura)
12. [Ciclo de vida del proyecto](#12-ciclo-de-vida-del-proyecto)
13. [Mejoras pendientes](#13-mejoras-pendientes)

---

## 1. Problemática

El powerlifting de competición exige una **planificación periodizada**: organizar semanas y
meses de entrenamiento variando de forma controlada el volumen y la intensidad. El flujo de
trabajo tradicional de un entrenador (coach) presenta varios problemas:

- **Planillas de Excel dispersas** — un archivo por atleta, sin trazabilidad ni histórico
  centralizado.
- **Autorregulación manual** — el coach revisa el RPE (esfuerzo percibido) reportado sesión por
  sesión y ajusta cargas a mano; no escala cuando hay muchos atletas.
- **Detección tardía de fatiga y sobreentrenamiento** — sin alertas automáticas, el riesgo de
  lesión o estancamiento se descubre tarde.
- **Comunicación fragmentada** — WhatsApp + Excel + videos sueltos.
- **Reportes de progreso** — su armado manual consume horas.

---

## 2. Solución propuesta

**Valkyria** centraliza todo el flujo en un SaaS:

- El **coach** diseña periodizaciones (bloques, sesiones, ejercicios) desde un panel de
  administración.
- El **atleta** registra sus sesiones desde el móvil con una interfaz tipo carrusel.
- Una capa de **IA (Claude)** analiza el rendimiento, sugiere ajustes de carga, detecta fatiga y
  genera reportes narrativos.
- Toda la lógica de entrenamiento se apoya en el **Método RV**, inyectado como contexto en cada
  prompt de IA.

---

## 3. Usuarios y roles

| Rol | Usuario(s) | Responsabilidades |
|---|---|---|
| **Admin (Coach)** | Yisus | Crear/editar periodizaciones, revisar recomendaciones IA, gestionar atletas, generar reportes, configurar su página comercial |
| **Atleta** | Andree, Frank, … | Registrar sesiones, consultar su plan, seguir su progreso en gráficos, comunicarse con el coach |

El control de acceso garantiza que un atleta solo vea sus propios datos y que un coach solo
acceda a sus atletas.

---

## 4. Arquitectura del sistema

Arquitectura **full-stack monolítica sobre Next.js (App Router)**: un único proyecto sirve
frontend y backend, desplegado como funciones serverless en Vercel.

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (cliente)                    │
│   React 19 + Next.js · Tailwind v4 · Recharts · Zustand   │
│   JWT en localStorage  →  Authorization: Bearer <token>   │
└───────────────────────────┬─────────────────────────────┘
                            │ fetch (REST)
┌───────────────────────────▼─────────────────────────────┐
│           NEXT.js API ROUTES (backend serverless)         │
│   80 endpoints REST  ·  validación Zod  ·  verifyToken    │
│   lib/: auth · anthropic · gemini · formulas · validators │
└───────────┬───────────────────────────┬─────────────────┘
            │ Prisma 7 (@prisma/adapter-pg)│ SDK
┌───────────▼──────────────┐   ┌──────────▼────────────────┐
│   PostgreSQL (21 modelos) │   │   Claude API (Anthropic)   │
│   Postgres.app / Vercel   │   │   + Google Gemini (backup) │
└──────────────────────────┘   └────────────────────────────┘
```

### Capas

| Capa | Implementación |
|---|---|
| **Presentación** | 27 páginas + 9 componentes reutilizables, organizadas en route groups `(auth)`, `(admin)`, `(athlete)` |
| **Estado de cliente** | Hooks propios (`useAuth`, `useAthletes`, `useWorkoutPlans`) + stores Zustand (`auth-store`, `ui-store` con persistencia) |
| **API / Servicio** | 80 rutas REST en `app/api/` |
| **Acceso a datos** | Prisma ORM como única puerta a PostgreSQL |
| **Servicios externos** | Anthropic (IA principal), Gemini (alternativa), Resend (emails) |

### Organización de carpetas (resumen)

```
app/
├── generated/prisma/   # Cliente Prisma autogenerado (no editar)
├── (auth)/             # Login, registro — sin sidebar
├── (admin)/            # Páginas del coach — layout con sidebar
├── (athlete)/          # Páginas del atleta
├── components/         # Componentes reutilizables
├── hooks/              # useAuth, useAthletes, useWorkoutPlans
└── api/                # 80 endpoints REST
lib/                    # auth, anthropic, gemini, formulas, validators, db, stores
prisma/                 # schema.prisma + migraciones + seeds
```

---

## 5. Stack tecnológico

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| **TypeScript** | 5 | Lenguaje base (tipado estático en todo el proyecto) |
| **React** | 19.2 | Librería de interfaz de usuario |
| **Next.js** | 16.2 (App Router) | Framework full-stack: renderizado, enrutamiento |
| **Tailwind CSS** | v4 | Estilos (tema oscuro, vía `@tailwindcss/postcss`) |
| **Recharts** | 3.8 | Gráficos de progreso (1RM, tonelaje, volumen) |
| **Zustand** | 5.0 | Gestión de estado global ligera, con persistencia |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| **Next.js API Routes** | 16.2 | Backend serverless (no hay Express; el backend vive dentro de Next.js) |
| **TypeScript** | 5 | Mismo lenguaje que el frontend (full-stack TS) |
| **Prisma ORM** | 7.8 | ORM con `@prisma/adapter-pg` (Prisma 7 exige un driver adapter) |
| **PostgreSQL** | — | Base de datos relacional |
| **Zod** | 4.3 | Validación de esquemas en cada endpoint |
| **node-postgres (`pg`)** | 8.20 | Driver de PostgreSQL |

### Inteligencia Artificial y servicios

| Tecnología | Uso |
|---|---|
| **@anthropic-ai/sdk** (Claude) | Motor de IA principal — 7 prompts especializados del Método RV |
| **@google/generative-ai** (Gemini) | Proveedor alternativo de IA |
| **Resend** | Envío de emails (invitaciones, formulario de contacto) |

### Seguridad

| Tecnología | Versión | Uso |
|---|---|---|
| **bcryptjs** | 3.0 | Hash de contraseñas (10 rounds de salt) |
| **jsonwebtoken** | 9.0 | Generación y verificación de JWT |

### Infraestructura

- **Vercel** — hosting serverless y despliegue (`vercel --prod`).
- **Postgres.app** — PostgreSQL en entorno de desarrollo local.

---

## 6. Modelo de datos

La base de datos cuenta con **21 modelos** y **9 enums** en PostgreSQL, gestionados con Prisma.

### Núcleo de entrenamiento

```
User ──< CoachProfile ──< AthleteProfile
                              │
   Periodizacion ──< BloqueEntrenamiento ──< SesionEntrenamiento ──< EjercicioSesion
                                                                          │
                                                      SeguimientoAtleta (1 fila por serie)
```

| Modelo | Descripción |
|---|---|
| `User` | Cuenta base; deriva en `CoachProfile` o `AthleteProfile` según el rol |
| `CoachProfile` / `AthleteProfile` | Perfiles específicos por rol |
| `Periodizacion` | Plan de entrenamiento; pertenece a un coach y un atleta |
| `BloqueEntrenamiento` | Bloque de 2–4 semanas con rango de RPE y énfasis |
| `SesionEntrenamiento` | Sesión de un día concreto |
| `EjercicioSesion` | Ejercicio dentro de una sesión |
| `SeguimientoAtleta` | Registro real de cada serie ejecutada (peso, reps, RPE reportado) |
| `FaseBasico` | Fases por movimiento básico (SQ/BP/DL) con su progresión |
| `RecomendacionAI` | Recomendaciones generadas por IA (`PENDIENTE`/`ACEPTADA`/`RECHAZADA`) |
| `EjercicioRV` / `ProtocoloRV` | Biblioteca global del Método RV |
| `EjercicioBiblioteca` | Ejercicios propios del coach |
| `Mensaje` | Mensajería coach ↔ atleta |
| `NotaSesion`, `PesoHistorial`, `InviteToken` | Notas, histórico de peso corporal, tokens de invitación |

### Subsistema de página comercial

Gestiona la landing/sitio público del coach, con su propia conexión (`lib/site-db.ts`):

`admin_users`, `products`, `site_config`, `testimonials`

### Enums

`UserRole`, `TipoPeriodizacion`, `EstadoPeriodizacion`, `TipoEjercicio`, `TipoRecomendacion`,
`EstadoRecomendacion`, `TipoMensaje`, `BasicoMovimiento`, `BloqueRV`.

---

## 7. API REST

El backend expone **80 endpoints** organizados por dominio:

| Grupo | Ejemplos de endpoints |
|---|---|
| **Auth** | `register`, `login`, `logout`, `me` |
| **Atletas** | CRUD + `progreso`, `records`, `comparativa`, `volumen-muscular`, `toggle-activo` |
| **Periodizaciones** | CRUD + `copiar-semana`, `fases`, `progresion`, `tapering`, `publicar`, `generar-ia`, `guardar-ia` |
| **Sesiones / ejercicios** | `sesiones`, `ejercicios-sesion`, `seguimiento`, `completar-sesion` |
| **IA** (`/api/ai/*`) | `analizar-sesion`, `generar-recomendacion`, `sugerir-variantes`, `generar-reporte`, `detectar-estancamiento`, `consultar-coach`, `chat` |
| **Sitio comercial** (`/api/site/*`) | `products`, `testimonials`, `config`, `auth`, `stats` |

Todos los endpoints siguen el mismo patrón: extraer token → verificar token y rol → validar el
cuerpo con Zod → operar contra la BD vía Prisma.

---

## 8. Seguridad

| Capa | Implementación |
|---|---|
| **Contraseñas** | `bcryptjs` con hashing + salt (10 rounds). Nunca se almacenan en texto plano |
| **Autenticación** | JWT firmado con `NEXTAUTH_SECRET`, expiración de **24 h**. Se genera en login y se guarda en `localStorage` |
| **Autorización** | Cada endpoint extrae el token (`extractToken`), lo verifica (`verifyToken`) y comprueba el rol antes de responder |
| **Aislamiento de datos** | Un atleta solo accede a sus datos; un coach solo a sus atletas (validado por relación en cada consulta) |
| **Validación de entrada** | **Zod** en todas las rutas: rechaza payloads malformados antes de tocar la BD (helper `parseBody`) |
| **Protección contra inyección SQL** | Prisma parametriza todas las consultas |
| **Gestión de secretos** | Variables de entorno (`.env.local`), nunca en el repositorio |

### Variables de entorno

```
DATABASE_URL       # cadena de conexión PostgreSQL
NEXTAUTH_SECRET    # secreto para firmar JWT (32 bytes base64)
NEXTAUTH_URL       # URL base de la app
ANTHROPIC_API_KEY  # clave de la API de Claude
```

### Consideraciones honestas (deuda de seguridad)

- El JWT reside en `localStorage`, accesible a JavaScript del cliente (vector XSS). Mejora
  recomendada: cookies `httpOnly`.
- No hay *refresh tokens*: al expirar las 24 h, el usuario debe reingresar.
- No se observa *rate limiting* en los endpoints de autenticación.

---

## 9. Lógica de dominio

### Conceptos clave

| Término | Significado |
|---|---|
| **RPE** | Rate of Perceived Exertion (esfuerzo percibido), escala 6–10 |
| **RIR** | Reps In Reserve (repeticiones en reserva). No es intercambiable con RPE |
| **Tonelaje** | Σ (peso × reps × series). Métrica principal de carga |
| **Bloque** | 2–4 semanas con rango de RPE y énfasis definidos |
| **1RM estimado** | Fórmula de Epley: `peso × (1 + reps/30)` |
| **Big 3** | Sentadilla, press de banca, peso muerto |
| **MV/MEV/MAV/MRV** | Volúmenes mínimo / mínimo efectivo / máximo adaptativo / máximo recuperable |

### Fórmulas (`lib/formulas.ts`)

- `estimateOneRM(weight, reps)` — Epley.
- `calcTonnage(weight, reps, sets)` — tonelaje total.
- `suggestNextWeight(current, rpeReported, rpeProgrammed)` — ajuste de carga.

### Reglas de autorregulación

- RPE reportado < RPE programado − 1 → sugerir +2.5–5 kg en la siguiente sesión.
- RPE reportado > RPE programado + 0.5 en 3+ sesiones consecutivas → alerta de fatiga, reducir
  volumen.
- Promedio de RPE a 7 días > 8.5 → estado de fatiga **AMARILLA**; > 8.7 sostenido → **ROJA**.

---

## 10. Integración con IA

Toda la lógica de IA gira en torno a prompts especializados que inyectan el contexto del Método
RV. Los principales:

| Prompt | Propósito |
|---|---|
| `ANALISIS_SESION` | Análisis de RPE/tonelaje por sesión |
| `GENERAR_RECOMENDACION` | Recomendación de ajuste a partir de tendencias históricas |
| `SUGERIR_VARIANTES` | Sustitución de ejercicios dentro de la jerarquía RV |
| `GENERAR_REPORTE` | Reporte narrativo mensual (Markdown → PDF) |
| `DETECCION_SOBRENTRENAMIENTO` | Chequeo de fatiga (job en segundo plano) |
| `CONSULTA_COACH` | Pregunta libre del coach → opciones estructuradas |

Disparadores principales:

- Completar una sesión → análisis asíncrono de la sesión.
- Job periódico → detección de sobreentrenamiento.
- Acción del coach → generación de reporte (asíncrona con `job_id` y *polling*).

---

## 11. Despliegue e infraestructura

- **Producción:** Vercel — `https://valkyria-saas.vercel.app` (despliegue con `vercel --prod`).
- **Build:** `prisma generate && next build`.
- **Base de datos local:** Postgres.app.

### Comandos principales

```bash
cd valkyria-saas

npm run dev          # servidor de desarrollo (localhost:3000)
npm run build        # build de producción
npm run lint         # linting

npx prisma migrate dev --name <nombre>   # migración
npx prisma generate                       # regenerar cliente
npx prisma studio                         # explorar la BD
```

### Identidad de marca

```
Naranja primario : #FF4500
Dorado secundario: #FFB800
Fondo            : #080808
Texto            : #FFFFFF
Éxito            : #10B981
Error            : #EF4444
```

---

## 12. Ciclo de vida del proyecto

| Fase | Cobertura en Valkyria |
|---|---|
| **1 · Caso de negocio** | Construir a medida vs. usar Excel/herramientas genéricas — se eligió desarrollo propio por la especificidad del Método RV |
| **2 · Iniciación** | SaaS para coach de powerlifting con IA integrada |
| **3 · Requerimientos** | Gestión de atletas, periodización, registro de sesiones, autorregulación con IA, reportes, mensajería |
| **4 · Planificación** | Stack Next.js + PostgreSQL + Claude; plan de construcción por fases |
| **5 · Formalización** | Despliegue en Vercel, credenciales seed, dominio público |
| **Desarrollo** | En curso — 27 páginas, 80 endpoints, 21 modelos; mejoras recientes de UX y refactor en 3 fases (hooks, Zustand, validación Zod) |

---

## 13. Mejoras pendientes

**Seguridad**
- Migrar el JWT de `localStorage` a cookies `httpOnly`.
- Implementar *refresh tokens*.
- Añadir *rate limiting* en endpoints de autenticación.

**Producto**
- Proyección automática de semanas 2–N de un bloque aplicando la progresión RV.
- Panel asesor IA al crear/editar bloques (validación de configuración + recomendaciones de
  protocolo).
- Plantillas de bloque predefinidas.

---

*Documento generado a partir del análisis directo del código fuente del repositorio.*
