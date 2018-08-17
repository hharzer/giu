// @noflow

/* eslint-disable no-underscore-dangle, max-len, react/default-props-match-prop-types */

import React from 'react';
import { omit, merge, addDefaults } from 'timm';
import { cancelEvent, stopPropagation } from '../gral/helpers';
import { COLORS, MISC, IS_IOS, FONTS } from '../gral/constants';
import { scrollIntoView } from '../gral/visibility';
import { isDark } from '../gral/styles';
import { isRequired } from '../gral/validators';
import type { Validator } from '../gral/validators';
import type { Command, KeyboardEventPars } from '../gral/types';
import { ThemeContext } from '../gral/themeContext';
import type { Theme } from '../gral/themeContext';
import {
  floatAdd,
  floatDelete,
  floatUpdate,
  floatReposition,
  warnFloats,
} from '../components/floats';
import type { FloatPosition, FloatAlign } from '../components/floats';
import FocusCapture from '../components/focusCapture';
import IosFloatWrapper from '../inputs/iosFloatWrapper';

// ==========================================
// Declarations
// ==========================================
// Configuration object, passed to the HOC along with the
// component to be wrapped
type HocOptions = {|
  toInternalValue?: (extValue: any, hocProps: Object) => any,
  toExternalValue?: (intValue: any, hocProps: Object) => any,
  isNull: (intValue: any) => boolean,
  valueAttr?: string,
  fIncludeFocusCapture?: boolean,
  defaultValidators?: { [key: string]: Validator },
  validatorContext?: any,
  trappedKeys?: Array<number>,
  className?: string, // wrapper class name
  fIncludeClipboardProps?: boolean,
|};

// Public props used by the HOC itself. Some of them are passed down
// unmodified (see list), others might be modified, others are simply not passed.
// Note that other props provided by the user are always passed through.
/* eslint-disable no-unused-vars */
type HocPublicProps = {
  /* eslint-enable no-unused-vars */
  value?: any,
  errors?: Array<string>,
  required?: boolean, // passed through unchanged
  validators?: Array<Validator>,
  noErrors?: boolean,
  cmds?: Array<Command>, // passed through unchanged
  disabled?: boolean, // passed through unchanged
  floatZ?: number, // passed through unchanged
  floatPosition?: FloatPosition, // passed through unchanged
  focusOnChange?: boolean,
  errorZ?: number,
  errorPosition?: FloatPosition,
  errorAlign?: FloatAlign,
  onChange?: (ev: SyntheticEvent<*>, extValue: any) => any,
  onFocus?: (ev: SyntheticEvent<*>) => any,
  onBlur?: (ev: SyntheticEvent<*>) => any,
  styleOuter?: Object,
  // all others are passed through unchanged
};

// This list should match the keys in HocPublicProps!
const HOC_PUBLIC_PROPS = [
  'value',
  'errors',
  'required',
  'validators',
  'noErrors',
  'cmds',
  'disabled',
  'floatZ',
  'floatPosition',
  'focusOnChange',
  'errorZ',
  'errorPosition',
  'errorAlign',
  'onChange',
  'onFocus',
  'onBlur',
  'styleOuter',
];

// Don't pass these HOC props to an <input>
const INPUT_HOC_INVALID_HTML_PROPS = [
  'curValue',
  'registerOuterRef',
  'registerFocusableRef',
  'cmds',
  'errors',
  'keyDown',
  'fFocused',
  'floatZ',
  'floatPosition',
  'onResizeOuter',
  'styleOuter',
  'theme',
];

// Defaults for some of the HOC's public props
type DefaultsForHocPublicProps = {
  errors: Array<string>,
  validators: Array<Validator>,
  focusOnChange: boolean,
};

// Props generated or regenerated by the HOC
type HocGeneratedProps = {
  registerOuterRef: Function,
  registerFocusableRef: Function,
  curValue: any,
  keyDown: KeyboardEventPars,
  fFocused: boolean,
  onChange: (
    ev: SyntheticEvent<*>,
    providedValue: any,
    options?: { fDontFocus?: boolean }
  ) => any,
  onFocus: Function,
  onBlur: Function,
  onCopy: Function,
  onCut: Function,
  onPaste: Function,
  onResizeOuter: Function,
  styleOuter: Object,
  // Context
  theme: Theme,
};

