# Arquitectura y mantenimiento

## Componentes

- `src/index.tsx`: panel de Decky, selección de clips, galería de tres elementos por página, exportación, barra de progreso, cancelación y reintento.
- `src/native.ts`: localiza el módulo GameRecording de Steam y obtiene clips, miniaturas y nombres de juego. Solicita la exportación a MP4.
- `src/share.ts`: genera el QR localmente y copia el enlace, con alternativa si el navegador rechaza la API moderna del portapapeles.
- `main.py`: métodos del backend invocados desde Decky, control del archivo exportado, tarea de subida, cancelación y estado en memoria.
- `providers.py`: transmisión por bloques a Filebin mediante HTTPS, comprobación de respuesta, tamaño y SHA256, y mensajes de error específicos.

## Recorrido de una subida

1. Steam devuelve los clips guardados mediante GetClips.
2. El frontend solicita una ruta de exportación al backend.
3. Steam ejecuta ExportClip con esa ruta y un nombre único.
4. El backend verifica que el archivo pertenece a una exportación de esta sesión y que no está vacío.
5. El archivo se transmite a Filebin en bloques de hasta 1 MiB. El progreso permanece por debajo del 100 % hasta la confirmación.
6. Se verifica el identificador, tamaño y SHA256 de la respuesta. Se guarda el enlace y la caducidad en memoria.
7. El frontend presenta el QR y permite copiar el enlace.

Las respuestas del proveedor y las excepciones de red se convierten en mensajes acotados. No se muestran cuerpos completos de errores ni se registran vídeos. El QR no consulta una API externa.

## Gestión y actualizaciones (0.7.0)

El borrado original usa GameRecording.DeleteClip y comprueba EResult. La UI solicita confirmación antes de invocarlo. Para MP4, el backend restringe el nombre a un archivo regular directo de Videos/DeckClip, rechaza enlaces simbólicos y bloquea cambios durante una subida.

updates.py consulta /repos/ryudo261276/DeckClip/releases/latest, compara versiones numéricamente y acepta solo el ZIP esperado con SHA256. src/updater.ts solicita la instalación usando window.DeckyBackend.call('utilities/install_plugin', url, 'DeckClip', version, hash, 2). En el código oficial de Decky esta ruta abre la confirmación y valida el hash antes de instalar. La API puede cambiar entre versiones de Decky; se informa si no está disponible.

Fuentes de compatibilidad: https://github.com/SteamDeckHomebrew/decky-loader/blob/main/frontend/src/plugin.ts y https://github.com/SteamDeckHomebrew/decky-loader/blob/main/backend/decky_loader/browser.py

## Dependencias de ejecución

El frontend compila mediante TypeScript y Rollup con las bibliotecas de Decky. El backend utiliza la biblioteca estándar de Python. No hay cuentas de servicio ni base de datos.

Steam proporciona el conversor. La interfaz interna GameRecording puede cambiar: mantener pruebas simuladas no sustituye a comprobar el plugin en una Deck tras actualizaciones importantes del cliente.

## Compilación y pruebas

```sh
npm ci
npm run check
npm test
npm run build
python -m unittest discover -s tests -v
python scripts/package_plugin.py
```

El empaquetador lee la versión de package.json y verifica que el ZIP tenga un directorio raíz DeckClip. Comprueba también los archivos requeridos y su integridad. La carpeta out/ se considera un resultado generado.

Las pruebas actuales cubren subida simulada, contenido transmitido, integridad, cancelación, errores DNS/TLS/timeout, rechazo de archivos ajenos a la sesión, datos de clips, decodificación independiente del QR y copia al portapapeles.

## Antes de publicar una actualización

Actualiza la versión en package.json y package-lock.json, el User-Agent del proveedor si corresponde, y CHANGELOG.md. Ejecuta los comandos anteriores y prueba al menos un clip en la Deck. Crea una versión en GitHub Releases con la etiqueta correspondiente y adjunta el ZIP validado como asset. Actualiza el enlace del README; no guardes ZIP de instalación en el árbol del repositorio. Evita incluir node_modules, grabaciones, enlaces personales o archivos de configuración privada.

## Alcance pendiente

Historial persistente de enlaces, reanudación tras reinicios y compatibilidad documentada por versiones de Steam/Decky. Estos puntos no forman parte de la versión 0.6.0.
