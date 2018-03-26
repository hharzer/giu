// @flow

import React from 'react';
import { merge } from 'timm';
import tinycolor from 'tinycolor2';
import { COLORS, KEYS, IS_IOS, IS_MOBILE_OR_TABLET } from '../gral/constants';
import { GLOW, inputReset, INPUT_DISABLED } from '../gral/styles';
import type { KeyboardEventPars } from '../gral/types';
import { isAncestorNode } from '../gral/helpers';
import input from '../hocs/input';
import { floatAdd, floatDelete, floatUpdate } from '../components/floats';
import type { FloatPosition, FloatAlign } from '../components/floats';
import ColorPicker from '../inputs/colorPicker';
import IosFloatWrapper from '../inputs/iosFloatWrapper';

const toInternalValue = val => val;
const toExternalValue = val => val;
const isNull = val => val == null;

const SWATCH_WIDTH = 25;
const SWATCH_HEIGHT = 10;

const MANAGE_FOCUS_AUTONOMOUSLY = IS_MOBILE_OR_TABLET;

// ==========================================
// Declarations
// ==========================================
// -- Props:
// -- START_DOCS
type PublicProps = {
  disabled?: boolean,
  // Whether the complete color picker should be inlined or appear as a dropdown when clicked
  inlinePicker?: boolean,
  onCloseFloat?: () => any,
  floatPosition?: FloatPosition,
  floatAlign?: FloatAlign,
  floatZ?: number,
  accentColor?: string, // CSS color descriptor (e.g. `darkgray`, `#ccffaa`...)
};
// -- END_DOCS

type Props = {
  ...$Exact<PublicProps>,
  // Input HOC
  curValue: ?string,
  onChange: Function,
  registerOuterRef: Function,
  fFocused: boolean,
  onFocus: Function,
  onBlur: Function,
  keyDown?: KeyboardEventPars,
};

type State = {
  fFloat: boolean,
};

// ==========================================
// Component
// ==========================================
class ColorInput extends React.Component<Props, State> {
  floatId: ?string;
  refTitle: ?Object;
  refPicker: ?Object;

  static defaultProps = {};
  state = { fFloat: false };

  componentWillReceiveProps(nextProps: Props) {
    const { keyDown, fFocused } = nextProps;
    if (keyDown !== this.props.keyDown) this.processKeyDown(keyDown);
    if (fFocused !== this.props.fFocused) {
      this.setState({ fFloat: fFocused });
    }
  }

  componentDidUpdate() {
    this.renderFloat();
  }

  componentDidMount() {
    window.addEventListener('click', this.onClickWindow);
  }

  componentWillUnmount() {
    if (this.floatId != null) floatDelete(this.floatId);
    window.removeEventListener('click', this.onClickWindow);
  }

  // ==========================================
  render() {
    return this.props.inlinePicker ? this.renderPicker() : this.renderTitle();
  }

  renderTitle() {
    return (
      // The `x` text keeps baselines aligned
      <div
        ref={this.registerTitleRef}
        onMouseDown={this.onMouseDownTitle}
        onClick={this.onClickTitle}
        style={style.title(this.props)}
      >
        x
        <div className="giu-transparency-tiles" style={style.swatchTiles} />
        <div style={style.swatch(this.props)} />
        {IS_IOS && this.renderFloatForIos()}
      </div>
    );
  }

  renderFloat() {
    if (this.props.inlinePicker) return;
    if (IS_IOS) return;
    const { fFloat } = this.state;

    // Remove float
    if (!fFloat && this.floatId != null) {
      floatDelete(this.floatId);
      this.floatId = null;
      this.props.onCloseFloat && this.props.onCloseFloat();
      return;
    }

    // Create or update float
    if (fFloat) {
      const { floatZ, floatPosition, floatAlign } = this.props;
      const floatOptions = {
        position: floatPosition,
        align: floatAlign,
        zIndex: floatZ,
        getAnchorNode: () => this.refTitle,
        children: this.renderPicker(),
      };
      if (this.floatId == null) {
        this.floatId = floatAdd(floatOptions);
      } else {
        floatUpdate(this.floatId, floatOptions);
      }
    }
  }

