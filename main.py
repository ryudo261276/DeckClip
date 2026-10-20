import asyncio
import re
import threading
import time
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from providers import Uploader, TransferError, UploadCancelled


class Plugin:
    async def _main(self):
        self.exports = set()
        self.last_export = None
        self.task = None
        self.cancel = threading.Event()
        self.state = {'status': 'idle', 'progress': 0, 'message': '', 'url': '', 'expires': ''}

    def idle_required(self):
        if self.task and not self.task.done():
            raise RuntimeError('Ya hay una operación en curso.')

    async def prepare_native_export(self, clip_id: str):
        self.idle_required()
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,180}', clip_id):
            raise ValueError('Identificador de clip no válido.')
        folder = Path('/home/deck/Videos/DeckClip')
        folder.mkdir(parents=True, exist_ok=True)
        path = str(folder / f'clip-{clip_id}-{time.time_ns()}.mp4')
        self.exports.add(path)
        return path

    async def start_upload(self, path: str):
        self.idle_required()
        if path not in self.exports or not Path(path).is_file() or Path(path).is_symlink() or Path(path).suffix != '.mp4':
            raise ValueError('No se encontró el MP4 exportado en esta sesión.')
        if Path(path).stat().st_size <= 0:
            raise ValueError('Steam generó un MP4 vacío.')
        self.last_export = path
        self.cancel = threading.Event()
        self.state = {'status': 'uploading', 'progress': 0, 'message': 'Subiendo a Filebin…', 'url': '', 'expires': ''}
        self.task = asyncio.create_task(self.upload(path))
        return True

    async def upload(self, path):
        loop = asyncio.get_running_loop()
        def progress(value):
            loop.call_soon_threadsafe(self.update_progress, value)
        try:
            result = await asyncio.to_thread(Uploader(progress, self.cancel).upload, path)
            self.state.update(status='uploaded', progress=1, url=result['url'], expires=result['expires'],
                              message='Vídeo listo. Escanea el QR con tu móvil o copia el enlace.')
        except UploadCancelled as error:
            self.state.update(status='cancelled', message=str(error))
        except TransferError as error:
            self.state.update(status='error', message=str(error))
        except Exception:
            self.state.update(status='error', message='No se pudo completar la subida. El MP4 local se conserva.')

    def update_progress(self, value):
        if self.state['status'] == 'uploading':
            self.state['progress'] = value
            if value >= 0.98:
                self.state['message'] = 'Vídeo enviado. Esperando confirmación de Filebin…'

    async def upload_status(self):
        return {**self.state, 'can_retry': bool(self.last_export and self.state['status'] in ('error', 'cancelled'))}

    async def retry_upload(self):
        if not self.last_export:
            raise ValueError('No hay un MP4 pendiente de subida.')
        return await self.start_upload(self.last_export)

    async def cancel_upload(self):
        if self.state['status'] == 'uploading':
            self.cancel.set()
            self.state['message'] = 'Cancelando subida…'
        return True

    async def _unload(self):
        self.cancel.set()
        if self.task:
            await self.task
