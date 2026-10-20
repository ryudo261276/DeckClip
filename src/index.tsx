import { Button, ButtonItem, PanelSection, PanelSectionRow, staticClasses } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';
import { useEffect, useState } from 'react';
import { FaVideo } from 'react-icons/fa';
import { clips, exportNative, Clip } from './native';
import { copyLink, qrImage } from './share';

type Status = {status:string; progress:number; message:string; url:string; expires:string; can_retry?:boolean};
const prepare = callable<[string], string>('prepare_native_export');
const upload = callable<[string], boolean>('start_upload');
const getStatus = callable<[], Status>('upload_status');
const retry = callable<[], boolean>('retry_upload');
const cancel = callable<[], boolean>('cancel_upload');

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
  useEffect(() => {
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
  const pages = Math.max(1, Math.ceil(rows.length/3));
  const visible = rows.slice(page*3,page*3+3);
  const locked = busy || job?.status === 'uploading';
  const expires = job?.expires ? new Date(job.expires) : undefined;
  const expiryText = expires && !Number.isNaN(expires.getTime()) ? expires.toLocaleString() : job?.expires;
  return <>
    <PanelSection title="Compartir clip · sin cuentas">
      <PanelSectionRow><div>Elige un clip. Steam lo exporta a MP4 y DeckClip lo sube a Filebin. Después escanea el QR o copia el enlace.</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={locked} onClick={() => void refresh()}>Actualizar clips</ButtonItem></PanelSectionRow>
      {!rows.length && !busy && <PanelSectionRow><div>No hay clips guardados. Guarda primero un clip desde Medios de Steam.</div></PanelSectionRow>}
      {visible.map(item => <ClipCard key={item.clip_id} item={item} selected={item.clip_id === clip} disabled={locked} onSelect={() => setClip(item.clip_id)}/>)}
      {pages > 1 && <PanelSectionRow><div style={{display:'flex',gap:6,alignItems:'center',width:'100%'}}>
        <Button disabled={locked || page===0} onClick={() => setPage(page-1)} style={{flex:1,minWidth:0,padding:6}}>Anterior</Button>
        <span style={{fontSize:11,whiteSpace:'nowrap'}}>{page+1}/{pages}</span>
        <Button disabled={locked || page+1>=pages} onClick={() => setPage(page+1)} style={{flex:1,minWidth:0,padding:6}}>Siguiente</Button>
      </div></PanelSectionRow>}
      <PanelSectionRow><ButtonItem layout="below" disabled={locked || !clip} onClick={async () => {
        setBusy(true); setMessage('Steam está exportando el clip…');
        try {
          const path = await prepare(clip); await exportNative(clip, path);
          setMessage('MP4 listo. Iniciando subida…');
          await upload(path); setJob(await getStatus()); setMessage('');
        } catch(e) {setMessage(String(e));} finally {setBusy(false);}
      }}>Subir y obtener enlace</ButtonItem></PanelSectionRow>
      {message && <PanelSectionRow><div role="status">{message}</div></PanelSectionRow>}
      {busy && <PanelSectionRow><progress aria-label="Preparando clip" style={{width:'100%',height:12}}/></PanelSectionRow>}
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
