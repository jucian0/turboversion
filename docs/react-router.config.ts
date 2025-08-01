import type { Config } from '@react-router/dev/config';
import { source } from './app/source';

export default {
  ssr: true,
  async prerender() {
    return [...source.getPages().map((page) => page.url)];
  },
} satisfies Config;
