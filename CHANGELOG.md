# Historial de cambios

## 0.7.0 — 22 de octubre de 2026

- Borrar el clip seleccionado a través de Steam, con confirmación.
- Gestionar y borrar MP4 exportados dentro de Videos/DeckClip, con confirmación y rutas restringidas.
- Subir MP4 existentes sin repetir la exportación, también después de reiniciar.
- Mostrar tamaño de los MP4 y espacio libre.
- Buscar por nombre del juego o clip en la galería.
- Consultar nuevas versiones estables de este repositorio y mostrar las notas de versión.
- Actualizar desde el plugin usando el instalador de Decky y comprobación SHA256, sin root adicional ni escritura manual de los archivos del plugin.
- 37 pruebas automatizadas; consulta real de GitHub verificada. Pruebas en dispositivo pendientes para estas funciones nuevas.
- La release 0.6.0 se conserva sin cambios.


## 0.6.0

- Galería compacta de tres clips por página, con miniaturas de 72 × 42 y nombre en una línea.
- Tarjetas a ancho completo para evitar que el título del juego se parta letra por letra.
- Barra de actividad durante la exportación y porcentaje durante la subida.
- Selección de certificados TLS del sistema SteamOS cuando están disponibles.
- Tiempos de espera de red ampliados y errores específicos de DNS, certificado, conexión, respuesta y timeout.
- Reintento de subida usando el MP4 ya exportado.
- Validación: 20 pruebas automatizadas y subida pequeña real de datos sintéticos desde el equipo de desarrollo. Posteriormente el usuario confirmó funcionamiento en su Steam Deck.

## 0.5.0

- Miniaturas nativas por clip, nombre de juego, fecha y duración.
- Selección visual con marca y alternativa cuando faltan datos.

## 0.4.0

- Flujo sin cuentas usando Filebin.
- QR local, enlace visible y copia al portapapeles.
- Retirados SMTP y los proveedores que requerían configurar una cuenta.

## 0.3.0 y anteriores

Prototipos de exportación y transferencias. No se recomiendan para instalación. La implementación actual conserva la exportación nativa de Steam y el nombre DeckClip.
