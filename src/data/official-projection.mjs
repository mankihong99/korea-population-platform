import data from './official-projection.json' with {type:'json'};
export { data as projectionData };
export const projectionByCode=Object.fromEntries(data.regions.map(r=>[r.code,r]));
export function projectionValue(region,year){return data.years.includes(Number(year)) ? region?.values[year] || null : null;}
export function projectionChange(region,year){
  const base=projectionValue(region,data.baselineYear)?.total;
  const value=projectionValue(region,year)?.total;
  return base>0&&Number.isFinite(value)?(value/base-1)*100:null;
}
