import { BlockList, isIP } from "node:net";

const blocked4 = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked4.addSubnet(net, bits, "ipv4");

// IPv6 is allow-listed: only global unicast, minus the ranges that tunnel to other addresses.
const global6 = new BlockList();
global6.addSubnet("2000::", 3, "ipv6");
const blocked6 = new BlockList();
blocked6.addSubnet("2001::", 23, "ipv6");
blocked6.addSubnet("2001:db8::", 32, "ipv6");
blocked6.addSubnet("2002::", 16, "ipv6");

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked4.check(address, "ipv4");
  if (family === 6) return global6.check(address, "ipv6") && !blocked6.check(address, "ipv6");
  return false;
}
