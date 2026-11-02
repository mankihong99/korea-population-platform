import fs from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';

// Read only the XML entries needed from the archived KOSIS XLSX (ZIP).
export function readProjectionWorkbook(file) {
  const zip=fs.readFileSync(file), entries=new Map();
  let end=zip.length-22;
  while(end>=Math.max(0,zip.length-65557)&&zip.readUInt32LE(end)!==0x06054b50)end--;
  if(end<0)throw new Error('Invalid XLSX ZIP directory');
  let pos=zip.readUInt32LE(end+16);
  for(let i=0;i<zip.readUInt16LE(end+10);i++){
    if(zip.readUInt32LE(pos)!==0x02014b50)throw new Error('Invalid ZIP entry');
    const method=zip.readUInt16LE(pos+10), size=zip.readUInt32LE(pos+20), length=zip.readUInt16LE(pos+28);
    const name=zip.subarray(pos+46,pos+46+length).toString(), offset=zip.readUInt32LE(pos+42);
    entries.set(name,()=>{
      const start=offset+30+zip.readUInt16LE(offset+26)+zip.readUInt16LE(offset+28);
      const compressed=zip.subarray(start,start+size);
      if(method!==0&&method!==8)throw new Error('Unsupported ZIP compression');
      return (method===8?inflateRawSync(compressed):compressed).toString('utf8');
    });
    pos+=46+length+zip.readUInt16LE(pos+30)+zip.readUInt16LE(pos+32);
  }
  const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false});
  const xml=name=>parser.parse(entries.get(name)());
  const strings=xml('xl/sharedStrings.xml').sst.si.map(s=>typeof s.t==='object'?s.t['#text']:s.t);
  const sheet=xml('xl/workbook.xml').workbook.sheets.sheet[0];
  if(sheet['@_name']!=='9.5중위'||sheet['@_r:id']!=='rId1')throw new Error('Unexpected scenario sheet');
  return xml('xl/worksheets/sheet1.xml').worksheet.sheetData.row.map(row=>Object.fromEntries(
    row.c.filter(c=>c.v!==undefined).map(c=>[c['@_r'].replace(/\d/g,''),c['@_t']==='s'?strings[Number(c.v)]:Number(c.v)])
  ));
}
