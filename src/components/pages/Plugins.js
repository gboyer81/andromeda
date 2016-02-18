import React from 'react'
import {rawConnect} from '../../utils/helpers'
import Navigation from '../organisms/Navigation'
import FullButton from '../atoms/FullButton'

export default rawConnect(({plugins: {instrumentInstances}}) =>
  <div>
    <Navigation />
    <div className='flex-column text-center'>
      <h1>Plugins</h1>
      <div>
        <FullButton text='Instruments' to={'/plugins/instruments'}/>
      </div>
      <div>
        <FullButton text='Effects' to={'/plugins/effects'}/>
      </div>
    </div>
  </div>)
