import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
sys.path.insert(0,str(Path(__file__).parents[1]))
from main import Plugin
from updates import parse_release, version_tuple


def immediate(coro):
    try:
        value=coro.send(None)
        raise AssertionError(f'Unexpected suspension {value}')
    except StopIteration as result:return result.value
    finally:coro.close()


def release(version='0.8.0'):
    return {'tag_name':'v'+version,'draft':False,'prerelease':False,'body':'Changes',
            'assets':[{'name':f'DeckClip-{version}.zip','size':12345,'digest':'sha256:'+'a'*64,
                       'browser_download_url':f'https://github.com/ryudo261276/DeckClip/releases/download/v{version}/DeckClip-{version}.zip'}]}


class ReleaseTests(unittest.TestCase):
    def test_newer_stable_installer_and_digest(self):
        result=parse_release(release(),'0.7.0')
        self.assertTrue(result['available']);self.assertTrue(result['installable'])
        self.assertEqual(result['sha256'],'a'*64)

    def test_numeric_version_order_and_no_downgrade(self):
        self.assertTrue(version_tuple('0.10.0')>version_tuple('0.9.0'))
        self.assertFalse(parse_release(release('0.6.0'),'0.7.0')['available'])
        self.assertFalse(parse_release(release('0.7.0'),'0.7.0')['available'])

    def test_foreign_url_rejected(self):
        r=release();r['assets'][0]['browser_download_url']='https://example.org/DeckClip.zip'
        with self.assertRaises(ValueError):parse_release(r,'0.7.0')

    def test_missing_digest_rejected(self):
        r=release();r['assets'][0].pop('digest')
        with self.assertRaises(ValueError):parse_release(r,'0.7.0')

    def test_draft_prerelease_and_bad_version_rejected(self):
        for r in [release()|{'draft':True},release()|{'prerelease':True},release()|{'tag_name':'../../bad'}]:
            with self.assertRaises(ValueError):parse_release(r,'0.7.0')

    def test_release_without_zip_cannot_install(self):
        result=parse_release(release()|{'assets':[]},'0.7.0')
        self.assertTrue(result['available']);self.assertFalse(result['installable'])


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.plugin=Plugin();immediate(self.plugin._main())
        self.plugin.output_folder=Path(self.temp.name)/'exports';self.plugin.output_folder.mkdir()
        self.video=self.plugin.output_folder/'clip-test.mp4';self.video.write_bytes(b'video')

    def test_delete_only_selected_export_and_keep_other_files(self):
        other=self.plugin.output_folder/'other.mp4';other.write_bytes(b'other')
        self.plugin.last_export=str(self.video)
        immediate(self.plugin.delete_export(self.video.name))
        self.assertFalse(self.video.exists());self.assertTrue(other.exists())
        self.assertIsNone(self.plugin.last_export)

    def test_path_traversal_and_wrong_extensions_rejected(self):
        for name in ['../clip-test.mp4','sub/clip.mp4','sub\\clip.mp4','/tmp/clip.mp4','anything.txt']:
            with self.assertRaises(ValueError):immediate(self.plugin.delete_export(name))
        self.assertTrue(self.video.exists())

    def test_deleting_blocked_during_upload(self):
        self.plugin.task=MagicMock();self.plugin.task.done.return_value=False
        with self.assertRaises(RuntimeError):immediate(self.plugin.delete_export(self.video.name))
        self.assertTrue(self.video.exists())

    def test_listing_totals_and_excludes_non_video(self):
        (self.plugin.output_folder/'notes.txt').write_text('ignore')
        result=immediate(self.plugin.list_exports())
        self.assertEqual(len(result['files']),1);self.assertEqual(result['total_size'],5)

    def test_existing_export_can_be_shared_after_restart(self):
        with patch.object(self.plugin,'start_upload',new=AsyncMock(return_value=True)) as start:
            self.assertTrue(immediate(self.plugin.share_export(self.video.name)))
        self.assertIn(str(self.video),self.plugin.exports);start.assert_awaited_once_with(str(self.video))

    def test_update_install_blocked_during_upload(self):
        self.plugin.task=MagicMock();self.plugin.task.done.return_value=False
        with self.assertRaises(RuntimeError):immediate(self.plugin.prepare_update())

if __name__=='__main__':unittest.main()
