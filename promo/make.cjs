/* Builds the HELL ON EARTH promotion video with ffmpeg-static. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FF = require('ffmpeg-static');
const ROOT = path.resolve(__dirname, '..');
const OUT = __dirname;
const ART = path.join(ROOT, 'artifacts');
const FONTS = path.join(OUT, 'fonts');
const W = 1280, H = 720, FPS = 30;

const run = (args) => {
  process.stdout.write('ffmpeg ' + args.slice(-1).join(' ') + '\n');
  try {
    execFileSync(FF, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    console.error('FFMPEG FAILED');
    console.error(e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }
};

const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HeroTitle,Oswald,104,&H00D1E2E8,&H00D1E2E8,&H00101010,&H80000000,-1,0,0,0,100,100,3,0,1,0,4,5,0,0,0,1
Style: HeroKicker,Rajdhani SemiBold,25,&H005AA4C8,&H005AA4C8,&H00101010,&H80000000,-1,0,0,0,100,100,5,0,1,0,2,5,0,0,0,1
Style: HeroSub,Rajdhani SemiBold,30,&H00D1E2E8,&H00D1E2E8,&H00101010,&H80000000,-1,0,0,0,100,100,2,0,1,0,2,5,0,0,0,1
Style: HeroTag,Rajdhani SemiBold,21,&H005AA4C8,&H005AA4C8,&H00101010,&H80000000,-1,0,0,0,100,100,3,0,1,0,2,5,0,0,0,1
Style: Kicker,Rajdhani SemiBold,23,&H005AA4C8,&H005AA4C8,&H00101010,&H80000000,-1,0,0,0,100,100,4,0,1,0,2,7,0,0,0,1
Style: CapTitle,Oswald,46,&H00D1E2E8,&H00D1E2E8,&H00101010,&H80000000,-1,0,0,0,100,100,2,0,1,0,3,7,0,0,0,1
Style: CapSub,Rajdhani SemiBold,24,&H00A9BDC4,&H00A9BDC4,&H00101010,&H80000000,-1,0,0,0,100,100,2,0,1,0,2,7,0,0,0,1
Style: Small,Rajdhani SemiBold,16,&H006B8D8B,&H006B8D8B,&H00101010,&H80000000,-1,0,0,0,100,100,4,0,1,0,1,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

const t = (dur) => {
  const m = Math.floor(dur / 60), s = (dur % 60).toFixed(2).padStart(5, '0');
  return `0:${String(m).padStart(2, '0')}:${s}`;
};

function assFor(scene, dur) {
  const lines = [];
  if (scene.hero) {
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},HeroKicker,,0,0,0,,{\\pos(640,236)\\fad(400,300)}${scene.kicker}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},HeroTitle,,0,0,0,,{\\pos(640,318)\\fad(450,300)}${scene.title}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},HeroSub,,0,0,0,,{\\pos(640,414)\\fad(500,300)}${scene.sub}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},HeroTag,,0,0,0,,{\\pos(640,462)\\fad(550,300)}${scene.tag}`);
    if (scene.closing) {
      lines.push(`Dialogue: 0,${t(0)},${t(dur)},Small,,0,0,0,,{\\pos(640,690)\\fad(600,300)}DOG PRODUCTIVE · BUILD 0.9.0-BETA`);
    }
  } else {
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},Kicker,,0,0,0,,{\\pos(92,512)\\fad(400,300)}${scene.kicker}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},CapTitle,,0,0,0,,{\\pos(90,548)\\fad(420,300)}${scene.title}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},CapSub,,0,0,0,,{\\pos(92,612)\\fad(440,300)}${scene.sub}`);
    lines.push(`Dialogue: 0,${t(0)},${t(dur)},Small,,0,0,0,,{\\pos(92,656)\\fad(460,300)}HELL ON EARTH · BETA 0.9.0`);
  }
  return ASS_HEADER + lines.join('\n') + '\n';
}

const scenes = [
  {
    img: path.join(ART, 'hero-crop.jpg'), dur: 6.0, zoom: 'in', hero: true,
    kicker: 'DOG PRODUCTIVE PRESENTS', title: 'HELL ON EARTH', sub: '30 VS 30 COMBINED ARMS', tag: 'BETA 0.9.0 · PC AND MOBILE'
  },
  {
    img: path.join(ART, 'intro-end.png'), dur: 5.0, zoom: 'out',
    kicker: 'OPENING CINEMATIC', title: 'TWO RECRUITS. ONE RIFLE.', sub: 'A DOG PRODUCTIVE PRODUCTION'
  },
  {
    img: path.join(ART, 'combat.png'), dur: 5.5, zoom: 'in',
    kicker: '30 VS 30', title: 'SIXTY SOLDIERS. ONE SECTOR.', sub: 'CENTRAL PLAZA · 250 TICKETS PER SIDE'
  },
  {
    img: path.join(ART, 'city3.png'), dur: 5.5, zoom: 'out',
    kicker: 'COMBINED ARMS', title: 'TANKS. ATVS. TRANSPORTS.', sub: 'WALK UP · PRESS F · DRIVE'
  },
  {
    img: path.join(ART, 'armory.png'), dur: 5.0, zoom: 'in',
    kicker: 'ARMORY', title: 'BUILD YOUR WEAPON.', sub: 'FIVE PLATFORMS · FOUR ATTACHMENT SLOTS'
  },
  {
    img: path.join(ART, 'hero-crop.jpg'), dur: 6.0, zoom: 'out', hero: true, closing: true,
    kicker: 'BETA 0.9.0', title: 'HELL ON EARTH', sub: 'PLAY FREE IN YOUR BROWSER', tag: 'DOG PRODUCTIVE'
  }
];

const list = [];
scenes.forEach((s, i) => {
  const assFile = path.join(OUT, `cap${i}.ass`);
  fs.writeFileSync(assFile, assFor(s, s.dur));
  const zoom = s.zoom === 'in' ? `min(1.0+0.00050*on,1.12)` : `max(1.0,1.12-0.00050*on)`;
  const filters = [
    'scale=1600:900:force_original_aspect_ratio=increase',
    'crop=1600:900',
    `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS}`,
    'eq=saturation=0.92:contrast=1.05',
    'vignette=PI/5'
  ];
  if (s.hero) filters.push('drawbox=x=0:y=0:w=iw:h=ih:color=black@0.42:t=fill');
  else filters.push('drawbox=x=0:y=ih-208:w=iw:h=208:color=black@0.55:t=fill');
  filters.push(`ass=filename=${assFile}:fontsdir=${FONTS}`);
  filters.push(`fade=t=in:st=0:d=0.35`);
  filters.push(`fade=t=out:st=${(s.dur - 0.4).toFixed(2)}:d=0.4`);

  const file = path.join(OUT, `scene${i}.mp4`);
  run([
    '-y', '-framerate', String(FPS), '-loop', '1', '-t', String(s.dur), '-i', s.img,
    '-vf', filters.join(','),
    '-r', String(FPS), '-fps_mode', 'cfr', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-an', file
  ]);
  list.push(`file '${file}'`);
});
fs.writeFileSync(path.join(OUT, 'scenes.txt'), list.join('\n') + '\n');

run(['-y', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'scenes.txt'), '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'silent.mp4')]);

/* ---------------- audio ---------------- */
const boom = path.join(OUT, 'boom.wav');
const gun = path.join(OUT, 'gun.wav');
run(['-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.6:c=white:a=0.9', '-af', 'lowpass=f=900,afade=t=out:st=0.02:d=0.55,volume=1.7', '-ar', '44100', '-ac', '2', boom]);
run(['-y', '-f', 'lavfi', '-i', 'anoisesrc=d=0.18:c=white:a=0.9', '-af', 'bandpass=f=1400:width_type=h:w=1200,afade=t=out:st=0.01:d=0.16,volume=1.2', '-ar', '44100', '-ac', '2', gun]);

