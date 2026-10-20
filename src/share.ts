import QRCode from 'qrcode';

export function qrImage(url: string): Promise<string> {
  // Generate locally. The download link is never sent to a QR web service.
  return QRCode.toDataURL(url, {width: 224, margin: 4, errorCorrectionLevel: 'M',
    color: {dark: '#000000', light: '#ffffff'}});
}

export async function copyLink(url: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch { /* Steam's browser may deny the modern API. Try its legacy copy command. */ }
  }
  const previous = document.activeElement as HTMLElement | null;
  const field = document.createElement('textarea');
  field.value = url;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  try {
    field.focus();
    field.select();
    if (!document.execCommand('copy')) throw new Error('El portapapeles no está disponible. Usa el código QR.');
  } finally {
    field.remove();
    previous?.focus();
  }
}
