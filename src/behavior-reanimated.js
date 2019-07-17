import * as React from 'react';
import Animated, {Easing} from "react-native-reanimated";

import {parallel, sequence} from "./ReAnimated";

const {
  Value,
  timing,
} = Animated;

const defaultState = {scale: 1, rotate: 0, opacity: 1, translateX: 0, translateY: 0};

class Behaviour extends React.PureComponent {
  constructor(props) {
    super(props);
    const {state, currentState, initialState} = props;
    const initialValues = state[initialState || currentState || 0];
    this.scale = new Value(initialValues.scale || defaultState.scale);
    this.rotate = new Value(initialValues.rotate || defaultState.rotate);
    this.transX = new Value(initialValues.translateX || defaultState.translateX);
    this.transY = new Value(initialValues.translateY || defaultState.translateY);
    this.opacity = new Value(initialValues.opacity || defaultState.opacity);
  }
  
  run = (nextProps) => {
    const {currentState, state, config} = this.props;
    const {currentState: nextCurrentState,} = nextProps;
    let duration = config.duration || 1000;
    
    const delta = Math.abs(currentState - nextCurrentState);
    
    const animations = [];
    duration = duration / delta;
    const includedStates = [];
    
    /* set which states we need to iterate through */
    if (nextCurrentState > currentState) { // increasing
      for (let i = currentState; i < nextCurrentState; i++) {
        includedStates.push(i + 1);
      }
    } else if (nextCurrentState < currentState) { // decreasing
      
      for (let i = currentState; i > nextCurrentState; i--) {
        includedStates.push(i - 1);
      }
    }
    
    /* create a parallel animation for each state then push to the animations array to be animated in sequence */
    for (let i = 0; i < includedStates.length; i++) {// runs for each parallel animation
      const stateToPush = includedStates[i] === 0 ?
        {...defaultState, ...state[0]} : state[includedStates[i]];
      const prevState = i > 0 ? state[includedStates[i - 1]] : {};
  
      const config = (prop) => {
        return  {
          duration,
          toValue: stateToPush[prop] || stateToPush[prop] === 0
            ? stateToPush[prop]
            : prevState && prevState.hasOwnProperty(prop)
              ? prevState[prop]
              : defaultState[prop],
          easing: Easing.inOut(Easing.ease),
        };
      };
      
      const scaleAnim = timing(this.scale, config('scale'));
      const transXAnim = timing(this.transX, config('translateX'));
      const transYAnim = timing(this.transY, config('translateY'));
      const opacityAnim = timing(this.opacity, config('opacity'));
      const pAnimations = parallel([scaleAnim, opacityAnim, transXAnim, transYAnim]);
      animations.push(pAnimations);
    }
    
    sequence(animations).start(() => {
    });
  };
  
  componentWillUpdate(nextProps, nextState, nextContext) {
    const {currentState} = this.props;
    const {currentState: nextCurrentState,} = nextProps;
    if (currentState !== nextCurrentState) this.run(nextProps); // Only run if current state has been updated
  }
  
  render() {
    const {children, style} = this.props;
    return (
      <Animated.View
        style={[style, {
          opacity: this.opacity,
          transform: [
            {scale: this.scale},
            {translateX: this.transX},
            {translateY: this.transY}
          ]
        }]}>
        {children}
      </Animated.View>
    );
  }
}

export default Behaviour;
