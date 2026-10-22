"""Stable releases from this project's GitHub repository only."""
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from providers import tls_context

REPO = 'ryudo261276/DeckClip'


def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r'v?\d+\.\d+\.\d+', value):
        raise ValueError('Versión no válida.')
    return tuple(int(part) for part in value.removeprefix('v').split('.'))


def parse_release(release, current):
    if not isinstance(release, dict) or release.get('draft') or release.get('prerelease'):
        raise ValueError('La versión publicada no es estable.')
    tag = release.get('tag_name', '')
    latest = version_tuple(tag)
    result = {'current': current, 'version': tag.removeprefix('v'),
              'available': latest > version_tuple(current), 'installable': False,
              'notes': str(release.get('body') or '')[:6000]}
    if not result['available']:
        return result
    expected_name = 'DeckClip-' + result['version'] + '.zip'
    expected_url = f'https://github.com/{REPO}/releases/download/{tag}/{expected_name}'
    for asset in release.get('assets', []):
        if asset.get('name') != expected_name:
            continue
        digest = asset.get('digest', '')
        if (asset.get('browser_download_url') != expected_url or
                not isinstance(digest, str) or not re.fullmatch(r'sha256:[a-fA-F0-9]{64}', digest) or
                not isinstance(asset.get('size'), int) or not 0 < asset['size'] < 100 * 1024 * 1024):
            raise ValueError('El instalador publicado no tiene una URL o huella válida.')
        result.update(installable=True, url=expected_url, sha256=digest[7:].lower())
        return result
    result['message'] = 'La versión aún no incluye su ZIP instalable.'
    return result


def check_latest(current):
    request = Request(f'https://api.github.com/repos/{REPO}/releases/latest',
                      headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'DeckClip/' + current})
    try:
        with urlopen(request, timeout=20, context=tls_context()) as response:
            payload = response.read(1024 * 1024 + 1)
            if len(payload) > 1024 * 1024:
                raise ValueError('Respuesta de GitHub demasiado grande.')
            return parse_release(json.loads(payload), current)
    except HTTPError as error:
        if error.code == 404:
            return {'current': current, 'version': current, 'available': False, 'installable': False,
                    'message': 'Todavía no hay una versión estable publicada.'}
        raise RuntimeError(f'GitHub devolvió HTTP {error.code}. Prueba más tarde.') from None
    except (URLError, OSError):
        raise RuntimeError('No se pudo consultar GitHub. Comprueba la conexión.') from None
