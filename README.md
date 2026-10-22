# DeckClip

**Comparte los clips de tu Steam Deck con un código QR o un enlace, sin crear cuentas.**

DeckClip es un plugin para **Decky Loader**. Muestra tus clips guardados de Steam con una miniatura y el nombre del juego, los exporta a MP4 mediante el conversor de Steam y los sube a Filebin. Al terminar puedes escanear el QR desde el móvil o copiar el enlace para compartirlo.

No necesita una cuenta de almacenamiento, claves de API, configuración de correo ni un conversor adicional.

## Descargar e instalar

**[Descargar DeckClip 0.7.0](https://github.com/ryudo261276/DeckClip/releases/download/v0.7.0/DeckClip-0.7.0.zip)**

1. Descarga el ZIP y cópialo a tu Steam Deck. No lo descomprimas.
2. Con Decky Loader instalado, abre sus ajustes.
3. En las opciones de desarrollador de Decky, utiliza la instalación de plugins desde ZIP. La etiqueta exacta puede variar entre versiones.
4. Selecciona `DeckClip-0.7.0.zip` y abre **DeckClip** en el menú de acceso rápido.

Si vienes de la 0.6.0, instala este ZIP una vez. La 0.7.0 incorpora el botón para las próximas actualizaciones. El paquete conserva el nombre DeckClip. La [versión 0.6.0](https://github.com/ryudo261276/DeckClip/releases/tag/v0.6.0) sigue disponible en Releases.

Más detalles en la [guía de instalación](docs/INSTALACION.md).

## Cómo usarlo

1. En **Medios de Steam**, guarda un clip de una grabación.
2. Abre DeckClip y pulsa **Actualizar clips**.
3. Elige el clip por su miniatura, juego, fecha y duración. La selección aparece marcada con **✓**.
4. Pulsa **Subir y obtener enlace**.
5. Espera la exportación y la subida. Durante la exportación aparece una barra de actividad; durante la subida verás el porcentaje.
6. Escanea el **QR** con el móvil o pulsa **Copiar enlace**.

Desde el móvil puedes enviar el enlace por WhatsApp, Telegram o correo usando tus aplicaciones habituales. DeckClip no envía correos ni te pide configurar una cuenta. El móvil no necesita estar conectado a la misma red que la Deck para abrir el enlace.

## Novedades de la versión 0.7.0

- **Borrar clips de Steam** desde el plugin, con confirmación que identifica el clip original.
- **Borrar MP4 exportados** para recuperar espacio, independientemente del clip de Steam.
- **MP4 exportados:** lista paginada, tamaño total y espacio libre. Puedes subir un MP4 existente sin convertirlo otra vez, incluso después de reiniciar Decky.
- **Buscar por juego o clip** en la galería.
- **Actualizaciones dentro del plugin:** consulta las versiones estables de este repositorio al abrir el panel (con caché de 15 minutos) o pulsando Buscar actualizaciones. Si hay una nueva versión, muestra sus notas y permite abrir el instalador de Decky.

### Borrado

Selecciona un clip y pulsa Borrar clip seleccionado para borrar el original desde Steam. En MP4 exportados puedes seleccionar y borrar únicamente el archivo de Videos/DeckClip. Cada opción solicita confirmación y explica qué elimina. El borrado es definitivo. No se eliminan automáticamente los otros archivos ni las transferencias de Filebin. Las operaciones sobre MP4 se bloquean durante una subida.

### Actualizar

Abre Buscar actualizaciones y, si aparece una versión posterior, pulsa Actualizar. Decky mostrará su propia confirmación de instalación y recargará el plugin. El instalador acepta únicamente un asset del repositorio ryudo261276/DeckClip con nombre y URL esperados, y entrega la huella SHA256 a Decky para comprobar el archivo. No se instala nada sin pulsar el botón.

Si GitHub no responde o no se puede acceder al instalador de Decky, se muestra el error y puedes instalar el ZIP desde Releases como antes. Guarda tus enlaces antes de actualizar: la sesión se pierde al recargar.

## Qué incluye

- Galería compacta, con **tres clips por página** y miniaturas de Steam.
- Nombre del juego, fecha, duración e indicador del clip seleccionado.
- Exportación mediante el **conversor nativo de Steam**.
- Subida automática a **Filebin**, sin abrir su web ni introducir credenciales.
- Barra de progreso, cancelación y errores específicos de conexión.
- Reintento con el MP4 ya exportado, sin volver a convertirlo.
- QR generado **localmente**, sin enviar el enlace a un servicio de códigos QR.
- Copia del enlace y visualización de la caducidad devuelta por Filebin.

## Archivos y privacidad

La exportación y la subida conservan los originales. Solo se borra un clip o MP4 cuando eliges expresamente la opción de borrado y confirmas. Los MP4 exportados quedan en:

```text
/home/deck/Videos/DeckClip/
```

Steam suele guardar los clips originales en:

```text
/home/deck/.local/share/Steam/userdata/<id>/gamerecordings/clips/
```

Esa ubicación se puede cambiar en Steam. DeckClip consulta la lista de clips al cliente de Steam y no depende de una ruta fija de origen.

**Al pulsar subir, el MP4 se envía a Filebin.** El enlace es temporal: la fecha de caducidad se muestra en el plugin. Cualquiera que tenga el enlace puede acceder al vídeo y borrarlo. Usa el enlace con las personas con las que quieras compartirlo.

Cerrar el panel no cancela una subida en curso. El enlace sigue disponible al reabrir el panel mientras el backend continúe activo. **Reiniciar o actualizar Decky pierde el estado y los enlaces de esa sesión**: copia o escanea el enlace antes.

## Requisitos y límites

- Steam Deck con Steam y Decky Loader instalados, y conexión a Internet para subir.
- Clips guardados de Steam; todavía no se exportan directamente sesiones de fondo sin guardar como clip.
- Filebin es un servicio externo: puede rechazar subidas por capacidad, tamaño u otras limitaciones. No se promete disponibilidad ni tamaño ilimitados.
- La exportación utiliza una interfaz interna de Steam que puede cambiar con actualizaciones.
- No hay historial persistente, borrado remoto automático ni reanudación de subidas tras reiniciar Decky.
- Un reintento crea una nueva transferencia. Si la anterior terminó en Filebin pero se perdió la respuesta, puede quedar una copia adicional remota.

## Si algo falla

El MP4 local se conserva. Si aparece **Reintentar subida del MP4**, puedes volver a subir sin repetir la exportación.

Los errores distinguen DNS, certificados, conexión interrumpida, tiempo de espera, respuesta inesperada y límites del servicio. Consulta la [guía de solución de problemas](docs/SOLUCION_DE_PROBLEMAS.md).

## Estado y verificación

La versión 0.7.0 compila y pasa **37 pruebas automatizadas**: 25 del backend y 12 del frontend. Se ha consultado la API real de Releases de GitHub. El borrado y el instalador se han comprobado con pruebas simuladas; falta validarlos en una Steam Deck con esta versión.

La 0.6.0 fue confirmada como funcional por el usuario en su Deck. No se han documentado las versiones exactas de SteamOS, Steam y Decky del dispositivo probado; no se afirma compatibilidad con todas las combinaciones.

Consulta el [historial de cambios](CHANGELOG.md).

## Desarrollo

```sh
npm ci
npm run check
npm test
npm run build
python -m unittest discover -s tests -v
python scripts/package_plugin.py
```

El último comando genera el ZIP de instalación dentro de `out/`. El paquete contiene un único directorio `DeckClip` con el frontend compilado, backend, metadatos, documentación y licencias. No incluye dependencias de desarrollo, credenciales ni grabaciones.

Más detalles sobre el funcionamiento en [arquitectura y mantenimiento](docs/DESARROLLO.md).

## Créditos y licencia

- Basado en la [plantilla de Decky](https://github.com/SteamDeckHomebrew/decky-plugin-template).
- Exportación y miniaturas del cliente de [Steam](https://help.steampowered.com/es/faqs/view/23B7-49AD-4A28-9590).
- Alojamiento temporal mediante la [API de Filebin](https://filebin.net/api).
- QR con [node-qrcode](https://github.com/soldair/node-qrcode).

Licencia **BSD-3-Clause**. Consulta [LICENSE](LICENSE) y [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).

Este proyecto no es un producto oficial de Valve, Decky Loader ni Filebin. No incluye código de Steam ni archivos de juegos.
