import { inflateRawSync } from 'node:zlib';

// Minimal zip reader: Docs' html export is a zip with one html file inside.
export function zipEntries(buf) {
  const sig = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 65558; i--) {
    if (buf.readUInt32LE(i) === sig) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('zip: end of central directory not found');

  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const out = [];

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');
    offset += 46 + nameLen + extraLen + commentLen;

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(start, start + compSize);
    const data = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    out.push({ name, data });
  }

  return out;
}

export function zipText(buf, match = /\.html?$/i) {
  const entry = zipEntries(buf).find((e) => match.test(e.name));
  if (!entry) throw new Error('zip: no matching entry');
  return entry.data.toString('utf8');
}
