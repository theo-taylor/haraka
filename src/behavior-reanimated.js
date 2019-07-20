import * as React from 'react';
import Animated, {Easing} from "react-native-reanimated";

import {sequence} from "./ReAnimated";

const {
  Extrapolate,
  Value,
  concat,
  timing,
} = Animated;

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
    
    const curve = timing;// type === 'timing' ? timing : spring;
    
    const animate = {
      duration,
      toValue: key,
      easing: Easing.inOut(Easing.ease),
    };
    
    if (isSequence) {
      const animations = [];
      
      console.log(key);
      
      key.forEach((toValue) => {
        const animate = {
          duration,
          toValue,
          easing: Easing.inOut(Easing.ease),
        };
        animations.push(
          curve(
            this.nativeDriver,
            animate,
          )
        )
      });
      
      this.key = animations[animations.length - 1];
      
      //let animationRef = Animated.sequence(animations);
      
      if (delay) {
        //animationRef = Animated.sequence([Animated.delay(delay), animationRef])
      }
      
      if (ref) {
        //return animationRef
      }
      
      sequence(animations).start(() => {
        if ( unmount) this.unmount();
        if (onComplete) onComplete()
      });
    }
    
    this.key = key;
    
    //let animationRef = animate(key);
    
    if (delay) {
      //animationRef = Animated.sequence([Animated.delay(delay), animationRef])
    }
    
    if (ref) {
      //return animationRef
    }
    
    const animations = curve(this.nativeDriver, animate);
    animations.start();
  };
  
  render() {
    const { mounted } = this.state;
    
    if (!mounted) {
      return null
    }
    
    const {
      children,
      pointerEvents,
      style,
    } = this.props;
    
    return (
      <Animated.View
        pointerEvents={pointerEvents}
        ref={this.ref}
        style={[style, this.nativeStyles]}>
        {children}
      </Animated.View>
    );
  }
}

export default Behaviour;
