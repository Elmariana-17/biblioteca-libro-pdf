# Publicar Entre páginas

Estado: preparada para desplegar, **todavía no publicada**. Hace falta elegir un servidor compatible con Node.js 24, con disco persistente y HTTPS. No es una web estática: no basta con subir `public/`.

## Opción Node.js

1. Sube el código (sin `node_modules`, `.env` ni la carpeta privada `data`).
2. Ejecuta `npm ci --omit=dev`.
3. Crea o monta un directorio privado persistente. Configura:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4317
DATA_DIR=/datos/entre-paginas
COOKIE_SECURE=true
```

Usa el puerto que asigne tu proveedor si es distinto. Para migrar tu biblioteca, detén el servidor local, crea/descarga una copia y restáurala en ese volumen. Alternativamente, para una biblioteca nueva, ejecuta `npm run setup` con esas mismas variables. No pongas contraseñas en el repositorio.

4. Arranca con `npm start` y configura el proveedor para reiniciar el proceso si cae.
5. Activa HTTPS en el dominio o URL del alojamiento. El proxy debe admitir cuerpos de al menos 55 MB y no exponer `DATA_DIR` ni la raíz del proyecto.
6. Prueba acceso de ambas cuentas, un libro, una nota y una copia de seguridad antes de compartir la dirección.

Con `COOKIE_SECURE=true` las cuentas no podrán mantener sesión en una dirección HTTP sin cifrar. Eso es intencionado: usa HTTPS.

## Opción Docker

La imagen requiere un volumen persistente montado en `/data`. Ejecuta en tu servidor, con Docker instalado:

```sh
docker build -t entre-paginas .
docker volume create entre-paginas-data
docker run --rm -it -v entre-paginas-data:/data entre-paginas node scripts/setup.mjs
docker run -d --name entre-paginas --restart unless-stopped -p 127.0.0.1:4317:4317 -v entre-paginas-data:/data entre-paginas
```

Pon un proxy HTTPS delante del puerto 4317. La imagen sirve con usuario sin privilegios, usa Node 24 y tiene activadas las cookies seguras. Para pruebas HTTP únicamente en tu equipo, añade `-e COOKIE_SECURE=false`; no mantengas esa excepción al publicar.

La imagen Docker está escrita pero no se ha construido en este equipo. Valida la construcción en el servidor antes de desplegar. Para restaurar en Docker, monta también la carpeta de la copia descomprimida y ejecuta el script de restauración apuntando a un volumen de destino vacío.

## Operación

- Una sola instancia de la aplicación y un disco persistente; no uses almacenamiento efímero ni múltiples réplicas.
- Las copias automáticas viven en el mismo volumen. Descarga copias a otro disco o servicio periódicamente.
- La primera sesión de cada dispositivo requiere conexión. La PWA y las descargas del teléfono requieren HTTPS.
- Cada navegador guarda sus propias descargas; borrar datos del navegador las elimina.
- No hay ningún gasto ni alojamiento contratado automáticamente por este proyecto.
