const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function load(clips,store,remove){
  const api={GetClips:async()=>({GetEResult:()=>1,Body:()=>({toObject:()=>({clip:clips})})}),ExportClip(){},DeleteClip:remove};
  const filename=path.resolve(__dirname,'../src/native.ts');
  const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=module.paths;
  compiled.require=name=>name==='@decky/ui'?{findModuleExport:filter=>[api,store].find(filter)}:require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
  return compiled.exports;
}
test('Steam thumbnail and game name survive listing; newest clip first',async()=>{
  const api=load([{clip_id:'old',game_id:'123',date_recorded:1},{clip_id:'new',game_id:'123',date_recorded:2,thumbnail_url:'https://steamloopback.host/thumbnail.jpg'}],{GetAppOverviewByGameID:()=>({display_name:'Mi juego'})});
  const rows=await api.clips();assert.equal(rows[0].clip_id,'new');assert.equal(rows[0].game_name,'Mi juego');assert.equal(rows[0].thumbnail_url,'https://steamloopback.host/thumbnail.jpg');
});
test('missing Steam app store preserves selectable clips and game ID',async()=>{
  const rows=await load([{clip_id:'one',game_id:'123'}]).clips();
  assert.equal(rows[0].game_name,'Juego 123');assert.equal(rows[0].clip_id,'one');
});
test('broken name lookup does not block clip selection',async()=>{
  const rows=await load([{clip_id:'one'}],{GetAppOverviewByGameID:()=>{throw Error('changed API');}}).clips();
  assert.equal(rows[0].game_name,'Juego desconocido');
});

test('delete clip sends only the selected Steam ID',async()=>{
  let request;
  const api=load([],undefined,async args=>{request=args;return {GetEResult:()=>1};});
  await api.deleteClip('clip-123');assert.deepEqual(request,{clip_id:'clip-123'});
});
test('Steam delete error is reported',async()=>{
  const api=load([],undefined,async()=>({GetEResult:()=>2}));
  await assert.rejects(api.deleteClip('clip-123'),/borrar/);
});
