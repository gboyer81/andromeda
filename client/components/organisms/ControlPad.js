import {
  always,
  assoc,
  compose,
  curry,
  identity,
  ifElse,
  isNil,
  map,
  reject,
  tap
} from 'ramda'
import {
  addAudioGraphSource,
  removeKeysFromAudioGraphContaining
} from '../../actions'
import React, {PropTypes} from 'react'
import {Observable} from 'rx'
import THREE from 'three'
import store, {dispatch} from '../../store'
import {clamp} from '../../helpers'
import pitchToFrequency from '../../audioHelpers/pitchToFrequency'
import {randomMesh} from '../../webGLHelpers'
import {currentScale} from '../../derivedData'
import {startArpeggiator, stopArpeggiator} from '../../audioHelpers/arpeggiator'

const {fromEvent, merge} = Observable
const controlPadId = 'controlPad'
let currentlyPlayingPitch = null
let stopLastNoteOnNoteChange = true

const cameraZ = 16
const minZ = -128
const sideLength = 1
const maxDepth = 3 * sideLength
const validRatio = clamp(0, 1 - Number.EPSILON)

const calculateXAndYRatio = e => {
  const {top, right, bottom, left} = e.target.getBoundingClientRect()
  const [width, height] = [right - left, bottom - top]
  const {clientX, clientY} = e.changedTouches && e.changedTouches[0] || e
  const [x, y] = [clientX - left, clientY - top]
  return {xRatio: validRatio(x / width), yRatio: validRatio(y / height)}
}

let mouseInputEnabled = false
let currentXYRatios = null
let controlPadElement = null
let renderLoopActive = null
let token = null
let renderer = null
let camera = null
let scene = null

const setRendererSize = _ => {
  const rendererSize = window.innerWidth < window.innerHeight
    ? window.innerWidth
    : window.innerHeight * 0.8
  renderer.setSize(rendererSize, rendererSize)
}

const renderLoop = _ => {
  if (!renderLoopActive) return
  window.requestAnimationFrame(renderLoop)
  const controlPadHasNotBeenUsed = isNil(currentXYRatios)
  const {z} = token.position
  if (controlPadHasNotBeenUsed) return
  if (currentlyPlayingPitch === null) {
    if (z > minZ - maxDepth) token.position.z -= 1
    renderer.render(scene, camera)
    return
  }
  const {xRatio, yRatio} = currentXYRatios
  const xMod = xRatio < 0.5
    ? -(xRatio - 0.5) ** 2
    : (xRatio - 0.5) ** 2
  const yMod = yRatio < 0.5
    ? -(yRatio - 0.5) ** 2
    : (yRatio - 0.5) ** 2
  const rotationBaseAmount = 0.01
  const rotationVelocityComponent = 0.8
  token.rotation.x += rotationBaseAmount + rotationVelocityComponent * xMod
  token.rotation.y += rotationBaseAmount + rotationVelocityComponent * yMod
  token.rotation.z += rotationBaseAmount + rotationVelocityComponent * xMod * yMod
  token.position.x = (xRatio - 0.5) * cameraZ
  token.position.y = (0.5 - yRatio) * cameraZ
  const returnVelocity = 8
  if (z < 0) token.position.z += z > -returnVelocity ? -z : returnVelocity
  renderer.render(scene, camera)
}

const calculatePitch = ratio => {
  const scale = currentScale(store.getState().scale)
  const {length} = scale
  stopLastNoteOnNoteChange = true
  const i = Math.floor((length + 1) * ratio)
  return scale[(i % length + length) % length] + 12 * Math.floor(i / length)
}

const xYRatiosToNote = ({range, xRatio, yRatio}) => ({
  pitch: calculatePitch(range * xRatio),
  modulation: yRatio
})
const xYRatiosToNoScaleNote = ({range, xRatio, yRatio}) => ({
  pitch: 12 * range * xRatio,
  modulation: yRatio
})

const createSource = curry((
  {instrument, octave, rootNote},
  {id, pitch, modulation}
) => ({
  id,
  instrument,
  params: {
    frequency: pitchToFrequency(pitch + 12 * octave + rootNote),
    gain: (1 - modulation) / 2
  }
}))

export default class extends React.Component {
  static propTypes = {
    arpeggiatorIsOn: PropTypes.bool,
    instrument: PropTypes.string,
    noScale: PropTypes.bool,
    octave: PropTypes.number,
    portamento: PropTypes.bool,
    range: PropTypes.number,
    rootNote: PropTypes.number,
    selectedArpeggiatorPattern: PropTypes.string
  }
  componentDidMount () {
    const {
      arpeggiatorIsOn,
      instrument,
      noScale,
      octave,
      portamento,
      range,
      rootNote
    } = this.props
    controlPadElement = document.querySelector('.control-pad')
    const input$ = merge(
      fromEvent(controlPadElement, 'touchstart'),
      fromEvent(controlPadElement, 'touchmove'),
      fromEvent(controlPadElement, 'mousedown'),
      fromEvent(controlPadElement, 'mousemove')
    )
    const endInput$ = merge(
      fromEvent(controlPadElement, 'touchend'),
      fromEvent(controlPadElement, 'mouseup')
    )

    const inputTransducer = compose(
      map(tap(e => mouseInputEnabled = e.type === 'mousedown'
        ? true
        : mouseInputEnabled)),
      reject(e => e instanceof window.MouseEvent && !mouseInputEnabled),
      map(e => currentXYRatios = calculateXAndYRatio(e)),
      map(assoc('range', range)),
      map(ifElse(_ => noScale, xYRatiosToNoScaleNote, xYRatiosToNote)),
      map(assoc('id', controlPadId)),
      map(tap(({pitch}) => !noScale && !portamento && (
        currentlyPlayingPitch !== pitch &&
        currentlyPlayingPitch !== null &&
        stopLastNoteOnNoteChange
      ) && dispatch(removeKeysFromAudioGraphContaining(controlPadId)))),
      map(tap(({pitch}) => currentlyPlayingPitch = pitch)),
      map(ifElse(
        always(arpeggiatorIsOn),
        startArpeggiator,
        compose(dispatch, addAudioGraphSource, createSource({
          instrument,
          octave,
          rootNote
        }))
      ))
    )

    const endInputTransducer = compose(
      map(tap(() => mouseInputEnabled = false)),
      map(tap(() => currentlyPlayingPitch = null)),
      map(e => currentXYRatios = calculateXAndYRatio(e)),
      map(_ => dispatch(removeKeysFromAudioGraphContaining(controlPadId))),
      map(stopArpeggiator),
    )

    input$.transduce(inputTransducer).subscribe(identity, ::console.error)
    endInput$.transduce(endInputTransducer).subscribe(identity, ::console.error)

    renderLoopActive = true
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(
      54,
      1,
      cameraZ - maxDepth,
      cameraZ - minZ
    )
    renderer = new THREE.WebGLRenderer({canvas: controlPadElement})
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    token = randomMesh()
    token.position.z = minZ - maxDepth

    directionalLight.position.set(16, 16, 24).normalize()
    scene.add(new THREE.AmbientLight(0x333333))
      .add(directionalLight)
      .add(token)
    camera.position.z = cameraZ

    setRendererSize()
    window.onresize = setRendererSize

    controlPadElement.oncontextmenu = e => e.preventDefault()

    renderLoop()
  }

  componentWillUnmount () {
    renderLoopActive = false
    window.onresize = null
  }

  render () {
    return <canvas width='768' height='768' className='control-pad'></canvas>
  }
}
