# Instalación y actualización

## Antes de empezar

DeckClip funciona como plugin de Decky Loader en la Steam Deck. No es una aplicación de Windows y no se instala como un juego de Steam.

Necesitas Decky Loader ya instalado. Para obtenerlo o revisar su instalación usa el proyecto oficial: https://github.com/SteamDeckHomebrew/decky-loader

## Instalar el ZIP

1. Descarga el ZIP de instalación enlazado desde el README.
2. Copia el ZIP a la Steam Deck, por ejemplo a Descargas. No lo descomprimas.
3. Abre el menú de acceso rápido y los ajustes de Decky.
4. Accede a las opciones de desarrollador y utiliza la instalación desde ZIP.
5. Elige el archivo y, cuando termine, abre DeckClip desde Decky.

Los nombres de los menús pueden variar según la versión. No necesitas activar permisos root ni instalar FFmpeg para DeckClip.

## Primera subida

Guarda un clip desde Medios de Steam, actualiza la galería, selecciona su tarjeta y pulsa Subir y obtener enlace. La exportación genera un MP4 local; después se realiza la subida. Espera a que aparezca el QR antes de dar la transferencia por terminada.

## Actualizar

Instala el nuevo ZIP con el mismo procedimiento. El nombre del plugin sigue siendo DeckClip. Guarda los enlaces que necesites antes de actualizar, porque el backend mantiene su estado solo en memoria.

## Desinstalar y archivos locales

Desinstala DeckClip desde Decky. Los MP4 exportados de /home/deck/Videos/DeckClip/ no se eliminan automáticamente. Puedes gestionarlos desde el modo Escritorio. Los clips originales de Steam se conservan.

Desinstalar el plugin no borra las transferencias de Filebin: siguen las reglas de caducidad de ese servicio.

## Desde la versión 0.7.0

La 0.6.0 no tenía comprobador de actualizaciones: hay que instalar manualmente el ZIP 0.7.0 una vez. Después podrás usar Buscar actualizaciones desde el panel. Las nuevas versiones se instalan mediante el instalador y la confirmación de Decky. Las versiones anteriores se conservan en Releases.
