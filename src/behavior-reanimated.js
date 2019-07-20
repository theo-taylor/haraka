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

const defaultConfig = { type: 'spring', onComplete: ()=> console.log('Animation completed') };

class Behaviour extends React.PureComponent {
  ref = React.createRef();
  
  static defaultProps = {
    clamp: false,
    clearStyleProps: false,
    config: defaultConfig,
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
    const {initialState} = props;
    
    this.nativeDriver = new Value(initialState);
    
    this.nativeStyles = {};
    
    this.setNativeStyles();
    
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
  
  goTo = (nextCurrentState)=> {
    const {
      config,
    } = this.props;
    
    this.nativeDriverConfig = {
      duration: config.duration,
      toValue: nextCurrentState,
      easing: Easing.inOut(Easing.ease),
    };
    this.nativeDriverAnim = timing(this.nativeDriver, this.nativeDriverConfig);
    sequence([this.nativeDriverAnim]).start(() => {
      defaultConfig.onComplete();
    });
  };
  
  componentWillReceiveProps(nextProps, nextContext) {
    const {currentState} = this.props;
    const {currentState: nextCurrentState,} = nextProps;
    if (currentState !== nextCurrentState) this.goTo(nextCurrentState); // Only run if current state has been updated
  }
  
  render() {
    const {children, style} = this.props;
    return (
      <Animated.View
        ref={this.ref}
        style={[style, this.nativeStyles]}>
        {children}
      </Animated.View>
    );
  }
}

export default Behaviour;
