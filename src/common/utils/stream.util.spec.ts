import { Readable } from 'node:stream';
import { streamToBuffer } from './stream.util';

describe('streamToBuffer', () => {
  it('menggabungkan chunk Buffer menjadi satu Buffer', async () => {
    const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
    const result = await streamToBuffer(stream);
    expect(result.toString('utf8')).toBe('hello world');
  });

  it('mengembalikan buffer kosong untuk stream kosong', async () => {
    const stream = Readable.from([]);
    const result = await streamToBuffer(stream);
    expect(result).toHaveLength(0);
  });
});
