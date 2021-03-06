// @flow

import React from 'react';
import classnames from 'classnames';
import moment from '../vendor/moment';
import { getTimeInSecs, startOfDefaultDay } from '../gral/dates';
import { KEYS } from '../gral/constants';
import type { Moment, KeyboardEventPars } from '../gral/types';
import DatePicker from './datePicker';
import TimePickerDigital from './timePickerDigital';
import TimePickerAnalog from './timePickerAnalog';

const TRAPPED_KEYS = [
  KEYS.home,
  KEYS.end,
  KEYS.up,
  KEYS.down,
  KEYS.left,
  KEYS.right,
  KEYS.pageUp,
  KEYS.pageDown,
  KEYS.backspace,
  KEYS.del,
];

// ==========================================
// Declarations
// ==========================================
type Props = {|
  registerOuterRef?: Function,
  curValue: ?Moment,
  disabled: boolean,
  date: boolean,
  time: boolean,
  analogTime: boolean,
  seconds: boolean,
  utc: boolean,
  todayName: string,
  onMouseDown?: Function,
  onClick?: Function,
  onChange: (ev: ?SyntheticEvent<*>, nextValue: ?Moment) => any,
  fFocused?: boolean,
|};

type State = {
  focusedSubpicker: Picker,
};

type Picker = 'date' | 'time';

// ==========================================
// Component
// ==========================================
class DateTimePicker extends React.Component<Props, State> {
  refOuter: ?Object;
  refDatePicker: any = React.createRef();
  refTimePicker: any = React.createRef();

  constructor(props: Props) {
    super(props);
    this.state = {
      focusedSubpicker: props.date ? 'date' : 'time',
    };
  }

  // ==========================================
  // Imperative API
  // ==========================================
  doKeyDown(keyDown: KeyboardEventPars) {
    if (this.props.disabled) return;
    const target =
      this.state.focusedSubpicker === 'date'
        ? this.refDatePicker.current
        : this.refTimePicker.current;
    if (target && target.doKeyDown) target.doKeyDown(keyDown);
  }

  // ==========================================
  render() {
    const { curValue } = this.props;
    if (curValue != null && this.props.utc) curValue.utc();
    return (
      <div
        ref={this.registerOuterRef}
        className={classnames('giu-input-reset giu-date-time-picker', {
          'giu-input-disabled': this.props.disabled,
          'giu-glow': this.props.fFocused,
        })}
        onMouseDown={this.props.onMouseDown}
        onClick={this.props.onClick}
      >
        {this.renderDate()}
        {this.renderSeparator()}
        {this.renderTime()}
      </div>
    );
  }

  renderDate() {
    if (!this.props.date) return null;
    const { disabled } = this.props;
    return (
      <DatePicker
        ref={this.refDatePicker}
        disabled={disabled}
        curValue={this.props.curValue}
        onChange={this.onChange('date')}
        utc={this.props.utc}
        todayName={this.props.todayName}
      />
    );
  }

  renderSeparator() {
    const { date, time } = this.props;
    if (!date || !time) return null;
    return <div className="giu-date-time-picker-separator" />;
  }

  renderTime() {
    const { disabled, analogTime } = this.props;
    if (!this.props.time) return null;
    if (typeof window === 'undefined') return null;
    const Component = analogTime ? TimePickerAnalog : TimePickerDigital;
    return (
      <Component
        ref={this.refTimePicker}
        disabled={disabled}
        curValue={this.props.curValue}
        onChange={this.onChange('time')}
        utc={this.props.utc}
        seconds={this.props.seconds}
      />
    );
  }

  // ==========================================
  registerOuterRef = (c: ?Object) => {
    this.refOuter = c;
    this.props.registerOuterRef && this.props.registerOuterRef(c);
  };

  onChange = (focusedSubpicker: Picker) => (ev: any, nextValue0: ?Moment) => {
    const { date, time } = this.props;
    let nextValue = nextValue0;
    if (nextValue != null && !(date && time)) {
      if (!time) {
        nextValue = nextValue.clone().startOf('day');
      }
      if (!date) {
        nextValue = startOfDefaultDay(this.props.utc);
        nextValue.add(moment.duration(getTimeInSecs(nextValue0), 'seconds'));
      }
    }
    this.props.onChange(ev, nextValue);
    this.setState({ focusedSubpicker });
  };
}

// ==========================================
// Public
// ==========================================
export { DateTimePicker, TRAPPED_KEYS };