type Props = {
  ...$Exact<HocPublicProps>,
  // Makes props with available defaults non-optional internally,
  // so we don't need to check for their existence
  ...$Exact<DefaultsForHocPublicProps>,
};

type PublicProps<P> = {
  ...$Exact<P>,
  ...$Exact<HocPublicProps>,
};

type PublicDefaultProps<DP> = {
  ...$Exact<DP>,
  ...$Exact<DefaultsForHocPublicProps>,
  ...$Exact<HocGeneratedProps>,
};

// ==========================================
// HOC
// ==========================================
// **IMPORTANT**: must be the outermost HOC (i.e. closest to the
// user), for the imperative API to work. Otherwise, please forward
// the imperative calls to this HOC.
function input<DP: any, P>(
  ComposedComponent: Class<React$Component<DP, P, *>>,
  hocOptions: HocOptions
): Class<React$Component<PublicDefaultProps<DP>, PublicProps<P>, *>> {
  const {
    toInternalValue = o => o,
    toExternalValue = o => o,
    isNull,
    valueAttr = 'value',
    fIncludeFocusCapture = false,
    defaultValidators = {},
    validatorContext,
    trappedKeys = [],
    className,
    fIncludeClipboardProps: fIncludeClipboardProps0,
  } = hocOptions;
  const fIncludeClipboardProps =
    fIncludeClipboardProps0 != null
      ? fIncludeClipboardProps0
      : fIncludeFocusCapture;
  const composedComponentName =
    ComposedComponent.displayName || ComposedComponent.name || 'Component';
  const hocDisplayName = `Input(${composedComponentName})`;

  class Klass extends React.PureComponent {
    static displayName = hocDisplayName;
    static defaultProps: DefaultsForHocPublicProps = {
      focusOnChange: true,
      errors: ([]: Array<string>),
      validators: ([]: Array<Validator>),
    };
    props: Props;
    curValue: any;
    prevValue: any;
    validationErrors: Array<?string>;
    errors: Array<?string>; // = this.props.errors (user-provided) + this.validationErrors
    prevErrors: Array<?string>;
    errorFloatId: ?string;
    lastValidatedValue: any;
    fFocused: boolean;
    pendingFocusBlur: null | 'FOCUS' | 'BLUR';
    keyDown: ?KeyboardEventPars;
    refOuter: ?Object;
    refFocusable: ?Object;

    constructor(props: Props) {
      super(props);
      this.curValue = toInternalValue(props.value, props);
      this.prevValue = this.curValue;
      this.resetErrors(props);
      this.fFocused = false;
      this.keyDown = null;
    }

    componentDidMount() {
      warnFloats(hocDisplayName);
      this.renderErrorFloat();
    }

    componentWillReceiveProps(nextProps: Props) {
      const { value, errors, cmds } = nextProps;
      if (value !== this.props.value) {
        this.setCurValue(toInternalValue(value, nextProps));
      }
      if (errors !== this.props.errors) this.recalcErrors(nextProps);
      if (cmds !== this.props.cmds) this.processCmds(cmds, nextProps);
    }

    componentDidUpdate(prevProps: Props) {
      const { value } = this.props;
      const { curValue, prevValue } = this;
      if (
        this.errors !== this.prevErrors ||
        value !== prevProps.value ||
        curValue !== prevValue
      ) {
        this.renderErrorFloat();
      }
      if (this.pendingFocusBlur) {
        // execute `FOCUS` and `BLUR` commands asynchronously, so that the owner
        // of the Input component doesn't find a `null` ref in a `focus`/`blur` handler
        setTimeout(() => {
          if (!this.pendingFocusBlur) return;
          if (this.pendingFocusBlur === 'FOCUS') this._focus();
          else if (this.pendingFocusBlur === 'BLUR') this._blur();
          this.pendingFocusBlur = null;
        });
      }
      this.prevValue = this.curValue;
      this.prevErrors = this.errors;
    }

    componentWillUnmount() {
      if (this.errorFloatId != null) floatDelete(this.errorFloatId);
    }

    // ==========================================
    // Imperative API (via props or directly)
    // ==========================================
    processCmds(cmds: ?Array<Command>, nextProps: Props) {
      if (cmds == null) return;
      cmds.forEach(cmd => {
        switch (cmd.type) {
          case 'SET_VALUE':
            this.setCurValue(toInternalValue(cmd.value, nextProps));
            break;
          case 'REVERT':
            this.resetErrors(nextProps);
            this.setCurValue(toInternalValue(nextProps.value, nextProps));
            break;
          case 'VALIDATE':
            this._validate().catch(() => {});
            break;
          case 'FOCUS':
            this.pendingFocusBlur = 'FOCUS';
            break;
          case 'BLUR':
            this.pendingFocusBlur = 'BLUR';
            break;
          default:
            break;
        }
      });
    }

    // Alternative to using the `onChange` prop (e.g. if we want to delegate
    // state handling to the input and only want to retrieve the value when submitting a form)
    getValue() {
      return toExternalValue(this.curValue, this.props);
    }
    getErrors() {
      return this.errors;
    }
    validateAndGetValue() {
      return this._validate().then(() => this.getValue());
    }

    // ==========================================
    // Render
    // ==========================================
    render() {
      return (
        <span
          className={className}
          onMouseDown={
            fIncludeFocusCapture ? this.onMouseDownWrapper : undefined
          }
          onClick={fIncludeFocusCapture ? this.onClickWrapper : undefined}
          style={style.wrapper(this.props)}
        >
          {this.renderFocusCapture()}
          {this.renderIosErrors()}
          {this.renderComponent()}
        </span>
      );
    }

    renderFocusCapture() {
      if (!fIncludeFocusCapture) return null;
      return (
        <FocusCapture
          registerRef={this.registerFocusableRef}
          disabled={this.props.disabled}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onCopy={this.onCopyCut}
          onCut={this.onCopyCut}
          onPaste={this.onPaste}
          onKeyDown={this.onKeyDown}
        />
      );
    }

    renderIosErrors() {
      if (!IS_IOS) return null;
      const { errors } = this;
      if (!errors.length) return null;
      const { position, align, zIndex } = this.calcFloatPosition();
      return (
        <IosFloatWrapper
          floatPosition={position}
          floatAlign={align}
          floatZ={zIndex}
        >
          {this.renderErrors()}
        </IosFloatWrapper>
      );
    }

    renderComponent() {
      const otherProps = omit(this.props, HOC_PUBLIC_PROPS);
      return (
        <ComposedComponent
          registerOuterRef={this.registerOuterRef}
          registerFocusableRef={
            fIncludeFocusCapture ? undefined : this.registerFocusableRef
          }
          {...otherProps}
          curValue={this.curValue}
          errors={this.errors}
          required={this.props.required}
          cmds={this.props.cmds}
          keyDown={this.keyDown}
          disabled={this.props.disabled}
          fFocused={this.fFocused}
          floatZ={this.props.floatZ}
          floatPosition={this.props.floatPosition}
          onChange={this.onChange}
          onFocus={fIncludeFocusCapture ? undefined : this.onFocus}
          onBlur={fIncludeFocusCapture ? undefined : this.onBlur}
          onCopy={fIncludeClipboardProps ? this.onCopyCut : undefined}
          onCut={fIncludeClipboardProps ? this.onCopyCut : undefined}
          onPaste={fIncludeClipboardProps ? this.onPaste : undefined}
          onResizeOuter={floatReposition}
          styleOuter={fIncludeFocusCapture ? undefined : this.props.styleOuter}
        />
      );
    }

    renderErrorFloat = () => {
      if (IS_IOS) return;
      const { errors } = this;

      // Remove float
      if (!errors.length && this.errorFloatId != null) {
        floatDelete(this.errorFloatId);
        this.errorFloatId = null;
        return;
      }

      // Create or update float
      // (if the `errorX` props are not set, spy on the pass-through `floatX` props for
      // hints on how to properly position the error float; e.g. if another float
      // will open `below`, position the error float `above`; also adjust `z-index`
      // to be below another float's level, so that it doesn't obscure the main float).
      if (errors.length) {
        const floatOptions = {
          ...this.calcFloatPosition(),
          getAnchorNode: () => this.refOuter || this.refFocusable,
          children: this.renderErrors(),
        };
        if (this.errorFloatId == null) {
          this.errorFloatId = floatAdd(floatOptions);
        } else {
          floatUpdate(this.errorFloatId, floatOptions);
        }
      }
    };

    renderErrors() {
      const { errors, curValue, lastValidatedValue } = this;
      // console.log(`Rendering; lastValidatedValue=${lastValidatedValue}, curValue=${curValue}, ` +
      //   `internal value for props.value=${toInternalValue(this.props.value, this.props)}`);
      const fModified =
        lastValidatedValue !== undefined
          ? curValue !== lastValidatedValue
          : curValue !== toInternalValue(this.props.value, this.props);
      return (
        <div style={style.errors(fModified, this.props.theme.id)}>
          {errors.join(' | ')}
        </div>
      );
    }

    // ==========================================
    // Handlers
    // ==========================================
    registerOuterRef = (c: ?Object) => {
      this.refOuter = c;
    };
    registerFocusableRef = (c: ?Object) => {
      this.refFocusable = c;
    };

    setCurValue(curValue: any) {
      if (curValue === this.curValue) return;
      this.curValue = curValue;
      this.forceUpdate();
    }

    onChange = (
      ev: SyntheticEvent<*>,
      providedValue: any,
      options: { fDontFocus?: boolean } = {}
    ) => {
      const { onChange, disabled } = this.props;
      if (disabled) return;
      let curValue = providedValue;
      if (curValue === undefined) {
        const currentTarget: any = ev.currentTarget; // eslint-disable-line
        curValue = currentTarget[valueAttr];
      }
      this.setCurValue(curValue);
      if (onChange) onChange(ev, toExternalValue(curValue, this.props));
      if (this.props.focusOnChange && !this.fFocused && !options.fDontFocus) {
        this._focus();
      }
    };

    onFocus = (ev: SyntheticEvent<*>) => {
      const { onFocus, disabled } = this.props;
      if (disabled) {
        this._blur();
        return;
      }
      if (this.refOuter) scrollIntoView(this.refOuter);
      this.changedFocus(true);
      if (onFocus) onFocus(ev);
    };

    onBlur = (ev: SyntheticEvent<*>) => {
      const { onBlur } = this.props;
      this._validate().catch(() => {});
      this.changedFocus(false);
      if (onBlur) onBlur(ev);
    };

    onMouseDownWrapper = (ev: SyntheticEvent<*>) => {
      // Always cancel mousedowns: they blur the component. If they are interesting,
      // capture them at a lower level
      cancelEvent(ev);

      // If not focused, a mouse-down should focus the component and cancel the event
      if (this.fFocused) return;
      this._focus();
    };

    // Cancel bubbling of click events; they may reach Modals
    // on their way up and cause the element to blur.
    // Allow free propagation if the element is disabled.
    onClickWrapper = (ev: SyntheticEvent<*>) => {
      if (!this.props.disabled) stopPropagation(ev);
    };

    onKeyDown = (ev: SyntheticKeyboardEvent<*>) => {
      const { which, keyCode, metaKey, shiftKey, altKey, ctrlKey } = ev;
      if (trappedKeys.indexOf(which) < 0) return;
      this.keyDown = { which, keyCode, metaKey, shiftKey, altKey, ctrlKey };
      this.forceUpdate();
    };

    onCopyCut = (ev: SyntheticClipboardEvent<*>) => {
      ev.clipboardData.setData('text/plain', this.curValue);
      ev.preventDefault();
    };

    onPaste = (ev: SyntheticClipboardEvent<*>) => {
      const nextValue = ev.clipboardData.getData('text/plain');
      ev.preventDefault();
      this.onChange(ev, nextValue);
    };

    // ==========================================
    // Helpers
    // ==========================================
    _focus() {
      if (this.refFocusable && this.refFocusable.focus) {
        this.refFocusable.focus();
      }
    }

    _blur() {
      if (this.refFocusable && this.refFocusable.blur) {
        this.refFocusable.blur();
      }
    }

    changedFocus(fFocused: boolean) {
      if (fFocused === this.fFocused) return;
      this.fFocused = fFocused;
      this.forceUpdate();
    }

    _validate() {
      const { noErrors } = this.props;
      if (noErrors) return Promise.resolve();
      let validators;
      if (this.props.validators.length) {
        validators = merge({}, defaultValidators);
        let cnt = 0;
        this.props.validators.forEach(validator => {
          validators[validator.id || `anon_${cnt}`] = validator;
          cnt += 1;
        });
      } else {
        validators = defaultValidators;
      }
      const { curValue: internalValue } = this;
      const externalValue = toExternalValue(internalValue, this.props);
      const fRequired = this.props.required || validators.isRequired != null;
      const fIsNull = isNull(internalValue);

      // If `null` is allowed and input is `null`, bail out
      if (!fRequired && fIsNull) return Promise.resolve();

      const pErrors = []; // promised errors

      // If input is null (unallowed), get the corresponding message and bail out
      if (fIsNull) {
        const validator = validators.isRequired || isRequired();
        if (validator.getErrorMessage) {
          pErrors.push(validator.getErrorMessage(internalValue));
        }

        // Otherwise, collect all validator errors (skipping `isRequired`)
      } else {
        Object.keys(validators).forEach(id => {
          if (id === 'isRequired') return;
          const validator: Validator = validators[id];
          const validate =
            typeof validator === 'function' ? validator : validator.validate;
          if (typeof validate === 'function') {
            const value = validator.fInternal ? internalValue : externalValue;
            const pError = validate(value, this.props, validatorContext);
            if (pError != null) pErrors.push(pError);
          }
        });
      }

      // When all promises have resolved, change the current state
      return Promise.all(pErrors).then(validationErrors0 => {
        const validationErrors = validationErrors0.filter(o => o != null);
        const prevLastValidatedValue = this.lastValidatedValue;
        this.lastValidatedValue = internalValue;
        if (
          this.lastValidatedValue !== prevLastValidatedValue ||
          validationErrors.join('') !== this.validationErrors.join('') // string compare
        ) {
          this.validationErrors = validationErrors;
          this.recalcErrors(this.props);
          this.forceUpdate();
        }
        if (validationErrors.length) {
          const exception = new Error('VALIDATION_ERROR');
          // $FlowFixMe (piggybacking data on an exception might not be a good idea)
          exception.errors = validationErrors;
          throw exception;
        }
      });
    }

    resetErrors(props: Props) {
      this.validationErrors = [];
      this.lastValidatedValue = undefined;
      this.recalcErrors(props);
      this.prevErrors = this.errors;
    }

    recalcErrors(props: Props) {
      this.errors = props.errors.concat(this.validationErrors);
    }

    calcFloatPosition() {
      const {
        floatZ,
        floatPosition,
        errorZ,
        errorPosition,
        errorAlign,
      } = this.props;
      let zIndex = errorZ;
      if (zIndex == null) {
        zIndex =
          floatZ != null
            ? floatZ - MISC.zErrorFloatDelta
            : MISC.zErrorFloatDelta;
      }
      let position = errorPosition;
      if (position == null) {
        position = floatPosition === 'below' ? 'above' : 'below';
      }
      return { position, align: errorAlign, zIndex };
    }
  }

  // ==========================================
  // $FlowFixMe
  const ThemedKlass = React.forwardRef((props, ref) => (
    <ThemeContext.Consumer>
      {theme => <Klass {...props} theme={theme} ref={ref} />}
    </ThemeContext.Consumer>
  ));

  return (ThemedKlass: any);
}

// ==========================================
// Styles
// ==========================================
const errorBgColorBase = COLORS.notifs.error;
const errorFgColorBase =
  COLORS[isDark(errorBgColorBase) ? 'lightText' : 'darkText'];
const errorBgColorModified = COLORS.notifs.warn;
const errorFgColorModified =
  COLORS[isDark(errorBgColorModified) ? 'lightText' : 'darkText'];
const style = {
  wrapper: ({ styleOuter }) => {
    let out = styleOuter || {};
    out = addDefaults(out, {
      position: 'relative',
      display: 'inline-block',
    });
    return out;
  },
  errors: (fModified, theme) => ({
    padding: '1px 3px',
    backgroundColor: fModified ? errorBgColorModified : errorBgColorBase,
    color: fModified ? errorFgColorModified : errorFgColorBase,
    fontFamily: theme === 'mdl' ? FONTS.mdl : undefined,
  }),
};

// ==========================================
// Public
// ==========================================
export default input;
export { INPUT_HOC_INVALID_HTML_PROPS };
