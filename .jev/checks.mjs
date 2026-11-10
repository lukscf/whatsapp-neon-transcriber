// Checagens do Jev da extensão whatsapp-neon-transcriber. Guia: lukscf/tank4, ops/jev-kit/GUIA.md.
//   node .jev/jev.mjs list   ·   node .jev/jev.mjs run --all --dry
import { presets } from './jev.mjs';

export default (ctx) => [
  // PR x diff, CHANGELOG x diff, documentação x workflow, depuração esquecida.
  ...presets.all(ctx),
  // A Chrome Web Store pede justificativa de cada permissão: docs/PRIVACIDADE.md tem de explicar todas.
  presets.extensionPrivacy(ctx, 'docs/PRIVACIDADE.md'),
];
