# CyberNotes - Resumen del Proyecto

CyberNotes es una aplicación de escritorio premium para la toma de notas privadas, diseñada con un enfoque en la seguridad, la estética moderna (Cyberpunk/Glassmorphism) y la funcionalidad offline.

## 🚀 Tecnologías Principales
- **Framework**: [Electron](https://www.electronjs.org/) (Desktop Container)
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos**: [SQL.js](https://sql.js.org/) (SQLite compilado a WebAssembly para persistencia local)
- **Editor de Texto**: [TipTap](https://tiptap.dev/) (Editor headless basado en ProseMirror)
- **Animaciones**: [Motion](https://motion.dev/) (framer-motion)

## ✨ Características Implementadas

### 📁 Organización
- Sistema de **Carpetas** con iconos y colores personalizados.
- Notas con soporte de **Fijado (Pin)** y orden cronológico.
- **Buscador global** de notas por título o contenido.
- Orden alfabético automático de carpetas.

### 🛡️ Seguridad
- **Protección por Contraseña**: Acceso restringido mediante hashing seguro (bcryptjs).
- **Auto-bloqueo**: Temporizador de inactividad configurable (1 min - 1 hora).
- **Instancia Única**: Bloqueo de múltiples ejecuciones para proteger los datos.

### 🎨 Personalización (Ajustes)
- **Temas**: Cyber Dark, Midnight, Forest, Graphite, Light, y Neon.
- **Modo Glass**: Efectos de desenfoque (blur) y opacidad configurables.
- **Fondos**: Capacidad de subir imágenes personalizadas para el fondo de la app.
- **Escalabilidad**: Ajuste de escala de la interfaz (UI Scale) para diferentes resoluciones.

### ⚙️ Integración con el Sistema
- **Bandeja de Sistema (Tray)**: Minimización a la bandeja y ejecución en segundo plano.
- **Auto-inicio**: Opción para iniciar con Windows automáticamente en modo minimizado.
- **Contador de Líneas**: Barra de estado opcional que muestra la línea, columna y total de líneas en el editor.
- **Iconografía**: Branding personalizado con iconos multi-resolución de alta calidad.

### 💾 Gestión de Datos
- **Backup**: Funcionalidad de exportación e importación total en formato JSON.
- **Imágenes**: Soporte para insertar imágenes locales en las notas.

## 🛠️ Estructura del Proyecto
- `electron/main.ts`: Proceso principal (DB, IPC, Gestión de Ventanas).
- `electron/preload.ts`: Puente de comunicación seguro (Context Bridge).
- `src/components/`: Componentes de la interfaz de usuario (MainApp, NoteEditor, Sidebar, etc.).
- `src/index.css`: Sistema de diseño basado en variables CSS y efectos glass.
- `public/`: Assets estáticos y el icono oficial de la app.

## 📦 Comandos Útiles
- `npm run dev`: Iniciar entorno de desarrollo.
- `npm run build:electron`: Compilar y generar el instalador de Windows (`release/`).

---
*Última actualización: Mayo 2026*
