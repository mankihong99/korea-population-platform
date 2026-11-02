import { mkdir, writeFile } from 'node:fs/promises';
import paths from '../src/data/province-paths.json' with {type:'json'};
const directory = new URL('../data-source/projection/', import.meta.url);
await mkdir(directory, {recursive:true});
const indicators = {total:[3737,5232],older:[3742,5265],young:[3743,5250]};
const tasks = ['00',...paths.map(p=>p.code)].flatMap(code=>Object.entries(indicators).map(([kind,ids])=>({code,kind,ids})));
const manifest = [];
let position = 0;
async function worker() {
  while (position < tasks.length) {
    const {code,kind,ids} = tasks[position++];
    const url = `https://kosis.kr/visual/populationKorea/PopulationDashBoardDetail.do?listId=A_02&statJipyoId=${ids[0]}&vStatJipyoId=${ids[1]}&areaId=${code==='00'?'':code==='29'?'27':code}`;
    const response = await fetch(url,{signal:AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error(`Download failed: ${code}/${kind}`);
    const body = await response.text();
    if (!body.includes('var prdDe')) throw new Error(`Unexpected page: ${code}/${kind}`);
    const file = `${code}-${kind}.html`;
    await writeFile(new URL(file,directory),body);
    manifest.push({code,kind,file,url,retrievedAt:new Date().toISOString()});
    console.log(`Saved ${code}/${kind}`);
  }
}
await Promise.all([worker(),worker(),worker()]);
await writeFile(new URL('manifest.json',directory),JSON.stringify(manifest,null,2)+'\n');
await mkdir(new URL('long-range/',directory),{recursive:true});
const longRangeManifest=[];
for(const [seq,name] of [['855','19020905.xlsx'],['851','19020901.xlsx']]){
  const url=`https://kosis.kr/upsHtml/online/downSrvcFile.do?PUBCODE=PJ&SEQ=${seq}&FILE_NAME=${name}`;
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Long-range download failed: ${name}`);
  const body=Buffer.from(await response.arrayBuffer());
  if(body.readUInt32LE(0)!==0x04034b50)throw new Error(`Expected XLSX: ${name}`);
  await writeFile(new URL('long-range/'+name,directory),body);
  longRangeManifest.push({file:name,url,retrievedAt:new Date().toISOString()});
}
await writeFile(new URL('long-range/manifest.json',directory),JSON.stringify(longRangeManifest,null,2)+'\n');
