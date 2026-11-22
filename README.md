# Entre páginas · Versión 2

Biblioteca privada con usuarios personales, con PDF, EPUB y lectura sin conexión. Editable en Visual Studio Code. El proyecto está preparado para desplegarse, pero **no se ha publicado**: todavía falta elegir alojamiento.

## Arrancar

Usa Node.js 24 o posterior (mínimo técnico 22.16). Abre esta carpeta en Visual Studio Code:

```sh
npm install
npm run setup
npm run dev
```

Abre **http://127.0.0.1:4317**. Entra con un nombre de usuario y contraseña. Al actualizar desde la versión anterior, los usuarios iniciales son `admin` y `lectora`, con sus mismas contraseñas. Puedes cambiar nombre y usuario en **Mi cuenta → Tu perfil**. Si ya tienes cuentas, `setup` las conserva y te indica cómo cambiarlas. En una biblioteca nueva puedes elegir ambas contraseñas en la terminal; no se muestran mientras escribes. En entornos sin terminal interactiva, `ADMIN_PASSWORD` y `READER_PASSWORD` permiten definirlas mediante variables de entorno. Si no se proporcionan, se generan claves y se muestran una vez.

Si el puerto está ocupado, cierra la otra instancia con Control+C, o usa `PORT=4318 npm run dev`. El puerto también puede definirse en `.env`, siguiendo `.env.example`.

## Qué incluye

- **PDF:** modo Libro físico con hojas animadas, grosor, sombras y doble página en pantallas de al menos 1000 px (con zoom de hasta 125%). La portada y el teléfono usan una página; puedes elegir Página sencilla desde Herramientas. Se respeta reducir movimiento. Incluye zoom, salto a página, navegación por botones/teclas/deslizamiento y búsqueda en texto extraíble.
- **EPUB sin DRM:** lectura por capítulos, tamaño de letra, interlineado y márgenes; índice y búsqueda. El contenido se limpia antes de insertarse y las imágenes externas no se cargan.
- **Portadas:** extracción de la primera página de los PDFs nuevos y de la portada declarada en EPUB; también puedes elegir PNG, JPG o WebP en administración. Los libros importados de la versión 1 mantienen su portada tipográfica hasta que elijas una imagen al editarlos.
- **Favoritos y Quiero leer:** independientes por cuenta.
- **Notas y marcadores:** varios por libro, con salto al lugar guardado. Se pueden editar notas y quitar entradas.
- **Usuarios personales:** el administrador crea usuarios con nombre, usuario y contraseña desde Mi cuenta. No hay registro público. Los usuarios nuevos tienen permiso de lectura. Cada persona puede cambiar su nombre y usuario confirmando su contraseña actual; sus lecturas se conservan.
- **Progreso independiente:** cada usuario tiene sus propias lecturas. En EPUB se conserva capítulo y posición aproximada dentro de él.
- **Temas claro, sepia y oscuro:** se recuerdan en el dispositivo, junto con los ajustes del texto EPUB.
- **Descargas sin conexión:** archivo, portada y notas guardados en IndexedDB. Una cola local sincroniza notas, favoritos y progreso cuando vuelve la conexión.
- **Aplicación instalable:** manifest, iconos y service worker. En Android/Chrome usa Instalar; en iPhone/Safari, Compartir → Añadir a pantalla de inicio. El navegador decide cuándo ofrece instalarla.
- **Contraseñas desde Mi cuenta:** cada persona cambia la suya indicando la actual. El administrador también puede restablecer la de cualquier usuario con su propia contraseña. Al cambiarlas se invalidan las sesiones de esa cuenta.
- **Subidas de hasta 50 MB:** porcentaje, validación y reintento conservando el formulario. Portadas de hasta 5 MB. Los reintentos empiezan desde cero; no hay carga fragmentada.
- **Duplicados:** detectados por SHA-256 del contenido, incluso si cambia el nombre. Una edición distinta del archivo cuenta como otro libro.
- **Papelera recuperable:** conserva archivo, portada, notas y estados. No hay borrado definitivo desde la interfaz.
- **Dedicatorias:** mensaje de bienvenida editable y una dedicatoria por libro, visible en Detalles.
- **Bienvenida ilustrada:** huesito y brócoli leyendo juntos, con movimiento suave; respeta la preferencia del sistema de reducir animaciones.

