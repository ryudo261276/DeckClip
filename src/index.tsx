import { Button, ButtonItem, PanelSection, PanelSectionRow, TextField, ConfirmModal, showModal, staticClasses } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';
import { useEffect, useState } from 'react';
import { FaVideo } from 'react-icons/fa';
import { clips, exportNative, deleteClip, Clip } from './native';
import { copyLink, qrImage } from './share';
import { requestInstall, Update } from './updater';

type Status = {status:string; progress:number; message:string; url:string; expires:string; can_retry?:boolean};
const prepare = callable<[string], string>('prepare_native_export');
const upload = callable<[string], boolean>('start_upload');
const getStatus = callable<[], Status>('upload_status');
const retry = callable<[], boolean>('retry_upload');
const cancel = callable<[], boolean>('cancel_upload');

type Exported = {name:string; size:number; modified:number};
type Exports = {files:Exported[]; total_size:number; free_space:number};
const listExports = callable<[], Exports>('list_exports');
const deleteExport = callable<[string], boolean>('delete_export');
const shareExport = callable<[string], boolean>('share_export');
const checkUpdates = callable<[boolean], Update>('check_updates');
const prepareUpdate = callable<[], Update>('prepare_update');
const sizeLabel = (n:number) => `${(n/1048576).toFixed(1)} MB`;
function confirmDelete(title:string, description:string, action:()=>Promise<void>) {
  const modal = showModal(<ConfirmModal strTitle={title} strDescription={description}
    strOKButtonText="Borrar definitivamente" strCancelButtonText="Cancelar" bDestructiveWarning
    onOK={() => {modal.Close(); void action();}} onCancel={() => modal.Close()}/>);
}

