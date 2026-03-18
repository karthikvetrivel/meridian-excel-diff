export function colToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function indexToCol(index: number): string {
  let col = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
}

const CELL_ADDR_RE = /^([A-Z]+)(\d+)$/i;

export function parseAddress(addr: string): { col: number; row: number } {
  const match = addr.match(CELL_ADDR_RE);
  if (!match) throw new Error(`Invalid cell address: ${addr}`);
  return {
    col: colToIndex(match[1]),
    row: parseInt(match[2], 10),
  };
}
