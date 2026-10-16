import fs from 'node:fs';
import path from 'node:path';

export interface Track {
  title: string;
  artist: string;
  src: string;
  cover: string;
}

// 解析 ID3v2 文本帧（TIT2 歌名 / TPE1 歌手），失败返回空对象
function readId3(file: string): { title?: string; artist?: string } {
  try {
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(10);
    fs.readSync(fd, head, 0, 10, 0);
    if (head.toString('latin1', 0, 3) !== 'ID3') {
      fs.closeSync(fd);
      return {};
    }
    const ver = head[3];
    const tagSize =
      ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
    const buf = Buffer.alloc(tagSize);
    fs.readSync(fd, buf, 0, tagSize, 10);
    fs.closeSync(fd);

    const decode = (frame: Buffer): string => {
      const enc = frame[0];
      const body = frame.subarray(1);
      let s: string;
      if (enc === 3) s = body.toString('utf8');
      else if (enc === 1) s = body.toString('utf16le');
      else if (enc === 2) s = body.toString('utf16be');
      else s = body.toString('latin1');
      return s.replace(/^﻿/, '').replace(/\0+$/g, '').trim();
    };

    const out: { title?: string; artist?: string } = {};
    let off = 0;
    while (off + 10 <= buf.length) {
      const id = buf.toString('latin1', off, off + 4);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const size =
        ver >= 4
          ? ((buf[off + 4] & 0x7f) << 21) |
            ((buf[off + 5] & 0x7f) << 14) |
            ((buf[off + 6] & 0x7f) << 7) |
            (buf[off + 7] & 0x7f)
          : buf.readUInt32BE(off + 4);
      if (size <= 0 || off + 10 + size > buf.length) break;
      if (id === 'TIT2') out.title = decode(buf.subarray(off + 10, off + 10 + size));
      if (id === 'TPE1') out.artist = decode(buf.subarray(off + 10, off + 10 + size));
      off += 10 + size;
    }
    return out;
  } catch {
    return {};
  }
}

// 构建时扫描 public/music：丢 mp3 进去即自动进歌单；封面与 mp3 同名，缺省用默认唱片图
export function getTracks(): Track[] {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  let files: string[] = [];
  try {
    files = fs.readdirSync(musicDir);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.toLowerCase().endsWith('.mp3'))
    .sort()
    .map((f) => {
      const base = f.replace(/\.mp3$/i, '');
      const id3 = readId3(path.join(musicDir, f));
      const coverFile = files.find(
        (c) => exts.has(path.extname(c).toLowerCase()) && c.replace(/\.[^.]+$/, '') === base
      );
      return {
        title: id3.title || base,
        artist: id3.artist || '未知艺术家',
        src: `/music/${encodeURIComponent(f)}`,
        cover: coverFile ? `/music/${encodeURIComponent(coverFile)}` : '/music/covers/default.jpg',
      };
    });
}
