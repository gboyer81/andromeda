import {cycle, map, range, zipWith} from '../utils/lazyIterables'
import Looper from './Looper'
import store from '../store'
import audioContext from '../audioContext'
import {arpeggiatedScale} from '../utils/derivedData'
import nextNoteStartTime from './nextNoteStartTime'
import pitchToFrequency from './pitchToFrequency'

const onStop = x => {
  const {controlPad: {instrument}, instruments} = store.getState()
  instruments[instrument].inputNoteStop(x)
}

const gain = modulation => (1 - modulation) / 2

let looper = null

export const startArpeggiator = ({id, pitch, modulation}) => {
  const {
    bpm,
    controlPad: {instrument, octave},
    instruments,
    rootNote
  } = store.getState()

  const onStart = x => {
    instruments[instrument].inputNoteStart({
      ...x,
      frequency: pitchToFrequency(pitch + x.pitch + 12 * octave + rootNote),
      gain: gain(modulation)
    })
  }

  if (looper) {
    looper.onStart = onStart
    return
  }
  const currentArpeggiatedScale = arpeggiatedScale(store.getState())
  const {currentTime} = audioContext
  const noteDuration = 60 / bpm / 4
  const startAndStopTimes = map(
    i => {
      const startTime = nextNoteStartTime(noteDuration, currentTime) +
        i * noteDuration
      return {
        i,
        startTime,
        stopTime: startTime + noteDuration
      }
    },
    range(0, Infinity)
  )
  const pitchStartStops = zipWith(
    (startAndStopTime, pitch) => ({...startAndStopTime, pitch}),
    startAndStopTimes,
    currentArpeggiatedScale
  )

  const iterable = zipWith(
    (x, i) => ({
      ...x,
      id: `${id}-${pitch}-${i}`,
      instrument,
      pitch: x.pitch
    }),
    pitchStartStops,
    cycle(range(0, 8))
  )
  looper = new Looper({iterable, onStart, onStop})
  looper.start()
}

export const stopArpeggiator = _ => {
  looper && looper.stop()
  looper = null
}
