import { findModuleExport } from '@decky/ui';

export type Clip = {clip_id: string; game_id?: string; date_recorded?: number; duration_ms?: string; name?: string; thumbnail_url?: string; game_name?: string};
type AppStore = {GetAppOverviewByGameID(id: string): {display_name?: string} | undefined};
type Reply = {GetEResult(): number; Body(): {toObject(): {clip?: Clip[]}; result(): number}};
type RecordingRPC = {GetClips(req: object): Promise<Reply>; ExportClip(req: object): Promise<Reply>; DeleteClip?(req:object):Promise<Reply>};
function rpc(): RecordingRPC {
  const api = findModuleExport((value: RecordingRPC | undefined) =>
    typeof value?.GetClips === 'function' && typeof value?.ExportClip === 'function');
  if (!api) throw new Error('No se encontró el exportador nativo de Steam. Esta versión del cliente puede haber cambiado.');
  return api;
}
export async function clips(): Promise<Clip[]> {
  const response = await rpc().GetClips({});
  if (response.GetEResult() !== 1) throw new Error(`Steam no pudo listar los clips (${response.GetEResult()}).`);
  let store: AppStore | undefined;
  try {
    store = findModuleExport((value: AppStore | undefined) => typeof value?.GetAppOverviewByGameID === 'function');
  } catch { /* Clip selection remains available if Steam's app store changes. */ }
  return (response.Body().toObject().clip ?? []).map(clip => {
    let gameName: string | undefined;
    try {gameName = clip.game_id ? store?.GetAppOverviewByGameID(clip.game_id)?.display_name : undefined;} catch { /* Use game ID below. */ }
    return {...clip, game_name: gameName || (clip.game_id ? `Juego ${clip.game_id}` : 'Juego desconocido')};
  }).sort((a, b) => (b.date_recorded ?? 0) - (a.date_recorded ?? 0));
}
export async function exportNative(id: string, path: string): Promise<void> {
  const response = await rpc().ExportClip({clip_id: id, export_mp4_path: path, use_unique_filename: false});
  if (response.GetEResult() !== 1) throw new Error(`Error de Steam (${response.GetEResult()}).`);
  const result = response.Body().result();
  if (result !== 1) throw new Error(`El exportador de Steam devolvió el código ${result}.`);
}

export async function deleteClip(id:string):Promise<void> {
  const api = rpc();
  if (!api.DeleteClip) throw new Error('Steam no expone la función para borrar clips en esta versión.');
  const response = await api.DeleteClip({clip_id:id});
  if(response.GetEResult() !== 1) throw new Error(`Steam no pudo borrar el clip (${response.GetEResult()}).`);
}
