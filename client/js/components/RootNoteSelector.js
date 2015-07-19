import React from 'react';
import PerformanceView from './PerformanceView';
import render from '../tools/render';
import RootNoteActions from '../actions/RootNoteActions';

const {abs, floor} = Math;

const computeNoteNameFromPitch = (pitch) => {
  const AlphabeticalComponents = ['A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab'];
  const numberOfNotes = AlphabeticalComponents.length;
  const octave = floor(pitch / numberOfNotes) + 4;
  return AlphabeticalComponents[abs(pitch) % numberOfNotes] + octave;
};

export default class RootNoteSelector extends React.Component {
  handleClick () {
    render(<PerformanceView />);
  }

  handleChange (e) {
    RootNoteActions.updateRootNote(Number(e.currentTarget.value));
  }

  render () {
    return (
      <div>
        <h1>Root Note</h1>
          <output>{computeNoteNameFromPitch(this.props.rootNote)}</output>
        <div>
          <input max="24" min="-36" type="range" value={this.props.rootNote} onChange={this.handleChange}></input>
        </div>
      </div>
    );
  }
}
