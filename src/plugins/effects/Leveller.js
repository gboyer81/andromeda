import React from 'react'
import ReactDOM from 'react-dom'
import {createStore, connect} from 'st88'
import ControlModule, {Range} from '../../components/organisms/ControlModule'

const dynamicsCompressorNodes = new WeakMap()
const gainNodes = new WeakMap()
const panNodes = new WeakMap()
const stores = new WeakMap()

export default class {
  constructor ({audioContext}) {
    const dynamicsCompressorNode = audioContext.createDynamicsCompressor()
    const gainNode = audioContext.createGain()
    const panNode = audioContext.createStereoPanner()

    const store = createStore({
      attack: 0,
      gain: 1,
      knee: 40,
      pan: 0,
      ratio: 12,
      reduction: -20,
      release: 0.25,
      threshold: -50,
    })

    store.subscribe(({
      attack,
      gain,
      knee,
      pan,
      ratio,
      reduction,
      release,
      threshold,
    }) => {
      const dynamicsCompressorNode = dynamicsCompressorNodes.get(this)

      dynamicsCompressorNode.attack.value = attack
      dynamicsCompressorNode.knee.value = knee
      dynamicsCompressorNode.ratio.value = ratio
      dynamicsCompressorNode.reduction.value = reduction
      dynamicsCompressorNode.release.value = release
      dynamicsCompressorNode.threshold.value = threshold

      gainNodes.get(this).gain.value = gain
      panNodes.get(this).pan.value = pan
    })

    this.destination = dynamicsCompressorNode

    dynamicsCompressorNodes.set(this, dynamicsCompressorNode)
    gainNodes.set(this, gainNode)
    panNodes.set(this, panNode)
    dynamicsCompressorNode.connect(panNode).connect(gainNode)
    stores.set(this, store)
  }
  connect (destination) {
    gainNodes.get(this).connect(destination)
  }
  disconnect (destination) {
    gainNodes.get(this).disconnect(destination)
  }
  render (containerEl) {
    const store = stores.get(this)
    const setProp = (key, val) => store.dispatch(state => ({...state, [key]: val}))

    ReactDOM.render(
      connect(store)(({
        attack,
        gain,
        knee,
        pan,
        ratio,
        reduction,
        release,
        threshold,
      }) =>
        <div style={{textAlign: 'center'}}>
          <h2>Leveller</h2>
          <div>
            <ControlModule title='Output'>
              <Range {...{
                defaultValue: gain,
                label: 'Gain',
                max: 2,
                onInput: e => setProp('gain', Number(e.target.value)),
              }}/>
              <Range {...{
                defaultValue: pan,
                label: 'Pan',
                min: -1,
                onInput: e => setProp('pan', Number(e.target.value)),
              }}/>
            </ControlModule>
          </div>
          <ControlModule title='Compressor'>
            <Range {...{
              defaultValue: threshold,
              label: 'Threshold',
              max: 0,
              min: -99.99,
              onInput: e => setProp('threshold', Number(e.target.value)),
            }}/>
            <Range {...{
              defaultValue: knee,
              label: 'Knee',
              max: 99.99,
              onInput: e => setProp('knee', Number(e.target.value)),
            }}/>
            <Range {...{
              defaultValue: ratio,
              label: 'Ratio',
              max: 99.99,
              onInput: e => setProp('ratio', Number(e.target.value)),
            }}/>
            <Range {...{
              defaultValue: reduction,
              label: 'Reduction',
              max: 0,
              min: -99.99,
              onInput: e => setProp('reduction', Number(e.target.value)),
            }}/>
            <Range {...{
              defaultValue: attack,
              label: 'Attack',
              max: 3,
              onInput: e => setProp('attack', Number(e.target.value)),
            }}/>
            <Range {...{
              defaultValue: release,
              label: 'Release',
              max: 3,
              onInput: e => setProp('release', Number(e.target.value)),
            }}/>
          </ControlModule>
        </div>),
      containerEl
    )
  }
}