const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {PNG}=require('pngjs');
const jsQR=require('jsqr');
const filename=path.resolve(__dirname,'../src/share.ts');
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=module.paths;compiled._compile(code,filename);
const {qrImage,copyLink}=compiled.exports;

const link='https://filebin.net/1234567890abcdef1234567890abcdef';
test('QR decodes to the exact download link with an independent decoder',async()=>{
  const data=await qrImage(link);
  assert.ok(data.startsWith('data:image/png;base64,'));
  const png=PNG.sync.read(Buffer.from(data.split(',')[1],'base64'));
  assert.equal(png.width,224);assert.equal(png.height,224);
  const result=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
  assert.equal(result.data,link);
});
test('copy uses the clipboard API with the exact link',async()=>{
  let copied;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>{copied=value;}}}});
  await copyLink(link);assert.equal(copied,link);
});
test('denied clipboard falls back to Steam compatible copy and restores focus',async()=>{
  const events=[];
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw Error('denied');}}}});
  const field={style:{},setAttribute(){},focus(){events.push('focus');},select(){events.push('select');},remove(){events.push('remove');}};
  globalThis.document={activeElement:{focus(){events.push('restore');}},createElement(){return field;},body:{appendChild(){}},execCommand(cmd){events.push(cmd);return true;}};
  await copyLink(link);
  assert.equal(field.value,link);
  assert.deepEqual(events,['focus','select','copy','remove','restore']);
});
test('failed copying reports failure rather than claiming success',async()=>{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
  const field={style:{},setAttribute(){},focus(){},select(){},remove(){}};
  globalThis.document={activeElement:null,createElement(){return field;},body:{appendChild(){}},execCommand(){return false;}};
  await assert.rejects(copyLink(link),/portapapeles/);
});
