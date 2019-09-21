import * as React from 'react';
import Animated, {Easing} from "react-native-reanimated";

import {sequence} from "./ReAnimated";

const {
  Extrapolate,
  Value,
  concat,
  spring,
  timing,
} = Animated;

const PRESETS = {
  faded: [{ opacity: 0 }, { opacity: 1 }],
};

const LAYOUT_PRESETS = {
  absolute: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  centered: { alignSelf: 'center' },
  fixed: { position: 'absolute' },
  full: { flex: 1 },
  landing: { alignItems: 'center', flex: 1, justifyContent: 'center' },
};

const PROPS = [
  { prop: 'opacity', default: 1 },
  { prop: 'rotate', default: '0deg', transform: true },
  { prop: 'scale', default: 1, transform: true },
  { prop: 'translateX', default: 0, transform: true },
  { prop: 'translateY', default: 0, transform: true },
];

class Behaviour extends React.PureComponent {
  ref = React.createRef();
  
  static defaultProps = {
    clamp: false,
    clearStyleProps: false,
    config: { type: 'spring', onComplete: ()=> console.log('Animation completed') },
    currentState: 0,
    disabled: false,
    initialState: 0,
    skipProps: [],
    skipStyleProps: [],
    state: [{}, {}],
    style: {},
    styleProps: [],
    unmounted: false,
  };
  
  constructor(props) {
    super(props);
    const { initialState, unmounted } = this.props;
    
    this.nativeDriver = new Value(initialState);
    
    this.key = initialState;
    
    this.nativeStyles = {};
    
    this.setNativeStyles();
  
    this.delay = new Value(0);
    
    this.state = {
      mounted: !unmounted,
    };
    
  }
  
  setNativeStyles = ()=> {
    const {
      clamp,
      clearStyleProps,
      keys,
      skipStyleProps = [],
      state,
      style,
      styleProps = [],
    } = this.props;
    
    const inputRange =
      keys ||
      Array(state.length)
        .fill()
        .map((_, index) => index);
    
    if (inputRange.length === 1) {
      inputRange.push(1);
      state.push({})
    }
    
    const getRange = (prop, defaultValue) => {
      return state.reduce((range, currentState, index) => {
        const prevState = range[index - 1];
        const val = currentState[prop] || currentState[prop] === 0
          ? currentState[prop]
          : prevState || prevState === 0
            ? prevState
            : style[prop] || style[prop] === 0
              ? style[prop]
              : defaultValue;
        range.push(
          // Very weird issue with rotate, have to remove 'deg'
          prop === 'rotate'? Number(val.toString().replace('deg', '')) : val
        );
        return range
      }, []);
    };
    
    const addProp = (prop, defaultValue) => {
      return this.nativeDriver.interpolate({
        inputRange,
        outputRange: getRange(prop, defaultValue),
        extrapolate: clamp ? Extrapolate.CLAMP : undefined,
      });
    };
    
    const defaultStyleProps = clearStyleProps ? [] : PROPS;
    
    const allStyleProps = [...defaultStyleProps, ...styleProps];
    
    allStyleProps.forEach(({ prop, default: defaultValue, transform }) => {
      if (!skipStyleProps.includes(prop)) {
        // Very weird issue with rotate, have to add 'deg'
        const val = prop === 'rotate'? concat(addProp(prop, defaultValue), 'deg') : addProp(prop, defaultValue);
        if (transform) {
          this.nativeStyles.transform = [
            ...(this.nativeStyles.transform || []),
            { [prop]: val },
          ]
        } else {
          this.nativeStyles[prop] = val
        }
      }
    });
  };
  
  componentDidMount() {
    const { disabled } = this.props;
    
    if (disabled) {
      this.disable()
    }
  }
  
  componentWillReceiveProps(nextProps, nextContext) {
    const { currentState, disabled } = this.props;
    const { currentState: nextCurrentState, disabled: nextDisabled } = nextProps;
    
    if (currentState !== nextCurrentState) {
      this.goTo(nextCurrentState)
    }
    
    if (!disabled && nextDisabled) {
      this.disable()
    } else if (disabled && !nextDisabled) {
      this.enable()
    }
  }
  
