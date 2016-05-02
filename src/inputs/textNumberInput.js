import React                from 'react';
import { omit }             from 'timm';
import input                from '../hocs/input';

const NULL_VALUE = '';
const converters = {
  text: {
    toInternalValue: val => (val != null ? val : NULL_VALUE),
    toExternalValue: val => (val !== NULL_VALUE ? val : null),
  },
  number: {
    toInternalValue: val => (val != null ? String(val) : NULL_VALUE),
    toExternalValue: val => (val !== NULL_VALUE ? Number(val) : null),
  },
};

const PROP_TYPES = {
  // Input HOC
  curValue:               React.PropTypes.any.isRequired,
  errors:                 React.PropTypes.array.isRequired,
  registerFocusableRef:   React.PropTypes.func.isRequired,
  // all others are passed through unchanged
};
const PROP_KEYS = Object.keys(PROP_TYPES);

// ==========================================
// Component
// ==========================================
function createClass(name, inputType) {
  const Klass = class extends React.Component {
    static displayName = name;
    static propTypes = PROP_TYPES;

    // ==========================================
    // Render
    // ==========================================
    render() {
      const { curValue, registerFocusableRef } = this.props;
      const otherProps = omit(this.props, PROP_KEYS);
      return (
        <input ref={registerFocusableRef}
          className="giu-input"
          type={inputType}
          value={curValue}
          {...otherProps}
        />
      );
    }
  };

  return input(Klass, converters[inputType]);
}

// ==========================================
// Styles
// ==========================================
// const style = {};

// ==========================================
// Public API
// ==========================================
const TextInput = createClass('TextInput', 'text');
const NumberInput = createClass('NumberInput', 'number');

export {
  TextInput, NumberInput,
};