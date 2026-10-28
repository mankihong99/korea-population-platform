import regionCatalog from './policy-regions.json' with {type: 'json'};
const regionYear = Math.max(...regionCatalog.map(r => r.year));
const currentRegions = regionCatalog.filter(r => r.year === regionYear);
export const policySources = {
  gov24: { name: '정부24 공공서비스', url: 'https://www.gov.kr/portal/rcvfvrSvc/main/nonLogin' },
  youth: { name: '온통청년', url: 'https://www.youthcenter.go.kr/' },
  welfare: { name: '지자체 복지서비스', url: 'https://www.bokjiro.go.kr/' },
  greendaero: { name: '그린대로 귀농귀촌', url: 'https://www.greendaero.go.kr/' },
};
export function safeUrl(value) {
  try { const u = new URL(String(value).replace(/&amp;/g, '&')); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && !/servicekey|apikey/i.test(u.search) ? u.href : ''; } catch { return ''; }
}
export function provinceName(value = '') {
  const aliases = { 서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도' };
  return aliases[value] || ({ 강원도: aliases.강원, 전라북도: aliases.전북, 제주도: aliases.제주 })[value] || value;
}
export function regionMatches(policy, area) {
  const c = policy.coverage;
  if (c.type === 'national') return true;
  if (!area || c.type === 'unknown') return false;
  const [province, ...district] = area.split(' ');
  if (Array.isArray(c.mapCodes)) {
    const full = [provinceName(province), ...district].join(' ');
    return currentRegions.some(r => {
      const [p, ...d] = r.name.split(' ');
      const name = [provinceName(p), ...d].join(' ');
      return (name === full || name.startsWith(full + ' ')) && c.mapCodes.includes(r.mapCode);
    });
  }
  if (provinceName(province) !== provinceName(c.province)) return false;
  return !c.district || !district.length || district.join(' ') === c.district || district.join(' ').startsWith(c.district + ' ');
}
export function categories(text) {
  const rules = { 청년: /청년|청소년/, 귀농귀촌: /귀농|귀촌|농업/, 주거: /주거|주택|임차|월세|전세/, '출산·육아': /출산|육아|보육|아동/, '이주·정착': /전입|이주|정착/ };
  const tags = Object.entries(rules).filter(([, re]) => re.test(text)).map(([tag]) => tag);
  return tags.length ? tags : ['기타'];
}

export function settlementPolicies(items, area) {
  return items.filter(item => regionMatches(item, area) && item.categories.some(tag => tag !== '기타'));
}
