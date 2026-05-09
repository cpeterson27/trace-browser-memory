import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let c = n;

  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  crcTable[n] = c >>> 0;
}

const crc32 = (buffer) => {
  let c = 0xffffffff;

  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([length, typeBuffer, data, crc]);
};

const writePng = (filePath, width, height, drawPixel) => {
  mkdirSync(dirname(filePath), { recursive: true });

  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = clamp(r);
      raw[offset + 1] = clamp(g);
      raw[offset + 2] = clamp(b);
      raw[offset + 3] = clamp(a);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  writeFileSync(filePath, png);
};

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

const mix = (a, b, t) => a + (b - a) * t;

const pointInPolygon = (x, y, polygon) => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

const signedDistanceToSegment = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  const dx = px - (ax + c * vx);
  const dy = py - (ay + c * vy);

  return Math.hypot(dx, dy);
};

const polygonAlpha = (x, y, polygon, edge = 1.1) => {
  const inside = pointInPolygon(x, y, polygon);
  let distance = Infinity;

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    distance = Math.min(
      distance,
      signedDistanceToSegment(x, y, current[0], current[1], next[0], next[1])
    );
  }

  if (inside) return distance < edge ? mix(0.55, 1, distance / edge) : 1;

  return distance < edge ? mix(0.55, 0, distance / edge) : 0;
};

const traceBolt = [
  [25.9, 44.9],
  [23.9, 34.1],
  [21.9, 31.7],
  [9.7, 31.7],
  [9.2, 29.9],
  [16.8, 19.4],
  [15, 15.8],
  [1.2, 15.8],
  [0.3, 14],
  [10, 0.5],
  [39.8, 0.5],
  [40.6, 1.8],
  [33.2, 12.3],
  [35.1, 15.8],
  [46.5, 15.8],
  [47.4, 17.7],
];

const drawIcon = (size) => {
  writePng(`public/icons/icon-${size}.png`, size, size, (x, y, width, height) => {
    const scale = size / 128;
    const px = x / scale;
    const py = y / scale;
    const tileLeft = 16;
    const tileTop = 16;
    const tileSize = 96;
    const inTile = roundedRectAlpha(px, py, tileLeft, tileTop, tileSize, tileSize, 22);

    if (!inTile) return [0, 0, 0, 0];

    const t = (px / 128) * 0.45 + (py / 128) * 0.55;
    let color = [mix(8, 19, t), mix(13, 26, t), mix(31, 54, t), 255];
    const purpleGlow = Math.max(0, 1 - Math.hypot(px - 30, py - 26) / 80);
    const blueGlow = Math.max(0, 1 - Math.hypot(px - 100, py - 106) / 86);
    color = paint(color, [124, 58, 237], purpleGlow * 0.44);
    color = paint(color, [14, 165, 233], blueGlow * 0.34);

    const tabBack = roundedRectAlpha(px, py, 36, 30, 52, 44, 8);
    const tabMid = roundedRectAlpha(px, py, 31, 40, 62, 48, 9);
    const tabFront = roundedRectAlpha(px, py, 26, 52, 72, 48, 10);

    if (tabBack) color = paint(color, [71, 85, 105], 0.94);
    if (tabMid) color = paint(color, [109, 40, 217], 0.96);
    if (tabFront) color = paint(color, [248, 250, 252], 0.98);

    if (roundedRectAlpha(px, py, 34, 62, 25, 5, 2.5)) {
      color = paint(color, [15, 23, 42], 0.78);
    }

    if (roundedRectAlpha(px, py, 34, 75, 45, 5, 2.5)) {
      color = paint(color, [100, 116, 139], 0.74);
    }

    if (roundedRectAlpha(px, py, 34, 87, 34, 5, 2.5)) {
      color = paint(color, [100, 116, 139], 0.64);
    }

    const mark = traceBolt.map(([bx, by]) => [73 + bx * 0.55, 58 + by * 0.55]);
    const markAlpha = polygonAlpha(px + 0.5, py + 0.5, mark, 1);
    if (markAlpha > 0) {
      color = paint(color, [139, 92, 246], markAlpha);
      color = paint(color, [14, 165, 233], markAlpha * Math.max(0, (py - 76) / 26));
    }

    const ringDistance = Math.abs(Math.hypot(px - 88, py - 82) - 24);
    if (ringDistance < 2.2 && px > 62 && py > 56) {
      color = paint(color, [199, 210, 254], 0.55 * (1 - ringDistance / 2.2));
    }

    return color;
  });
};

