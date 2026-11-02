import { readProjectionWorkbook } from './read-projection-workbook.mjs';

const names={'00':'전국','11':'서울','21':'부산','22':'대구','23':'인천','24':'광주','25':'대전','26':'울산','29':'세종','31':'경기','32':'강원','33':'충북','34':'충남','35':'전북','36':'전남','37':'경북','38':'경남','39':'제주'};
export function extendProjections(national,regions,file,years){
  const rows=readProjectionWorkbook(file);
  const columns=Object.entries(rows[2]).filter(([,v])=>Number.isInteger(v)&&v>=2052&&years.includes(v));
  if(columns.length!==years.filter(y=>y>=2052).length)throw new Error('Missing long-range years');
  for(const region of [national,...regions]){
    const records=rows.filter(r=>r.A===names[region.code]);
    const get=(sex,age,col)=>{
      const matches=records.filter(r=>r.B===sex&&r.C===age);
      const value=matches[0]?.[col];
      if(matches.length!==1||!Number.isSafeInteger(value)||value<0)throw new Error(`Invalid long-range count ${region.code}/${sex}/${age}/${col}`);
      return value;
    };
    for(const [col,year] of columns){
      const total=get('전체','합계',col),male=get('남자','합계',col),female=get('여자','합계',col);
      let young=0,working=0,older=0;
      for(let age=0;age<=100;age+=5){
        const label=age===100?'100+':`${age}-${age+4}`,n=get('전체',label,col);
        if(n!==get('남자',label,col)+get('여자',label,col))throw new Error('Age/sex sum mismatch');
        if(age<15)young+=n;else if(age<65)working+=n;else older+=n;
      }
      const value={total,male,female,young,working,older};
      if(total!==male+female||total!==young+working+older)throw new Error('Long-range component mismatch');
      if(region.values[year]){
        for(const key of Object.keys(value))if(value[key]!==region.values[year][key])throw new Error(`Overlap mismatch ${region.code}/${year}/${key}`);
      }else region.values[year]=value;
    }
  }
}
