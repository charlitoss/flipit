import { isIP } from "node:net";

// Address ranges a user-supplied URL must never reach. We check the RESOLVED
// address rather than the hostname string, which kills every literal-encoding
// trick for free (2130706433, 0177.0.0.1, 127.1, localtest.me, *.nip.io …).

function v4ToInt(a: string): number | null {
  const p = a.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const s of p) {
    if (!/^\d{1,3}$/.test(s)) return null;
    const b = Number(s);
    if (b > 255) return null;
    n = ((n << 8) | b) >>> 0;
  }
  return n;
}

// [base, prefix bits]
const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // CGNAT (also Alibaba metadata 100.100.100.200)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — AWS/GCP/Azure metadata, ECS 169.254.170.2
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + 255.255.255.255 broadcast
];

function isBlockedV4(addr: string): boolean {
  const ip = v4ToInt(addr);
  if (ip === null) return true; // unparseable → fail closed
  return V4_BLOCKS.some(([base, bits]) => {
    const b = v4ToInt(base)!;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) === (b & mask);
  });
}

function v6ToBytes(addr: string): Uint8Array | null {
  const s = addr.split("%")[0]; // strip zone id (fe80::1%eth0)
  const halves = s.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (part: string): number[] | null => {
    if (!part) return [];
    const out: number[] = [];
    for (const g of part.split(":")) {
      if (g.includes(".")) {
        // trailing dotted-quad form, e.g. ::ffff:127.0.0.1
        const n = v4ToInt(g);
        if (n === null) return null;
        out.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
        const n = parseInt(g, 16);
        out.push((n >> 8) & 0xff, n & 0xff);
      }
    }
    return out;
  };

  const head = parseGroups(halves[0]);
  if (head === null) return null;
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (tail === null) return null;

  const gap = 16 - head.length - tail.length;
  if (halves.length === 2 ? gap < 0 : gap !== 0) return null;
  return new Uint8Array([...head, ...new Array(Math.max(0, gap)).fill(0), ...tail]);
}

function isBlockedV6(addr: string): boolean {
  const b = v6ToBytes(addr);
  if (!b || b.length !== 16) return true;
  const zeros = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  const dotted = () => `${b[12]}.${b[13]}.${b[14]}.${b[15]}`;

  // Unwrap embedded IPv4 FIRST, or ::ffff:127.0.0.1 walks straight through.
  if (zeros(0, 10) && b[10] === 0xff && b[11] === 0xff) return isBlockedV4(dotted()); // v4-mapped
  if (zeros(0, 12)) return true; // ::, ::1, ::a.b.c.d
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) {
    return isBlockedV4(dotted()); // 64:ff9b::/96 NAT64
  }

  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // ff00::/8 multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // 2001:db8::/32
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true; // Teredo
  if (b[0] === 0x20 && b[1] === 0x02) return true; // 2002::/16 6to4
  if (b[0] === 0x01 && b[1] === 0x00 && zeros(2, 8)) return true; // 100::/64 discard-only
  return false;
}

/** Fail-closed: anything that isn't a parseable public unicast address is blocked. */
export function isBlockedAddress(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) return isBlockedV4(addr);
  if (v === 6) return isBlockedV6(addr);
  return true;
}
