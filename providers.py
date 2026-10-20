"""Streaming uploads using the documented Filebin API."""
import hashlib
import http.client
import json
import secrets
import socket
import ssl
import threading
from pathlib import Path
from urllib.parse import quote


class TransferError(RuntimeError):
    pass


class UploadCancelled(TransferError):
    pass


def tls_context():
    # Decky's bundled Python can have a default CA path absent on SteamOS.
    for location in ('/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt'):
        if Path(location).is_file():
            return ssl.create_default_context(cafile=location)
    return ssl.create_default_context()


class Uploader:
    def __init__(self, progress=lambda value: None, cancel=None):
        self.progress = progress
        self.cancel = cancel or threading.Event()

    def check(self):
        if self.cancel.is_set():
            raise UploadCancelled('Subida cancelada. El MP4 local se conserva.')

    def stream(self, host, method, route, path, headers=None):
        self.check()
        size = path.stat().st_size
        if size <= 0:
            raise TransferError('El MP4 está vacío.')
        connection = http.client.HTTPSConnection(host, timeout=60, context=tls_context())
        sent = 0
        stage = 'conexión'
        digest = hashlib.sha256()
        try:
            connection.putrequest(method, route)
            for name, value in {
                'Content-Length': str(size), 'Content-Type': 'application/octet-stream',
                'Accept': 'application/json', 'User-Agent': 'DeckClip/0.6.0',
                **(headers or {}),
            }.items():
                connection.putheader(name, value)
            connection.endheaders()
            stage = 'envío del vídeo'
            with path.open('rb') as source:
                sent = 0
                while sent < size:
                    self.check()
                    block = source.read(min(1024 * 1024, size - sent))
                    if not block:
                        raise TransferError('El MP4 cambió durante la subida.')
                    connection.send(block)
                    digest.update(block)
                    sent += len(block)
                    self.progress(min(0.98, sent / size))
            stage = 'confirmación del servidor'
            if connection.sock is not None:
                connection.sock.settimeout(120)
            response = connection.getresponse()
            data = response.read(1024 * 1024 + 1)
            if response.status in (401, 403):
                raise TransferError('El servicio rechazó la subida. Comprueba sus límites o inténtalo más tarde.')
            if response.status == 413:
                raise TransferError('El vídeo supera el tamaño permitido por el servicio.')
            if response.status in (429, 507):
                raise TransferError('El servicio alcanzó su cuota o capacidad. Inténtalo más tarde.')
            if response.status != 201:
                raise TransferError(f'El servicio devolvió HTTP {response.status}. El MP4 se conserva.')
            if len(data) > 1024 * 1024:
                raise TransferError('Respuesta del servicio demasiado grande.')
            try:
                payload = json.loads(data)
            except (ValueError, UnicodeError):
                content_type = response.getheader('Content-Type', 'desconocido').split(';')[0][:60]
                raise TransferError(f'Filebin respondió HTTP {response.status} con contenido {content_type}, en lugar de JSON. Reintenta la subida; el MP4 se conserva.') from None
            if not isinstance(payload, dict):
                raise TransferError('Respuesta del servicio no válida.')
            return payload, size, digest.hexdigest()
        except ssl.SSLCertVerificationError:
            raise TransferError('No se pudo verificar el certificado de Filebin. Comprueba la fecha de la Deck y sus certificados del sistema. El MP4 se conserva.') from None
        except socket.gaierror:
            raise TransferError('No se pudo localizar filebin.net (DNS). Comprueba la conexión de la Deck. El MP4 se conserva.') from None
        except (TimeoutError, socket.timeout):
            raise TransferError(f'Tiempo de espera agotado durante {stage} ({sent // 1048576} de {size // 1048576} MB enviados). Reintenta; el MP4 se conserva.') from None
        except ssl.SSLError:
            raise TransferError('Falló la conexión segura con Filebin. Comprueba la red y la fecha de la Deck. El MP4 se conserva.') from None
        except (OSError, http.client.HTTPException):
            raise TransferError(f'Conexión interrumpida durante {stage} ({sent // 1048576} de {size // 1048576} MB enviados). Reintenta; el MP4 se conserva.') from None
        finally:
            connection.close()

    def upload(self, path):
        path = Path(path)
        bin_id = secrets.token_hex(16)
        payload, size, digest = self.stream(
            'filebin.net', 'POST', '/' + bin_id + '/' + quote(path.name, safe=''), path)
        file = payload.get('file', {})
        bin_data = payload.get('bin', {})
        if not isinstance(file, dict) or not isinstance(bin_data, dict):
            raise TransferError('Filebin no confirmó la subida.')
        if bin_data.get('id') != bin_id or file.get('bytes') != size or file.get('sha256') != digest:
            raise TransferError('Filebin devolvió datos que no coinciden con el MP4.')
        self.progress(1)
        return {'url': 'https://filebin.net/' + bin_id,
                'expires': str(bin_data.get('expired_at', 'Consultar el enlace de Filebin.'))}