const inputs = ['vo1.mp3', 'vo2.mp3', 'vo3.mp3', 'vo4.mp3', 'vo5.mp3'].map((f) => path.join(OUT, f));

const audioArgs = ['-y'];
for (const f of inputs) audioArgs.push('-i', f);
audioArgs.push('-f', 'lavfi', '-t', '33', '-i', 'sine=frequency=55:sample_rate=44100');
audioArgs.push('-f', 'lavfi', '-t', '33', '-i', 'sine=frequency=82.5:sample_rate=44100');
audioArgs.push('-f', 'lavfi', '-t', '33', '-i', 'anoisesrc=d=33:c=brown:a=0.4:r=44100');
audioArgs.push('-i', boom, '-i', gun);
audioArgs.push('-i', path.join(OUT, 'silent.mp4'));

const delays = [700, 6400, 16900, 22600, 27600];
const parts = [];
parts.push('[5:a]volume=0.5,lowpass=f=140[s1]');
parts.push('[6:a]volume=0.2[s2]');
parts.push('[7:a]lowpass=f=220,volume=0.4[s3]');
parts.push('[s1][s2][s3]amix=inputs=3:normalize=0,tremolo=f=0.14:d=0.3[bed]');
delays.forEach((d, i) => parts.push(`[${i}:a]adelay=${d}|${d},volume=1.6[v${i}]`));
parts.push('[v0][v1][v2][v3][v4]amix=inputs=5:normalize=0[voice]');
parts.push('[8:a]asplit=5[bo0][bo1][bo2][bo3][bo4]');
[5600, 10900, 16400, 21900, 27200].forEach((d, i) => parts.push(`[bo${i}]adelay=${d}|${d},volume=${i % 2 ? 0.4 : 0.55}[b${i}]`));
parts.push('[9:a]asplit=2[gu0][gu1]');
[11000, 16500].forEach((d, i) => parts.push(`[gu${i}]adelay=${d}|${d},volume=0.3[g${i}]`));
parts.push('[bed][b0][b1][b2][b3][b4][g0][g1]amix=inputs=8:normalize=0[sfx]');
parts.push('[voice][sfx]amix=inputs=2:normalize=0,alimiter=limit=0.92,loudnorm=I=-15:TP=-1.5:LRA=11[aout]');

audioArgs.push(
  '-filter_complex', parts.join(';'),
  '-map', '10:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '44100', '-shortest', '-movflags', '+faststart',
  path.join(OUT, 'hell-on-earth-trailer.mp4')
);
run(audioArgs);

const final = path.join(OUT, 'hell-on-earth-trailer.mp4');
const stats = fs.statSync(final);
console.log('TRAILER', final, (stats.size / 1024 / 1024).toFixed(2), 'MB');