function ClipCard({item, selected, disabled, onSelect}: {item:Clip; selected:boolean; disabled:boolean; onSelect:()=>void}) {
  const [failed, setFailed] = useState(false);
  const seconds = Math.floor(Number(item.duration_ms ?? 0) / 1000);
  const duration = Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}` : '';
  const date = item.date_recorded ? new Date(item.date_recorded*1000).toLocaleString() : '';
  return <PanelSectionRow><Button disabled={disabled} onClick={onSelect} style={{width:'100%',minWidth:0,height:68,padding:'7px 9px',boxSizing:'border-box',textAlign:'left'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,width:'100%',minWidth:0}}>
      {item.thumbnail_url && !failed ? <img src={item.thumbnail_url} alt="" loading="lazy" onError={() => setFailed(true)} style={{width:72,height:42,objectFit:'cover',borderRadius:4,flexShrink:0}}/> :
        <div style={{width:72,height:42,background:'#253341',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>Sin captura</div>}
      <div style={{minWidth:0,flex:1,overflow:'hidden'}}>
        <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{selected ? '✓ ' : ''}{item.game_name}</div>
        <div style={{fontSize:10,opacity:0.8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{[duration,date].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  </Button></PanelSectionRow>;
}

function Content() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof clips>>>([]);
  const [clip, setClip] = useState('');
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [exported, setExported] = useState<Exports>({files:[],total_size:0,free_space:0});
  const [showExports, setShowExports] = useState(false);
  const [exportPage, setExportPage] = useState(0);
  const [selectedExport, setSelectedExport] = useState('');
  const [update, setUpdate] = useState<Update>();
  const [updateMessage, setUpdateMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Status>();
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const refresh = async () => {
    setBusy(true);
    try {const result = await clips(); setRows(result); setPage(0); setClip(result[0]?.clip_id ?? ''); setMessage('');}
    catch(e) {setMessage(String(e));} finally {setBusy(false);}
  };
  const refreshExports = async () => {
    const result = await listExports(); setExported(result); setExportPage(0); setSelectedExport(result.files[0]?.name ?? '');
  };
  const inspectUpdates = async (force:boolean) => {
    setChecking(true);
    try {const result = await checkUpdates(force); setUpdate(result); setUpdateMessage(result.message ?? (result.available ? 'Hay una nueva versión disponible.' : 'Tienes la última versión estable.'));}
    catch(e) {setUpdateMessage(String(e));} finally {setChecking(false);}
  };
  const perform = async (action:()=>Promise<void>) => {
    setBusy(true); setMessage('');
    try {await action();} catch(e) {setMessage(String(e));} finally {setBusy(false);}
  };
  useEffect(() => {
    void inspectUpdates(false);
    void refreshExports().catch(e => setMessage(String(e)));
    void refresh(); let alive = true; let pending = false;
    const poll = async () => {
      if(pending) return;
      pending = true;
      try {const result = await getStatus(); if(alive) setJob(result);}
      catch {if(alive) setMessage('No se pudo consultar el estado de DeckClip.');}
      finally {pending = false;}
    };
    void poll(); const timer = setInterval(() => void poll(), 1000);
    return () => {alive = false; clearInterval(timer);};
  }, []);
  useEffect(() => {
    let alive = true; setQr(''); setShareMessage('');
    if(job?.url) void qrImage(job.url).then(data => {if(alive) setQr(data);})
      .catch(() => {if(alive) setShareMessage('No se pudo generar el QR. Puedes copiar el enlace.');});
    return () => {alive = false;};
  }, [job?.url]);
  const filtered = rows.filter(r => `${r.game_name ?? ''} ${r.name ?? ''} ${r.clip_id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length/3));
  const visible = filtered.slice(page*3,page*3+3);
  const exportPages = Math.max(1,Math.ceil(exported.files.length/3));
  const exportVisible = exported.files.slice(exportPage*3,exportPage*3+3);
  const selectedClip = rows.find(r => r.clip_id===clip);
  const locked = busy || job?.status === 'uploading';
  const expires = job?.expires ? new Date(job.expires) : undefined;
  const expiryText = expires && !Number.isNaN(expires.getTime()) ? expires.toLocaleString() : job?.expires;
  return <>
    <PanelSection title="Compartir clip · sin cuentas">
      <PanelSectionRow><div>Elige un clip. Steam lo exporta a MP4 y DeckClip lo sube a Filebin. Después escanea el QR o copia el enlace.</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={locked} onClick={() => void refresh()}>Actualizar clips</ButtonItem></PanelSectionRow>
      {!rows.length && !busy && <PanelSectionRow><div>No hay clips guardados. Guarda primero un clip desde Medios de Steam.</div></PanelSectionRow>}
      <PanelSectionRow><TextField label="Buscar juego o clip" value={query} disabled={locked} onChange={e => {setQuery(e.target.value);setPage(0);}}/></PanelSectionRow>
      {visible.map(item => <ClipCard key={item.clip_id} item={item} selected={item.clip_id === clip} disabled={locked} onSelect={() => setClip(item.clip_id)}/>)}
      {pages > 1 && <PanelSectionRow><div style={{display:'flex',gap:6,alignItems:'center',width:'100%'}}>
        <Button disabled={locked || page===0} onClick={() => setPage(page-1)} style={{flex:1,minWidth:0,padding:6}}>Anterior</Button>
        <span style={{fontSize:11,whiteSpace:'nowrap'}}>{page+1}/{pages}</span>
        <Button disabled={locked || page+1>=pages} onClick={() => setPage(page+1)} style={{flex:1,minWidth:0,padding:6}}>Siguiente</Button>
      </div></PanelSectionRow>}
      <PanelSectionRow><ButtonItem layout="below" disabled={locked || !selectedClip} onClick={() => {
        if(!selectedClip) return;
        confirmDelete('Borrar clip de Steam', `Se borrará el clip original de ${selectedClip.game_name}: ${selectedClip.name || selectedClip.clip_id}. No borra MP4 exportados ni enlaces de Filebin.`,
          () => perform(async () => {await deleteClip(selectedClip.clip_id); await refresh(); setMessage('Clip borrado de Steam.');}));
      }}>Borrar clip seleccionado</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={locked || !clip} onClick={async () => {
        setBusy(true); setMessage('Steam está exportando el clip…');
        try {
          const path = await prepare(clip); await exportNative(clip, path);
          setMessage('MP4 listo. Iniciando subida…');
          await upload(path); setJob(await getStatus()); await refreshExports(); setMessage('');
        } catch(e) {setMessage(String(e));} finally {setBusy(false);}
      }}>Subir y obtener enlace</ButtonItem></PanelSectionRow>
      {message && <PanelSectionRow><div role="status">{message}</div></PanelSectionRow>}
      {busy && <PanelSectionRow><progress aria-label="Preparando clip" style={{width:'100%',height:12}}/></PanelSectionRow>}
    </PanelSection>
    <PanelSection title="MP4 exportados">
      <PanelSectionRow><ButtonItem layout="below" disabled={locked} onClick={() => {
        setShowExports(!showExports); void refreshExports().catch(e => setMessage(String(e)));
      }}>{showExports ? 'Ocultar MP4' : `Ver MP4 (${exported.files.length})`}</ButtonItem></PanelSectionRow>
      {showExports && <>
        <PanelSectionRow><div style={{fontSize:11}}>Exportados: {sizeLabel(exported.total_size)} · Libre: {(exported.free_space/1073741824).toFixed(1)} GB</div></PanelSectionRow>
        {exportVisible.map(file => <PanelSectionRow key={file.name}><Button disabled={locked} onClick={() => setSelectedExport(file.name)} style={{width:'100%',minWidth:0,padding:8,textAlign:'left'}}>
          <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:11}}>{selectedExport===file.name ? '✓ ' : ''}{file.name}</div>
          <div style={{fontSize:10}}>{sizeLabel(file.size)} · {new Date(file.modified*1000).toLocaleDateString()}</div>
        </Button></PanelSectionRow>)}
        {exportPages > 1 && <PanelSectionRow><div style={{display:'flex',gap:6,width:'100%',alignItems:'center'}}>
          <Button disabled={locked || exportPage===0} onClick={() => setExportPage(exportPage-1)} style={{flex:1,minWidth:0}}>Anterior</Button>
          <span>{exportPage+1}/{exportPages}</span>
          <Button disabled={locked || exportPage+1>=exportPages} onClick={() => setExportPage(exportPage+1)} style={{flex:1,minWidth:0}}>Siguiente</Button>
        </div></PanelSectionRow>}
        <PanelSectionRow><ButtonItem layout="below" disabled={locked || !selectedExport} onClick={() => void perform(async () => {await shareExport(selectedExport);setJob(await getStatus());})}>Subir MP4 sin convertir</ButtonItem></PanelSectionRow>
        <PanelSectionRow><ButtonItem layout="below" disabled={locked || !selectedExport} onClick={() => confirmDelete('Borrar MP4 exportado', `Se borrará definitivamente ${selectedExport} de Videos/DeckClip. El clip de Steam y los enlaces subidos se conservan.`,
          () => perform(async () => {await deleteExport(selectedExport);await refreshExports();setMessage('MP4 borrado.');}))}>Borrar MP4 seleccionado</ButtonItem></PanelSectionRow>
      </>}
    </PanelSection>
    <PanelSection title={`DeckClip ${update?.current ?? '0.7.0'} · actualizaciones`}>
      <PanelSectionRow><ButtonItem layout="below" disabled={locked || checking} onClick={() => void inspectUpdates(true)}>{checking ? 'Buscando versión…' : 'Buscar actualizaciones'}</ButtonItem></PanelSectionRow>
      {updateMessage && <PanelSectionRow><div style={{fontSize:11}}>{updateMessage}</div></PanelSectionRow>}
      {update?.available && <>
        <PanelSectionRow><div>Nueva versión: {update.version}</div></PanelSectionRow>
        {update.notes && <PanelSectionRow><div style={{fontSize:11,maxHeight:120,overflowY:'auto',whiteSpace:'pre-wrap'}}>{update.notes}</div></PanelSectionRow>}
        <PanelSectionRow><ButtonItem layout="below" disabled={locked || !update.installable} onClick={() => void perform(async () => {
          const candidate = await prepareUpdate(); await requestInstall(candidate); setMessage('Confirma la actualización en el instalador de Decky. El plugin se recargará.');
        })}>Actualizar a {update.version}</ButtonItem></PanelSectionRow>
      </>}
    </PanelSection>
    {job && job.status !== 'idle' && <PanelSection title={job.url ? 'Abre el vídeo en tu móvil' : 'Estado'}>
      <PanelSectionRow><div role="status">{job.message}{job.status === 'uploading' ? ` ${Math.floor(job.progress*100)}%` : ''}</div></PanelSectionRow>
      {job.status === 'uploading' && <PanelSectionRow><progress aria-label="Progreso de subida" max={1} value={job.progress} style={{width:'100%',height:14}}/></PanelSectionRow>}
      {job.can_retry && <PanelSectionRow><ButtonItem layout="below" disabled={locked} onClick={async () => {
        try {await retry(); setJob(await getStatus()); setMessage('');} catch(e) {setMessage(String(e));}
      }}>Reintentar subida del MP4</ButtonItem></PanelSectionRow>}
      {job.url && <>
        {qr && <PanelSectionRow><div style={{textAlign:'center'}}><img src={qr} width={224} height={224} alt="Escanea este QR para abrir el clip en Filebin" style={{maxWidth:'100%',height:'auto'}}/></div></PanelSectionRow>}
        <PanelSectionRow><ButtonItem layout="below" onClick={async () => {
          try {await copyLink(job.url); setShareMessage('Enlace copiado. Ya puedes pegarlo donde quieras.');}
          catch(e) {setShareMessage(String(e));}
        }}>Copiar enlace</ButtonItem></PanelSectionRow>
        <PanelSectionRow><div style={{overflowWrap:'anywhere',userSelect:'text'}}>{job.url}<br/>Caduca: {expiryText}</div></PanelSectionRow>
        <PanelSectionRow><div>Desde el móvil puedes compartirlo por WhatsApp, Telegram o correo. Cualquiera con el enlace puede acceder al vídeo y borrarlo.</div></PanelSectionRow>
      </>}
      {shareMessage && <PanelSectionRow><div role="status">{shareMessage}</div></PanelSectionRow>}
      {job.status === 'uploading' && <PanelSectionRow><ButtonItem layout="below" onClick={() => void cancel().catch(e => setMessage(String(e)))}>Cancelar subida</ButtonItem></PanelSectionRow>}
    </PanelSection>}
  </>;
}
export default definePlugin(() => ({name:'DeckClip',titleView:<div className={staticClasses.Title}>DeckClip</div>,content:<Content/>,icon:<FaVideo/>}));
