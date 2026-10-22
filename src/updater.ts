export type Update = {current:string; version:string; available:boolean; installable:boolean; url?:string; sha256?:string; notes?:string; message?:string};

export async function requestInstall(update: Update): Promise<void> {
  const expected = `https://github.com/ryudo261276/DeckClip/releases/download/v${update.version}/DeckClip-${update.version}.zip`;
  if (!update.available || !update.installable || update.url !== expected || !/^[a-f0-9]{64}$/.test(update.sha256 ?? '')) {
    throw new Error('El instalador de actualización no es válido.');
  }
  type Backend = {call(route:string, ...args:unknown[]):Promise<unknown>};
  const backend = (window as unknown as {DeckyBackend?:Backend}).DeckyBackend;
  if (!backend?.call) throw new Error('Esta versión de Decky no expone su instalador. Actualiza Decky o instala el ZIP manualmente.');
  // Official Decky route. UPDATE=2 opens Decky's own confirmation and checks SHA256.
  await backend.call('utilities/install_plugin', update.url, 'DeckClip', update.version, update.sha256, 2);
}
