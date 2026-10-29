// Turns every step in tour.json into a narration file with Kokoro (runs locally, no API key, no cost).
// Only steps whose text, voice or speed changed are regenerated; a manifest.json remembers what was made.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

const { values: args } = parseArgs({
  options: {
    tour: { type: 'string' },
    out: { type: 'string' },
    voice: { type: 'string', default: 'af_heart' },
    speed: { type: 'string', default: '1' },
    force: { type: 'boolean', default: false },
    'list-voices': { type: 'boolean', default: false },
  },
});

// Return instead of calling process.exit(): exiting while the speech engine's threads run crashes Node.
await main();

async function main() {
  console.log('Loading Kokoro (the first run downloads the ~90 MB model)...');
  const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' });

  if (args['list-voices']) {
    console.log(Object.keys(tts.voices).join('\n'));
    return;
  }
  if (!args.tour || !args.out) {
    console.error('Usage: --tour <tour.json> --out <folder> [--voice af_heart] [--speed 1] [--force]');
    process.exitCode = 1;
    return;
  }
  if (!(args.voice in tts.voices)) {
    console.error(`Unknown voice "${args.voice}". Run with --list-voices to see the options.`);
    process.exitCode = 1;
    return;
  }

  const speed = Number(args.speed);
  const { steps } = JSON.parse(readFileSync(args.tour, 'utf8'));
  mkdirSync(args.out, { recursive: true });

  const manifestPath = join(args.out, 'manifest.json');
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { steps: {} };
  const manifest = { model: MODEL, voice: args.voice, speed, steps: {} };
  let made = 0;
  let kept = 0;

  for (const step of steps) {
    const text = spokenText(step);
    const hash = createHash('sha1').update([MODEL, args.voice, speed, text].join('|')).digest('hex').slice(0, 12);
    const file = `${step.id}.wav`;
    manifest.steps[step.id] = { file, hash };

    if (!args.force && previous.steps[step.id]?.hash === hash && existsSync(join(args.out, file))) {
      kept++;
      continue;
    }
    const audio = await tts.generate(text, { voice: args.voice, speed });
    writeFileSync(join(args.out, file), toWav16(audio.audio, audio.sampling_rate));
    console.log(`  made ${file}`);
    made++;
  }

  // Delete narration for steps that no longer exist.
  let removed = 0;
  for (const name of readdirSync(args.out)) {
    if (name.endsWith('.wav') && !Object.values(manifest.steps).some((s) => s.file === name)) {
      rmSync(join(args.out, name));
      removed++;
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Done: ${made} generated, ${kept} unchanged, ${removed} removed. Files in ${args.out}`);
}

/** What gets read aloud: the title, a pause, then the body. */
function spokenText(step) {
  return `${step.title}. ${step.body}`;
}

/** 16-bit mono WAV: half the size of the 32-bit float audio Kokoro produces, with no audible difference for speech. */
function toWav16(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // bytes per second
  buffer.writeUInt16LE(2, 32); // bytes per sample
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}
