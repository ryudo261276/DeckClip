import hashlib
import json
import socket
import ssl
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
sys.path.insert(0, str(Path(__file__).parents[1]))
from providers import Uploader, TransferError, UploadCancelled
from main import Plugin


def immediate(coroutine):
    try:
        yielded = coroutine.send(None)
        raise AssertionError(f'Unexpected suspension: {yielded}')
    except StopIteration as result:
        return result.value
    finally:
        coroutine.close()


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name)/'clip español.mp4'
        self.data = b'x'*(1024*1024+123)
        self.path.write_bytes(self.data)
        self.progress = []
        self.client = Uploader(self.progress.append)
        self.connection = MagicMock()
        self.response = self.connection.getresponse.return_value
        self.response.status = 201
        self.response.read.return_value = json.dumps({'bin':{'id':'random-bin','expired_at':'2030-01-01'},'file':{'bytes':len(self.data),'sha256':hashlib.sha256(self.data).hexdigest()}}).encode()
        self.factory = patch('providers.http.client.HTTPSConnection', return_value=self.connection)
        self.factory.start()
        self.random = patch('providers.secrets.token_hex',return_value='random-bin'); self.random.start()
        self.addCleanup(self.factory.stop);self.addCleanup(self.random.stop);self.addCleanup(self.temp.cleanup)

    def test_upload_no_account_and_exact_bytes_and_expiry(self):
        result = self.client.upload(self.path)
        self.assertEqual(result,{'url':'https://filebin.net/random-bin','expires':'2030-01-01'})
        self.assertNotIn('Authorization',[c.args[0] for c in self.connection.putheader.call_args_list])
        self.connection.putrequest.assert_called_once_with('POST','/random-bin/clip%20espa%C3%B1ol.mp4')
        blocks=[c.args[0] for c in self.connection.send.call_args_list]
        self.assertEqual(b''.join(blocks),self.data)
        self.assertTrue(all(len(block)<=1024*1024 for block in blocks))
        self.assertEqual(self.progress[-1],1)
        self.connection.close.assert_called_once()

    def test_mismatched_checksum_rejected(self):
        self.response.read.return_value=json.dumps({'bin':{'id':'random-bin'},'file':{'bytes':len(self.data),'sha256':'bad'}}).encode()
        with self.assertRaisesRegex(TransferError,'coinciden'):self.client.upload(self.path)

    def test_capacity_error(self):
        self.response.status=507
        with self.assertRaisesRegex(TransferError,'capacidad'):self.client.upload(self.path)

    def test_cancel_stops_before_network(self):
        self.client.cancel.set()
        with self.assertRaises(UploadCancelled):self.client.upload(self.path)
        self.connection.putrequest.assert_not_called()

    def test_cancel_mid_stream_closes_connection(self):
        self.connection.send.side_effect=lambda block:self.client.cancel.set()
        with self.assertRaises(UploadCancelled):self.client.upload(self.path)
        self.connection.close.assert_called_once()

    def test_raw_exception_not_exposed(self):
        self.connection.send.side_effect=OSError('private-data')
        with self.assertRaises(TransferError) as error:self.client.upload(self.path)
        self.assertNotIn('private-data',str(error.exception))

    def test_certificate_failure_is_specific(self):
        self.connection.endheaders.side_effect=ssl.SSLCertVerificationError('certificate verify failed')
        with self.assertRaisesRegex(TransferError,'certificado'):self.client.upload(self.path)

    def test_dns_failure_is_specific(self):
        self.connection.endheaders.side_effect=socket.gaierror('unresolvable')
        with self.assertRaisesRegex(TransferError,'DNS'):self.client.upload(self.path)

    def test_confirmation_timeout_is_specific(self):
        self.connection.getresponse.side_effect=TimeoutError()
        with self.assertRaisesRegex(TransferError,'confirmación'):self.client.upload(self.path)
        self.connection.sock.settimeout.assert_called_with(120)

    def test_invalid_json_is_not_reported_as_connection_failure(self):
        self.response.read.return_value=b'<html>proxy error</html>'
        self.response.getheader.return_value='text/html'
        with self.assertRaisesRegex(TransferError,'en lugar de JSON'):self.client.upload(self.path)


class PluginTests(unittest.TestCase):
    def setUp(self):
        self.plugin=Plugin();immediate(self.plugin._main())

    def test_arbitrary_file_rejected(self):
        with self.assertRaisesRegex(ValueError,'MP4'):immediate(self.plugin.start_upload('/any.mp4'))

    def test_path_traversal_rejected(self):
        with self.assertRaises(ValueError):immediate(self.plugin.prepare_native_export('../escape'))

    def test_completed_upload_keeps_link_in_backend(self):
        result={'url':'https://filebin.net/random-bin','expires':'2030-01-01'}
        with patch('main.asyncio.get_running_loop',return_value=MagicMock()),patch('main.asyncio.to_thread',new=AsyncMock(return_value=result)):
            immediate(self.plugin.upload('/exported.mp4'))
        self.assertEqual(self.plugin.state['status'],'uploaded')
        self.assertEqual(immediate(self.plugin.upload_status())['url'],result['url'])

if __name__=='__main__':unittest.main()