## Sin conexión: cómo usarlo

1. Entra con tu cuenta con conexión.
2. Pulsa **Descargar** en cada libro y espera a ver **Disponible sin conexión**.
3. Vuelve a abrir esa misma dirección desde ese navegador o aplicación instalada.
4. Lee y toma notas. El lector distingue entre guardado en el dispositivo y sincronizado.
5. Al reconectar se enviarán los cambios pendientes. Si expiró la sesión, inicia sesión otra vez con la misma cuenta.

La instalación y el service worker necesitan **HTTPS**, excepto `localhost`/`127.0.0.1` en la propia computadora. Abrir la IP local del Mac por HTTP desde el teléfono permite probar la lectura en línea, pero no activa la instalación ni las descargas offline. En el alojamiento final debe usarse HTTPS.

Las descargas son privadas al perfil de esta aplicación, pero permanecen en el almacenamiento del navegador del dispositivo: protégelo con su bloqueo de pantalla. Los datos locales no están cifrados por la aplicación. No se pueden retirar a distancia de un equipo desconectado. Al cerrar sesión, las descargas de esa cuenta se borran; primero se exige conexión para no perder cambios pendientes. El navegador puede limpiar almacenamiento si falta espacio, por lo que la copia principal sigue en el servidor.

Si se lee el mismo libro a la vez en dos dispositivos con la misma cuenta, gana el último cambio sincronizado. Los temas y tamaños de letra se guardan por dispositivo, no en el servidor.

## Migración desde la primera versión

Al arrancar por primera vez la versión 2:

- Se crea `data/library.sqlite`, con tablas para libros, cuentas, sesiones, estados, notas y ajustes.
- Se importan los libros y hashes de contraseñas existentes. **Tus claves actuales continúan funcionando.**
- El progreso compartido anterior se asigna a **Lectora**; el administrador empieza con estado propio.
- Se conserva el JSON original y se copia a `library.pre-v2.json`. No vuelvas a ejecutar la versión 1 contra datos que estés editando con la versión 2: el JSON ya no se actualiza.
- Los archivos PDF permanecen en `data/books/`.

`DATA_DIR` permite mover todos los datos fuera de la carpeta del código. Hazlo con el servidor detenido. La ruta debe ser absoluta y persistente.

## Copias de seguridad

El servidor comprueba cada hora si ha pasado un día desde la última copia; también lo comprueba al arrancar. Crea una copia consistente de SQLite, los archivos de todos los libros (incluida la papelera) y sus portadas. Conserva **las siete copias más recientes**, sean automáticas o manuales, en `DATA_DIR/backups/`. Necesita tener disponible el comando `tar` (macOS y la imagen Docker incluida lo tienen).

En **Mi cuenta → Copias de seguridad**, el administrador puede crear y descargar copias. También:

```sh
npm run backup
```

Estas copias están en el mismo disco: descarga al menos una periódicamente a otro lugar. Una avería o pérdida del servidor también puede afectar sus copias locales. Si una copia automática falla, se informa en el registro del servidor y se vuelve a intentar en la siguiente comprobación; la fecha de la última copia correcta está en Mi cuenta.

Para restaurar, detén el servidor y descomprime una copia confiable en una carpeta. El siguiente comando exige un **destino vacío**, comprueba la base de datos e invalida sesiones restauradas:

```sh
npm run restore -- /ruta/copia-descomprimida /ruta/nuevos-datos
```

Configura `DATA_DIR=/ruta/nuevos-datos` y arranca. Conserva los datos anteriores hasta comprobar el resultado.

