# Compartir la biblioteca

Enlace temporal creado para esta sesión:
https://camera-genres-blues-participant.trycloudflare.com

Cualquiera con el enlace puede leer los libros publicados. Administración conserva su contraseña. Mantén el Mac encendido, conectado y sin suspensión, el servidor de Node y cloudflared activos. El enlace deja de funcionar al cerrar el túnel; uno nuevo tendrá otra dirección. No es alojamiento permanente.

Los visitantes entran sin cuenta. Progreso, favoritos, notas y descargas se guardan en su navegador y no se comparten con otro dispositivo. Borrar sus datos los elimina. Las cuentas anteriores y sus datos se conservan.

## Programar una segunda parte

1. Entra en Acceso admin con tu usuario y contraseña actuales.
2. En Administrar, añade el PDF o EPUB marcando Guardar como borrador para programar después.
3. En Publicaciones y avisos, escribe el título, día y hora y selecciona el libro. La zona horaria del dispositivo aparece junto al formulario.
4. Guarda la publicación. El anuncio se muestra con Avisarme; el archivo permanece oculto hasta la fecha indicada.

Puedes anunciar antes de subir el archivo; los avisos esperan a que vincules un libro disponible. Cancelar un anuncio pendiente conserva su libro como borrador. Reprogramar un archivo ya publicado no elimina copias que alguien hubiera descargado antes.

## Notificaciones

Avisarme solicita permiso al visitante, sin pedir cuenta ni correo. En iPhone se debe añadir la web a la pantalla de inicio desde Safari y abrir desde su icono. El navegador puede bloquear permisos; la entrega depende de su servicio push y la conexión. La cola persistente comprueba cada 15 segundos los libros disponibles y reintenta fallos temporales. La aceptación del servicio push no confirma recepción en el teléfono.

PUBLIC_URL en .env activa los avisos; debe coincidir con la URL HTTPS de despliegue. Las claves VAPID se generan y guardan en la base de datos y sus respaldos. No las publiques. Si cambia el dominio del túnel, hay que abrir el nuevo enlace y volver a solicitar los avisos; los datos locales pertenecen a cada dirección.

Verificación: pruebas de acceso público, bloqueo de archivos futuros, borradores, aislamiento de cuentas, cancelación, persistencia y reintentos de avisos aprobadas. La entrega real en un teléfono requiere que su propietario conceda permiso; no se ha confirmado en el teléfono de la destinataria.