const roundedRectAlpha = (x, y, left, top, width, height, radius) => {
  const right = left + width;
  const bottom = top + height;
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const distance = Math.hypot(x - cx, y - cy);

  return x >= left && x <= right && y >= top && y <= bottom && distance <= radius;
};

const paint = (base, color, alpha) => [
  mix(base[0], color[0], alpha),
  mix(base[1], color[1], alpha),
  mix(base[2], color[2], alpha),
  255,
];

const drawPromo = () => {
  const bolt = traceBolt.map(([x, y]) => [40 + x * 1.95, 38 + y * 1.95]);

  writePng("store-assets/promotional-tile-440x280.png", 440, 280, (x, y) => {
    const t = (x / 440) * 0.45 + (y / 280) * 0.55;
    let color = [mix(5, 15, t), mix(8, 23, t), mix(22, 42, t), 255];
    const purpleGlow = Math.max(0, 1 - Math.hypot(x - 54, y - 32) / 130);
    const blueGlow = Math.max(0, 1 - Math.hypot(x - 396, y - 254) / 140);

    color = paint(color, [124, 58, 237], purpleGlow * 0.18);
    color = paint(color, [2, 132, 199], blueGlow * 0.14);

    const boltAlpha = polygonAlpha(x + 0.5, y + 0.5, bolt, 1.2);
    if (boltAlpha > 0) {
      color = paint(color, [139, 92, 246], boltAlpha);
      color = paint(color, [71, 191, 255], boltAlpha * Math.max(0, (y - 70) / 80));
    }

    if (roundedRectAlpha(x, y, 178, 52, 220, 166, 8)) {
      color = paint(color, [15, 23, 42], 0.94);
    }

    const lightBars = [
      [196, 70, 118, 14, 7, [248, 250, 252]],
      [196, 94, 166, 9, 5, [148, 163, 184]],
      [210, 136, 90, 7, 4, [167, 139, 250]],
      [210, 180, 112, 7, 4, [226, 232, 240]],
    ];

    for (const [left, top, width, height, radius, fill] of lightBars) {
      if (roundedRectAlpha(x, y, left, top, width, height, radius)) {
        color = paint(color, fill, 0.95);
      }
    }

    const cards = [
      [196, 124, 184, 35],
      [196, 165, 184, 29],
    ];

    for (const [left, top, width, height] of cards) {
      if (roundedRectAlpha(x, y, left, top, width, height, 8)) {
        color = paint(color, [30, 41, 59], 0.92);
      }
    }

    return color;
  });
};