  mount = (state) => {
    const { initialState } = this.props;
    
    this.nativeDriver.setValue(state || initialState);
    
    this.setState({ mounted: true })
  };
  
  unmount = () => {
    this.setState({ mounted: false })
  };
  
  setNativeProps = (props) => {
    this.ref.current.setNativeProps(props)
  };
  
  disable = () => {
    this.setNativeProps({ pointerEvents: 'none' })
  };
  
  enable = () => {
    this.setNativeProps({ pointerEvents: 'auto' })
  };
  
  goTo = (key, config = {})=> {
    const isSequence = Array.isArray(key);
    
    const { config: defaultConfig, state } = this.props;
    
    const { config: stateConfig = {} } = isSequence ? {} : state[key];
    
    const { delay, duration, onComplete, ref, type, unmount, ...opts } = {
      ...defaultConfig,
      ...stateConfig,
      ...config,
    };
    
    const curve = type === 'timing' ? timing : spring;
  
    const animate = type === 'timing' ? {
      duration,
      toValue: key,
      easing: Easing.inOut(Easing.ease),
    } :  {
      stiffness: new Value(100),
      mass: new Value(1),
      damping: new Value(10),
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
      toValue: key,
    };
    
    if (isSequence) {
      const animations = [];
      key.forEach((toValue) => {
        const animate = type === 'timing' ? {
          duration,
          toValue,
          easing: Easing.inOut(Easing.ease),
        } :  {
          stiffness: new Value(100),
          mass: new Value(1),
          damping: new Value(10),
          overshootClamping: false,
          restSpeedThreshold: 0.001,
          restDisplacementThreshold: 0.001,
          toValue: key,
        };
        animations.push(
          curve(
            this.nativeDriver,
            animate,
          )
        )
      });
      
      this.key = animations[animations.length - 1];
      
      let animationRef = sequence(animations);
  
      if (delay) {
        this.delayAnim = timing(this.delay, {toValue: 1, duration: delay, easing: Easing.inOut(Easing.ease)});
        animationRef = sequence([this.delayAnim, animationRef])
      }
      
      if (ref) {
        return animationRef
      }
      
      sequence(animations).start(() => {
        if ( unmount) this.unmount();
        if (onComplete) onComplete()
      });
    }
    
    this.key = key;
  
    let animationRef = curve(this.nativeDriver, animate);
  
    if (delay) {
      this.delayAnim = timing(this.delay, {toValue: 1, duration: delay, easing: Easing.inOut(Easing.ease)});
      animationRef = sequence([this.delayAnim, animationRef])
    }
    
    if (ref) {
      return animationRef
    }
  
    animationRef.start(() => {
      if ( unmount) this.unmount();
      if (onComplete) onComplete();
    });
  };
  
  render() {
    const { mounted } = this.state;
    
    if (!mounted) {
      return null
    }
    
    const {
      absolute,
      centered,
      children,
      faded,
      fixed,
      full,
      landing,
      pointerEvents,
      skipProps,
      style,
      ...rest
    } = this.props;
  
    const viewStyles = {
      ...LAYOUT_PRESETS[absolute && 'absolute'],
      ...LAYOUT_PRESETS[centered && 'centered'],
      ...LAYOUT_PRESETS[fixed && 'fixed'],
      ...LAYOUT_PRESETS[full && 'full'],
      ...LAYOUT_PRESETS[landing && 'landing'],
    };
  
    const propStyles = Object.keys(rest).reduce((obj, key) => {
      if (skipProps.includes(key)) {
        return obj
      }
    
      return { ...obj, [key]: rest[key] }
    }, {});
    
    return (
      <Animated.View
        pointerEvents={pointerEvents}
        ref={this.ref}
        style={[style, {delay: this.delay}, viewStyles, propStyles, this.nativeStyles]}>
        {children}
      </Animated.View>
    );
  }
}

export default Behaviour;
