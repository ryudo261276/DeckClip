import asyncio
import json
import shutil
import re
import threading
import time
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from providers import Uploader, TransferError, UploadCancelled
from updates import check_latest


class Plugin:
    async def _main(self):
        self.output_folder = Path("/home/deck/Videos/DeckClip")
        self.update_cache = None
        self.update_checked = 0
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
        folder = self.output_folder
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

    def export_path(self, name):
        if not isinstance(name, str) or not name or Path(name).name != name or '/' in name or '\\' in name:
            raise ValueError('Nombre de archivo no válido.')
        path = self.output_folder / name
        if path.suffix.lower() != '.mp4' or path.is_symlink() or not path.is_file():
            raise ValueError('MP4 exportado no encontrado o no permitido.')
        if path.resolve().parent != self.output_folder.resolve():
            raise ValueError('El archivo está fuera de la carpeta de exportación.')
        return path

    async def list_exports(self):
        folder = self.output_folder
        if not folder.is_dir():
            return {'files': [], 'total_size': 0, 'free_space': 0}
        files = []
        for path in folder.glob('*.mp4'):
            if path.is_symlink() or not path.is_file():
                continue
            stat = path.stat()
            files.append({'name': path.name, 'size': stat.st_size, 'modified': stat.st_mtime})
        return {'files': sorted(files, key=lambda row: row['modified'], reverse=True),
                'total_size': sum(row['size'] for row in files), 'free_space': shutil.disk_usage(folder).free}

    async def delete_export(self, name: str):
        self.idle_required()
        path = self.export_path(name)
        path.unlink()
        self.exports.discard(str(path))
        if self.last_export == str(path):
            self.last_export = None
        return True

    async def share_export(self, name: str):
        self.idle_required()
        path = self.export_path(name)
        self.exports.add(str(path))
        return await self.start_upload(str(path))

    async def check_updates(self, force: bool = False):
        if not force and self.update_cache and time.monotonic() - self.update_checked < 900:
            return self.update_cache
        package = json.loads((Path(__file__).parent / 'package.json').read_text(encoding='utf-8-sig'))
        result = await asyncio.to_thread(check_latest, package['version'])
        self.update_cache = result
        self.update_checked = time.monotonic()
        return result

    async def prepare_update(self):
        self.idle_required()
        update = await self.check_updates(True)
        self.idle_required()
        if not update.get('available') or not update.get('installable'):
            raise ValueError('No hay una actualización instalable disponible.')
        return update

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