  renderFloatForIos() {
    if (!this.state.fFloat) return null;
    const { floatPosition, floatAlign, floatZ } = this.props;
    return (
      <IosFloatWrapper
        floatPosition={floatPosition}
        floatAlign={floatAlign}
        floatZ={floatZ}
      >
        {this.renderPicker()}
      </IosFloatWrapper>
    );
  }

  renderPicker() {
    const {
      inlinePicker,
      registerOuterRef,
      curValue,
      onChange,
      accentColor,
      disabled,
      fFocused,
    } = this.props;
    return (
      <ColorPicker
        registerOuterRef={
          inlinePicker ? registerOuterRef : this.registerPickerRef
        }
        curValue={curValue}
        onChange={onChange}
        disabled={disabled}
        fFocused={!!inlinePicker && fFocused}
        accentColor={accentColor}
      />
    );
  }

  // ==========================================
  registerTitleRef = c => {
    this.refTitle = c;
    this.props.registerOuterRef(c);
  };

  registerPickerRef = c => {
    this.refPicker = c;
  };

  // If the menu is not focused, ignore it: it will be handled by the `input` HOC.
  // ...but if it is focused, we want to toggle it
  onMouseDownTitle = () => {
    if (!this.props.fFocused) return;
    this.setState({ fFloat: !this.state.fFloat });
  };

  // Only for autonomous focus management
  onClickTitle = (ev: SyntheticEvent<*>) => {
    if (!MANAGE_FOCUS_AUTONOMOUSLY) return;
    if (this.props.fFocused) this.props.onBlur(ev);
    else this.props.onFocus(ev);
  };

  // Only for autonomous focus management
  // Handle click on window (hopefully, they won't swallow it) to blur
  onClickWindow = (ev: SyntheticEvent<*>) => {
    if (!MANAGE_FOCUS_AUTONOMOUSLY) return;
    const { target } = ev;
    if (target instanceof Element && isAncestorNode(this.refTitle, target)) {
      return;
    }
    if (this.props.fFocused) this.props.onBlur(ev);
  };

  // ==========================================
  processKeyDown(keyDown) {
    if (keyDown && keyDown.which === KEYS.esc && !this.props.inlinePicker) {
      this.setState({ fFloat: !this.state.fFloat });
    }
  }
}

// ==========================================
const style = {
  title: ({ disabled, fFocused }) => {
    let out = inputReset({
      display: 'inline-block',
      position: 'relative',
      cursor: 'pointer',
      border: `1px solid ${COLORS.line}`,
      padding: '2px 4px 6px 4px',
      height: SWATCH_HEIGHT + 2 * 4 + 2,
      width: SWATCH_WIDTH + 2 * 4 + 2,
      color: 'transparent', // hide the placeholder text that keeps baselines aligned
      lineHeight: '1em',
    });
    if (disabled) out = merge(out, INPUT_DISABLED);
    if (fFocused) out = merge(out, GLOW);
    return out;
  },
  swatchTiles: {
    position: 'absolute',
    top: 4,
    right: 4,
    bottom: 4,
    left: 4,
    borderRadius: 2,
  },
  swatch: ({ curValue }) => {
    const col = tinycolor(curValue).toRgbString();
    const background = curValue != null ? `${col}` : 'transparent';
    return {
      position: 'absolute',
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
      borderRadius: 2,
      background,
    };
  },
};

// ==========================================
// Public
// ==========================================
export default input(ColorInput, {
  toInternalValue,
  toExternalValue,
  isNull,
  fIncludeFocusCapture: !MANAGE_FOCUS_AUTONOMOUSLY,
  trappedKeys: [KEYS.esc],
  className: 'giu-color-input',
});
