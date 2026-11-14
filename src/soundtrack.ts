export type MusicMood = 'explore' | 'shadow' | 'storm' | 'resolved'

const music = {
  explore: { tempo: 76, chords: [[45, 52, 55, 59, 64], [41, 48, 52, 55, 60], [48, 55, 59, 62, 67], [43, 50, 54, 57, 62]], pulse: .014 },
  shadow: { tempo: 68, chords: [[45, 52, 55, 59, 60], [41, 48, 52, 55, 59], [43, 50, 53, 57, 62], [40, 47, 50, 55, 59]], pulse: .023 },
  storm: { tempo: 94, chords: [[45, 52, 55, 58, 64], [47, 53, 57, 60, 64], [41, 48, 51, 55, 60], [40, 47, 50, 55, 59]], pulse: .043 },
  resolved: { tempo: 74, chords: [[48, 55, 59, 64, 67], [45, 52, 55, 60, 64], [41, 48, 52, 57, 60], [43, 50, 55, 59, 62]], pulse: .013 },
}

const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

export function createSoundtrack(context: AudioContext) {
  const output = context.createGain()
  output.gain.value = 0
  output.connect(context.destination)
  const active = new Set<OscillatorNode>()
  let enabled = false
  let mood: MusicMood = 'explore'
  let next = context.currentTime
  let count = 0
  let timer: number | undefined

  function note(pitch: number, start: number, length: number, volume: number, attack: number, wave: OscillatorType = 'sine', pan = 0) {
    const synth = context.createOscillator()
    const envelope = context.createGain()
    const stereo = context.createStereoPanner()
    stereo.pan.value = pan
    synth.type = wave
    synth.frequency.value = frequency(pitch)
    envelope.gain.setValueAtTime(.0001, start)
    envelope.gain.exponentialRampToValueAtTime(volume, start + attack)
    envelope.gain.exponentialRampToValueAtTime(.0001, start + length)
    synth.connect(envelope).connect(stereo).connect(output)
    active.add(synth)
    synth.onended = () => {
      active.delete(synth)
      synth.disconnect()
      envelope.disconnect()
      stereo.disconnect()
    }
    synth.start(start)
    synth.stop(start + length + .02)
  }

  function schedule() {
    if (!enabled || context.state !== 'running') return
    if (next < context.currentTime) next = context.currentTime + .03
    while (next < context.currentTime + .3) {
      const track = music[mood]
      const beat = 60 / track.tempo
      const inBar = count % 8
      const chord = track.chords[Math.floor(count / 8) % track.chords.length]
      if (!inBar) {
        chord.slice(0, 4).forEach((pitch, index) => note(pitch, next, beat * 4.4, index === 0 ? .052 : .027, beat * .88, 'sine', (index - 1.5) * .39))
      }
      if (inBar % (mood === 'storm' ? 2 : 4) === 0) {
        note(chord[0] - 12, next, beat * .66, track.pulse, .028, 'triangle')
      }
      if ([1, 3, 6].includes(inBar) || (mood === 'storm' && inBar === 7)) {
        note(chord[[4, 3, 2][Math.floor(inBar / 3)]] + 12, next, beat * 1.9, .026, .025, 'sine', inBar < 4 ? -.49 : .49)
      }
      next += beat / 2
      count += 1
    }
  }

  return {
    setMood(value: MusicMood) { mood = value },
    setEnabled(value: boolean) {
      if (enabled === value) return
      enabled = value
      output.gain.setTargetAtTime(value ? .3 : 0, context.currentTime, value ? .28 : .1)
      if (value) {
        next = context.currentTime + .04
        count = 0
        schedule()
        timer = window.setInterval(schedule, 105)
      } else {
        window.clearInterval(timer)
      }
    },
    dispose() {
      window.clearInterval(timer)
      for (const synth of active) synth.stop()
      output.disconnect()
    },
  }
}
