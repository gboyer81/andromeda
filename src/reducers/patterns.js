import {
  adjust,
  any,
  assoc,
  equals,
  flip,
  lensProp,
  map,
  merge,
  none,
  over,
  reject,
  remove,
} from 'ramda'
import {
  PATTERN_ACTIVE_NOTES_SET,
  PATTERN_BEAT_ADD,
  PATTERN_BEAT_PLAYING_START,
  PATTERN_BEAT_PLAYING_STOP,
  PATTERN_DELETE,
  PATTERN_INSTRUMENT_SET,
  PATTERN_MARKER_POSITION_SET,
  PATTERN_NEXT_LOOP_END_TIME_SET,
  PATTERN_SYNTH_ADD,
  PATTERN_SYNTH_CELL_CLICK,
  PATTERN_SYNTH_PLAYING_START,
  PATTERN_SYNTH_PLAYING_STOP,
  PATTERN_VOLUME_SET,
  PATTERN_X_LENGTH_SET,
  PATTERNS_ALL_PLAYING_STOP,
} from '../actions'
import sampleNames from '../constants/sampleNames'
import {instrumentInstance} from '../utils/derivedData'
import store from '../store'

const overActiveNotes = over(lensProp('activeNotes'))
const overSteps = over(lensProp('steps'))

export const beatPattern = () => ({
  activeNotes: [],
  beatPattern: true,
  instrument: 'Prometheus',
  markerPosition: 0,
  playing: false,
  playStartTime: null,
  steps: [],
  volume: 1 / 3,
  xLength: 8,
  yLength: sampleNames.length,
})

export const synthPattern = () => ({
  activeNotes: [],
  instrument: 'Prometheus',
  markerPosition: 0,
  playing: false,
  playStartTime: null,
  steps: [],
  synthPattern: true,
  volume: 1 / 3,
  xLength: 8,
  yLength: 16,
})

const initialState = [synthPattern()]

export const stepExists = (x0, y0, steps) => any(({x, y}) => x === x0 && y === y0, steps)
const setPatternProp = (key, {patternId, value}, state) => adjust(assoc(key, value), patternId, state)
const mergeIntoPattern = (patternId, obj, state) => adjust(flip(merge)(obj), patternId, state)

export default (state = initialState, {type, payload}) => {
  switch (type) {
    case PATTERN_ACTIVE_NOTES_SET:
      return setPatternProp('activeNotes', payload, state)
    case PATTERN_BEAT_ADD: return append(beatPattern(), state)
    case PATTERN_SYNTH_CELL_CLICK: {
      const {patternId, x, y} = payload
      const xy = {x, y}
      const {instrument, steps} = state[patternId]
      const id = `pattern-${patternId}-${x}-${y}`
      const instrumentObj = instrumentInstance(instrument, store.getState().plugins)
      const isAddedNote = none(note => note.x === x && note.y === y, steps)

      return adjust(
        overSteps(stepExists(x, y, steps)
          ? reject(equals(xy))
          : append(xy)),
        patternId,
        adjust(
          overActiveNotes(isAddedNote
            ? append({id, instrumentObj})
            : reject(x => x.id === id)),
          patternId,
          state
        )
      )
    }
    case PATTERN_DELETE: return remove(payload, 1, state)
    case PATTERN_INSTRUMENT_SET:
      return setPatternProp('instrument', payload, state)
    case PATTERN_MARKER_POSITION_SET:
      return setPatternProp('markerPosition', payload, state)
    case PATTERN_NEXT_LOOP_END_TIME_SET:
      return setPatternProp('nextLoopEndTime', payload, state)
    case PATTERN_BEAT_PLAYING_START:
    case PATTERN_SYNTH_PLAYING_START:
      return mergeIntoPattern(
        payload.patternId,
        {playing: true, playStartTime: payload.currentTime},
        state,
      )
    case PATTERN_BEAT_PLAYING_STOP:
    case PATTERN_SYNTH_PLAYING_STOP:
      return mergeIntoPattern(payload, {
        playing: false,
        activeNotes: [],
        markerPosition: 0,
      }, state)
    case PATTERN_SYNTH_ADD: return append(synthPattern(), state)
    case PATTERN_VOLUME_SET:
      return setPatternProp('volume', payload, state)
    case PATTERN_X_LENGTH_SET:
      return setPatternProp('xLength', payload, state)
    case PATTERNS_ALL_PLAYING_STOP:
      return map(
        pattern => merge(pattern, {
          playing: false,
          activeNotes: [],
          markerPosition: 0,
        }),
        state
      )
    default: return state
  }
}
