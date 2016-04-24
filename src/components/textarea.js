import React                from 'react';
import PureRenderMixin      from 'react-addons-pure-render-mixin';
import { omit }             from 'timm';
import { bindAll }          from '../gral/helpers';

const NULL_VALUE = '';
function toInternalValue(val) { return val != null ? val : NULL_VALUE; }
function toExternalValue(val) { return val !== NULL_VALUE ? val : null; }

// ==========================================
// Component
// ==========================================
class Textarea extends React.Component {
  static propTypes = {
    value:                  React.PropTypes.any,
    errors:                 React.PropTypes.array,
    onChange:               React.PropTypes.func,
    onFocus:                React.PropTypes.func,
    onBlur:                 React.PropTypes.func,
  };
  static defaultProps = {
    errors:                 [],
  };

  constructor(props) {
    super(props);
    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    this.state = {
      curValue: toInternalValue(props.value),
      fFocused: false,
    };
    bindAll(this, [
      'onChange',
      'onFocus',
      'onBlur',
    ]);
  }

  componentWillReceiveProps(nextProps) {
    const { value } = nextProps;
    if (value !== this.props.value) {
      this.setState({ curValue: toInternalValue(value) });
    }
  }

  componentDidMount() { this.resizeTextarea(); }
  componentDidUpdate() { this.resizeTextarea(); }

  getValue() { return toExternalValue(this.state.curValue); }

  // ==========================================
  // Render
  // ==========================================
  render() {
    const { curValue } = this.state;
    const otherProps = omit(this.props, PROP_KEYS);
    return (
      <div style={style.taWrapper}>
        <div ref={c => { this._refTaPlaceholder = c; }}
          style={style.taPlaceholder}
        >
          {curValue || 'x'}
        </div>
        <textarea ref={c => { this._refTaInput = c; }}
          value={curValue}
          onChange={this.onChange}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          style={style.taInput}
          {...otherProps}
        />
      </div>
    );
  }

  // ==========================================
  // Handlers
  // ==========================================
  onChange(ev) {
    const { value } = ev.currentTarget;
    this.setState({ curValue: value });
    const { onChange } = this.props;
    if (onChange) onChange(ev, toExternalValue(value));
  }

  onFocus(ev) {
    this.setState({ fFocused: true });
    if (this.props.onFocus) this.props.onFocus(ev);
  }
  onBlur(ev) {
    this.setState({ fFocused: false });
    if (this.props.onBlur) this.props.onBlur(ev);
  }

  resizeTextarea() {
    const height = this._refTaPlaceholder.offsetHeight;
    // if (this.state.fFocused) height += 4;
    this._refTaInput.style.height = `${height}px`;
  }
}

// ==========================================
// Styles
// ==========================================
const style = {
  taWrapper: {
    position: 'relative',
  },
  taInput: {
    width: '100%',
    overflow: 'hidden',
    cursor: 'beam',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    background: 'transparent',
    resize: 'none',
    padding: 2,
  },
  taPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    opacity: 0,
    padding: 2,
    border: '1px solid red',
    color: 'red',
    cursor: 'beam',
    zIndex: -50,
  },
};

// ==========================================
// Miscellaneous
// ==========================================
const PROP_KEYS = Object.keys(Textarea.propTypes);

// ==========================================
// Public API
// ==========================================
export default Textarea;