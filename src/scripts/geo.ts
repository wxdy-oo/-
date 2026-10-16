/**
 * 客户端地理信息：通过 IP 定位获取经纬度、IP 与中文城市名。
 * 结果在页面内缓存，多个组件共用同一次请求。
 */

export interface GeoInfo {
  ip: string;
  lat: number;
  lng: number;
  city: string;
  region: string;
  source: string;
}

let cached: Promise<GeoInfo> | null = null;

async function fetchJson(url: string, timeout = 4500): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function viaIpwho(): Promise<GeoInfo> {
  const d = await fetchJson('https://ipwho.is/');
  if (!d || d.success === false || typeof d.latitude !== 'number') throw new Error('ipwho failed');
  return { ip: d.ip, lat: d.latitude, lng: d.longitude, city: d.city || '', region: d.region || '', source: 'ipwho.is' };
}

async function viaIpsb(): Promise<GeoInfo> {
  const d = await fetchJson('https://api.ip.sb/geoip');
  if (!d || typeof d.latitude !== 'number') throw new Error('ip.sb failed');
  return {
    ip: d.ip,
    lat: d.latitude,
    lng: d.longitude,
    city: d.city || '',
    region: d.region || d.country || '',
    source: 'ip.sb',
  };
}

const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

/**
 * 取中文城市名：优先反向地理编码，失败时把英文城市名本地化。
 * 都失败则退回传入的名称。
 */
async function chineseCity(lat: number, lng: number, fallback: string): Promise<string> {
  try {
    const d = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh`,
      9000
    );
    const name = d.city || d.locality || '';
    if (name && isChinese(name)) return name;
  } catch {
    /* 继续尝试下一种方式 */
  }

  if (fallback && !isChinese(fallback)) {
    try {
      const d = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(fallback)}&count=1&language=zh`,
        6000
      );
      const name = d?.results?.[0]?.name;
      if (name) return name;
    } catch {
      /* 本地化失败则保留英文名 */
    }
  }

  return fallback || '';
}

/** 供天气卡「精确度」按钮使用 */
export async function reverseCity(lat: number, lng: number): Promise<{ city: string }> {
  return { city: await chineseCity(lat, lng, '') };
}

async function resolve(): Promise<GeoInfo> {
  let geo: GeoInfo | null = null;

  for (const provider of [viaIpwho, viaIpsb]) {
    try {
      geo = await provider();
      break;
    } catch {
      /* 依次降级尝试下一个服务 */
    }
  }

  if (!geo) {
    geo = { ip: '未知', lat: 39.9042, lng: 116.4074, city: '北京市', region: '北京市', source: 'fallback' };
  }

  geo.city = await chineseCity(geo.lat, geo.lng, geo.city);
  return geo;
}

export function getGeo(): Promise<GeoInfo> {
  if (!cached) cached = resolve();
  return cached;
}
