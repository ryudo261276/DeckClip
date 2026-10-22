# Solución de problemas

## No aparecen clips

Guarda primero un clip de la grabación desde Medios de Steam y pulsa Actualizar clips. Una grabación de fondo y un clip guardado no son lo mismo para la lista que utiliza el plugin.

Si Steam cambia su interfaz interna, DeckClip puede no encontrar el módulo de grabación. En ese caso comunica el mensaje exacto y las versiones de Steam, SteamOS y Decky.

## No aparece una miniatura o un nombre de juego

La miniatura procede de los datos de Steam. Si no existe o no carga, aparece Sin captura. Si no se puede resolver el nombre del juego, se muestra su identificador. Esto no impide seleccionar el clip.

## La exportación no termina o Steam devuelve un código

La barra durante esta fase es indeterminada: no representa un porcentaje real de exportación. Comprueba que Steam puede exportar ese mismo clip desde Medios y que tienes espacio libre en la Deck. Conserva el código exacto del error para informar del problema.

## Error DNS

El equipo no ha podido localizar filebin.net. Comprueba la conexión de Internet y la configuración DNS de la red.

## Error de certificado

Comprueba fecha y hora de la Deck. El plugin busca los certificados del sistema SteamOS antes de usar los valores predeterminados de Python. Nunca desactiva la verificación TLS.

## Tiempo de espera o conexión interrumpida

El error indica la fase y los MB enviados. La conexión y el envío usan un tiempo de espera de 60 segundos por operación; la espera de confirmación, 120 segundos. Son tiempos de espera de operaciones de red, no un límite total a la duración de la subida.

Reintentar subida del MP4 vuelve a enviar el archivo exportado. No vuelve a convertirlo. Si el servidor recibió la transferencia pero se perdió la respuesta, el reintento puede crear una copia adicional.

## Filebin devuelve capacidad, cuota o tamaño no permitido

Es una limitación del servicio externo. Espera y reintenta, o prueba con un clip más corto. El plugin no puede ampliar los límites del servidor.

## Respuesta que no es JSON

El servicio o un intermediario respondió en un formato inesperado. El mensaje muestra el estado HTTP y el tipo de contenido cuando está disponible. No implica necesariamente que el archivo no haya llegado al servidor.

## La barra se queda cerca del final

La transferencia todavía necesita confirmación del servidor. DeckClip no muestra éxito ni genera el QR hasta recibir y comprobar esa respuesta.

## Copiar enlace no funciona

Se prueba primero la API de portapapeles del navegador y después el método alternativo compatible con Steam. Si ambos fallan, usa el QR. El plugin no confirma la copia si el navegador informa de un fallo.

## El enlace ha desaparecido o ha caducado

El estado es temporal y se pierde al reiniciar o actualizar Decky. La caducidad remota la controla Filebin. Copia o escanea los enlaces al terminar la subida.

## Datos útiles para informar de un fallo

Indica versión de DeckClip, SteamOS, Steam y Decky; fase donde falla; mensaje exacto; duración y tamaño aproximado del clip. No publiques grabaciones ni enlaces privados salvo que quieras compartirlos.

## Borrado y MP4 exportados

Borrar clip seleccionado afecta al clip original gestionado por Steam. Borrar MP4 seleccionado afecta solo al archivo exportado de Videos/DeckClip. Las confirmaciones distinguen ambas operaciones. Ninguna borra la transferencia ya subida a Filebin. El backend rechaza rutas externas, enlaces simbólicos y borrado de MP4 durante una subida.

## No se puede actualizar

La búsqueda necesita acceso a api.github.com. GitHub limita las consultas sin autenticar: se mantiene una caché de 15 minutos para las comprobaciones al abrir el panel. Buscar actualizaciones fuerza una consulta nueva. No se requiere cuenta ni token.

Solo se ofrecen versiones estables posteriores con un ZIP de nombre DeckClip-<versión>.zip y una huella SHA256 válida. Si falta el asset, no se permite instalar todavía. Si tu Decky no expone utilities/install_plugin, actualiza Decky o instala el ZIP manualmente. No se sobrescriben archivos de Decky desde el backend del plugin.

Si tienes 0.6.0, no verás el botón: instala 0.7.0 manualmente la primera vez.