## Contraseñas olvidadas

Desde una cuenta de administrador puedes restablecer la de lectora. Si olvidaste también la de administrador, detén el servidor y ejecuta:

```sh
npm run passwords:reset
```

Este comando local permite elegir las claves de las dos cuentas iniciales e invalida sus sesiones sin borrar libros ni cambiar sus nombres de usuario. Los demás usuarios se restablecen desde la cuenta administradora. No se necesita eliminar archivos a mano.

## Importación local de un PDF

Si prefieres añadir un PDF desde la terminal, con acceso al servidor:

```sh
npm run import -- "/ruta/mi libro.pdf" --category "Nuestra historia" --cover "/ruta/portada.png"
```

Se obtiene el título, autor y número de páginas del PDF. Puedes indicar `--title`, `--author` y `--description`. El original no se modifica y el archivo se copia únicamente al directorio privado de datos. Para EPUB usa el formulario web.

## MAMP y Visual Studio Code

Este proyecto funciona con **Node.js**, no con PHP. Puedes editarlo donde esté guardado, pero debes entrar por el puerto de Node. No uses el puerto de Apache de MAMP para abrir el proyecto.

Incluimos `.htaccess` con acceso denegado para evitar que Apache publique el código y los datos si la carpeta está dentro de `htdocs`. Esto requiere que Apache respete `.htaccess`; Nginx no lo interpreta. La opción más segura y sencilla sigue siendo mantener el proyecto y `DATA_DIR` fuera de cualquier raíz pública de MAMP. No hace falta tener MAMP encendido.

## Publicación preparada

Consulta [DEPLOY.md](DEPLOY.md). Incluye el despliegue con Node o Docker, volumen persistente, HTTPS y configuración de puertos. No hay suscripción contratada, dominio creado ni archivos publicados.

## Archivos para editar

- `public/index.html`: estructura, textos y formularios.
- `public/style.css`: colores, tamaños, diseño adaptable y animaciones.
- `public/app.js`: interfaz, lector, estados y administración.
- `public/epub.js`: apertura y limpieza de EPUB.
- `public/offline.js`, `public/sw.js`: descargas, cola local y aplicación sin conexión.
- `server.mjs`: API, acceso, subidas y archivos protegidos.
- `lib/store.mjs`: esquema SQLite, migración y respaldos.
- `public/assets/companions.png`: ilustración de bienvenida.
- `scripts/`: cuentas, importación, respaldos y restauración.

## Límites y verificación

No hay OCR integrado: un PDF compuesto solo por imágenes no permite buscar palabras. EPUB con DRM o recursos cifrados se rechaza. Los EPUB de diseño fijo, multimedia o maquetación compleja se muestran como capítulos de texto adaptable; no se garantiza conservar su diseño editorial. Los PDF mantienen su maquetación y no cambian el tamaño de letra; se utiliza zoom.

La extracción de portada EPUB admite PNG, JPG, GIF y WebP embebidos para lectura; para guardar una portada personalizada en el servidor usa PNG, JPG o WebP. Si el EPUB no declara una portada compatible, puedes elegir una imagen. La biblioteca no garantiza accesibilidad completa del texto PDF con lectores de pantalla: el PDF se dibuja en canvas.

Ejecuta `npm test` para comprobar migración desde la versión 1, aislamiento por cuenta, archivos protegidos, duplicados, notas, papelera, contraseñas, respaldos y restauración. Se verificaron además en navegador PDF y EPUB, portada automática, búsqueda, temas y letra, uso a tamaño de teléfono, recarga sin servidor y sincronización posterior de progreso y notas. No se ha probado en un iPhone o Android físico ni se ha realizado un despliegue público.

La actualización de dependencias pasó `npm audit` sin vulnerabilidades conocidas al realizarse; esto no garantiza ausencia de fallos futuros. Usa una sola instancia de servidor con disco persistente para esta biblioteca personal.
