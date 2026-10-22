"""Build a Decky install ZIP after npm run build. No external Python packages needed."""
import ast
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]


def package():
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8-sig'))['version']
    manifest = json.loads((ROOT / 'plugin.json').read_text(encoding='utf-8-sig'))
    if manifest['name'] != 'DeckClip':
        raise ValueError('Unexpected plugin identity')
    required = ['plugin.json', 'package.json', 'main.py', 'providers.py', 'updates.py', 'dist/index.js',
                'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'README.md', 'CHANGELOG.md']
    files = required + [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / 'docs').glob('*.md'))]
    for name in required:
        if not (ROOT / name).is_file():
            raise FileNotFoundError(f'Missing {name}. Run npm run build first.')
    for name in ['main.py', 'providers.py', 'updates.py']:
        ast.parse((ROOT / name).read_text(encoding='utf-8-sig'))
    destination = ROOT / 'out' / f'DeckClip-{version}.zip'
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
        for name in files:
            archive.write(ROOT / name, 'DeckClip/' + name)
    with ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError('Corrupt package')
        assert set(archive.namelist()) == {'DeckClip/' + name for name in files}
        assert json.loads(archive.read('DeckClip/package.json'))['version'] == version
    print(destination)
    return destination


if __name__ == '__main__':
    package()
