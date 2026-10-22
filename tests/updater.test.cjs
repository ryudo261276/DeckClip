const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/updater.ts');
const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=module.paths;
compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
const {requestInstall}=compiled.exports;
const update={current:'0.7.0',version:'0.8.0',available:true,installable:true,sha256:'a'.repeat(64),url:'https://github.com/ryudo261276/DeckClip/releases/download/v0.8.0/DeckClip-0.8.0.zip'};
test('update uses Decky official install prompt and checksum',async()=>{
  let args;globalThis.window={DeckyBackend:{call:async(...items)=>{args=items;}}};
  await requestInstall(update);
  assert.deepEqual(args,['utilities/install_plugin',update.url,'DeckClip','0.8.0',update.sha256,2]);
});
test('foreign installer URL rejected before Decky call',async()=>{
  globalThis.window={DeckyBackend:{call:async()=>{throw Error('Should not call');}}};
  await assert.rejects(requestInstall({...update,url:'https://evil.example/file.zip'}),/válido/);
});
test('missing Decky installer produces actionable error',async()=>{
  globalThis.window={};await assert.rejects(requestInstall(update),/instalador/);
});