const drawStoreScreenshot = () => {
  writePng("store-assets/screenshot-1280x800.png", 1280, 800, (x, y) => {
    const t = (x / 1280) * 0.5 + (y / 800) * 0.5;
    let color = [mix(4, 15, t), mix(8, 23, t), mix(22, 42, t), 255];
    const purpleGlow = Math.max(0, 1 - Math.hypot(x - 290, y - 140) / 440);
    const blueGlow = Math.max(0, 1 - Math.hypot(x - 1080, y - 690) / 520);
    color = paint(color, [124, 58, 237], purpleGlow * 0.2);
    color = paint(color, [2, 132, 199], blueGlow * 0.16);

    if (roundedRectAlpha(x, y, 450, 66, 380, 668, 18)) {
      color = paint(color, [2, 6, 23], 0.97);
    }

    const bolt = traceBolt.map(([px, py]) => [482 + px * 0.8, 98 + py * 0.8]);
    const boltAlpha = polygonAlpha(x + 0.5, y + 0.5, bolt, 1);
    if (boltAlpha > 0) color = paint(color, [139, 92, 246], boltAlpha);

    const elements = [
      [536, 104, 92, 10, 5, [167, 139, 250]],
      [536, 123, 162, 28, 6, [248, 250, 252]],
      [704, 114, 74, 28, 14, [139, 92, 246]],
      [480, 188, 320, 48, 14, [139, 92, 246]],
      [532, 250, 216, 9, 4, [148, 163, 184]],
      [480, 278, 320, 42, 14, [15, 23, 42]],
      [480, 334, 90, 31, 15, [30, 41, 59]],
      [582, 334, 86, 31, 15, [76, 29, 149]],
      [680, 334, 74, 31, 15, [30, 41, 59]],
      [480, 388, 320, 116, 16, [15, 23, 42]],
      [504, 412, 188, 15, 7, [248, 250, 252]],
      [504, 438, 246, 9, 4, [148, 163, 184]],
      [504, 462, 78, 25, 12, [76, 29, 149]],
      [480, 518, 320, 118, 16, [15, 23, 42]],
      [504, 542, 212, 15, 7, [248, 250, 252]],
      [504, 568, 224, 9, 4, [148, 163, 184]],
      [504, 592, 62, 25, 12, [30, 41, 59]],
      [580, 592, 68, 25, 12, [30, 41, 59]],
    ];

    for (const [left, top, width, height, radius, fill] of elements) {
      if (roundedRectAlpha(x, y, left, top, width, height, radius)) {
        color = paint(color, fill, 0.95);
      }
    }

    return color;
  });
};

const drawMarquee = () => {
  writePng("store-assets/marquee-1400x560.png", 1400, 560, (x, y) => {
    const t = (x / 1400) * 0.45 + (y / 560) * 0.55;
    let color = [mix(5, 15, t), mix(8, 23, t), mix(22, 42, t), 255];
    const purpleGlow = Math.max(0, 1 - Math.hypot(x - 180, y - 120) / 450);
    const blueGlow = Math.max(0, 1 - Math.hypot(x - 1240, y - 480) / 540);
    color = paint(color, [124, 58, 237], purpleGlow * 0.2);
    color = paint(color, [2, 132, 199], blueGlow * 0.16);

    const bolt = traceBolt.map(([px, py]) => [110 + px * 4.2, 84 + py * 4.2]);
    const boltAlpha = polygonAlpha(x + 0.5, y + 0.5, bolt, 1.4);
    if (boltAlpha > 0) {
      color = paint(color, [139, 92, 246], boltAlpha);
      color = paint(color, [71, 191, 255], boltAlpha * Math.max(0, (y - 210) / 160));
    }

    if (roundedRectAlpha(x, y, 650, 72, 540, 416, 10)) {
      color = paint(color, [15, 23, 42], 0.94);
    }

    const elements = [
      [692, 120, 230, 28, 14, [248, 250, 252]],
      [692, 168, 356, 16, 8, [148, 163, 184]],
      [692, 226, 424, 72, 8, [30, 41, 59]],
      [730, 250, 202, 15, 7, [226, 232, 240]],
      [730, 276, 296, 10, 5, [100, 116, 139]],
      [692, 326, 424, 72, 8, [23, 31, 49]],
      [730, 352, 246, 14, 7, [167, 139, 250]],
      [730, 378, 250, 10, 5, [100, 116, 139]],
    ];

    for (const [left, top, width, height, radius, fill] of elements) {
      if (roundedRectAlpha(x, y, left, top, width, height, radius)) {
        color = paint(color, fill, 0.95);
      }
    }

    return color;
  });
};

[16, 32, 48, 128].forEach(drawIcon);
drawPromo();
drawStoreScreenshot();
drawMarquee();
