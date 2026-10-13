export const regions = [
  { name: '서울', x: 43, y: 23, base: 5525, now: 9331 },
  { name: '경기', x: 43, y: 32, base: 2949, now: 13700 },
  { name: '강원', x: 63, y: 26, base: 1865, now: 1520 },
  { name: '충북', x: 53, y: 43, base: 1453, now: 1595 },
  { name: '충남', x: 37, y: 45, base: 2900, now: 2135 },
  { name: '경북', x: 67, y: 48, base: 3190, now: 2530 },
  { name: '전북', x: 39, y: 60, base: 2500, now: 1740 },
  { name: '경남', x: 59, y: 66, base: 3120, now: 3230 },
  { name: '전남', x: 34, y: 72, base: 3250, now: 1790 },
  { name: '부산', x: 71, y: 69, base: 1880, now: 3260 },
  { name: '제주', x: 42, y: 91, base: 365, now: 675 }
];

const defaultPolicies = [
  { cat: '청년', title: '청년 지역정착 지원', desc: '지역 청년의 취업·창업 및 정착을 돕는 예시 정책입니다.' },
  { cat: '귀농귀촌', title: '귀농귀촌 정착 지원', desc: '농촌 이주자의 교육·정착을 지원하는 예시 정책입니다.' },
  { cat: '주거', title: '청년 주거 지원', desc: '임차비 및 주거 안정을 지원하는 예시 정책입니다.' },
  { cat: '출산·육아', title: '출산·육아 지원', desc: '출산 가정과 양육 가구를 위한 예시 정책입니다.' },
  { cat: '이주·정착', title: '전입 정착 지원', desc: '전입 가구의 지역 정착을 지원하는 예시 정책입니다.' }
];

export const policies = Object.fromEntries(
  regions.map((region) => [region.name, defaultPolicies.map((policy) => ({ ...policy }))])
);

export function pop(region, year) {
  const t = (year - 1970) / (2026 - 1970);
  return Math.round(region.base + (region.now - region.base) * t);
}
