# Karaí

Plataforma de crowdfactoring con scoring de riesgo, marketplace para inversores y settlement sobre Supabase.

## Requisitos

- Node.js 20+
- npm
- Un proyecto de Supabase con las variables de entorno configuradas

## Setup

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo de entorno:

```bash
cp .env.example .env.local
```

3. Completar `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```


## Ejecutar

Modo desarrollo:

```bash
npm run dev
```

Abrir `http://localhost:3000`.


