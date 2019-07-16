import * as React from 'react';
import {View} from 'react-native'
import Animated, {Easing} from "react-native-reanimated";

import {parallel, sequence} from "./ReAnimated";

const {
  Value,
  timing,
} = Animated;

// TODO: Use default states in case none are provided
const defaultState = {scale: 1, /*rotate: 0, opacity: 1, translateX: 0, translateY: 0*/};

class Behaviour extends React.PureComponent {
  constructor(props) {
    super(props);
    const {state: animationStates, currentState, initialState} = props;
    const initialValues = animationStates[initialState || currentState || 0];
    this.scale = new Value(initialValues.scale);
    this.transX = new Value(initialValues.translateX);
    this.opacity = new Value(initialValues.opacity);
  }
  
  run = (nextProps)=> {
    const {currentState, state: animationStates, config, } = this.props;
    const {currentState: nextCurrentState, } = nextProps;
    let duration = config.duration || 1000;
    
    const delta = Math.abs(currentState - nextCurrentState);
    
    if (delta > 1) {// is sequence
      const animations = [];
      duration = duration/delta;
      const includedStates = [];
      
      /* set which states we need to iterate through */
      if (nextCurrentState > currentState){ // increasing
        for (let i = currentState; i < nextCurrentState; i++){
          includedStates.push(i + 1);
        }
      } else if (nextCurrentState < currentState){ // decreasing
        
        for (let i = currentState; i > nextCurrentState; i--){
          includedStates.push(i - 1);
        }
      }
      
      /* create a parallel animation for each state then push to the animations array to be animated in sequence */
      for (let i = 0; i < includedStates.length; i++) {// runs for each parallel animation
        const stateToPush = animationStates[includedStates[i]];
        this.scaleConfig = {
          duration,
          toValue: stateToPush.scale,
          easing: Easing.inOut(Easing.ease),
        };
        this.scaleAnim = timing(this.scale, this.scaleConfig);
        
        this.transXConfig = {
          duration,
          toValue: stateToPush.translateX,
          easing: Easing.inOut(Easing.ease),
        };
        this.transXAnim = timing(this.transX, this.transXConfig);
        
        this.opacityConfig = {
          duration,
          toValue: stateToPush.opacity,
          easing: Easing.inOut(Easing.ease),
        };
        this.opacityAnim = timing(this.opacity, this.opacityConfig);
        
        const p = parallel([this.scaleAnim, this.opacityAnim, this.transXAnim]);
        animations.push(p);
      }
      
      sequence(animations).start(()=> {});
    } else {
      
      this.scaleConfig = {
        duration,
        toValue: animationStates[nextCurrentState].scale,
        easing: Easing.inOut(Easing.ease),
      };
      this.scaleAnim = timing(this.scale, this.scaleConfig);
      
      this.transXConfig = {
        duration,
        toValue: animationStates[nextCurrentState].translateX,
        easing: Easing.inOut(Easing.ease),
      };
      this.transXAnim = timing(this.transX, this.transXConfig);
      
      this.opacityConfig = {
        duration,
        toValue: animationStates[nextCurrentState].opacity,
        easing: Easing.inOut(Easing.ease),
      };
      this.opacityAnim = timing(this.opacity, this.opacityConfig);
      
      parallel([this.scaleAnim, this.opacityAnim, this.transXAnim]).start(()=> {});
    }
    
  };
  
  componentWillUpdate(nextProps, nextState, nextContext) {
    const {currentState} = this.props;
    const {currentState: nextCurrentState, } = nextProps;
    if (currentState !== nextCurrentState) this.run(nextProps); // Only run if current state has been updated
  }
  
  render() {
    const {children, style} = this.props;
    return (
      <View style={style}>
        <Animated.View
          style={{
            opacity:this.opacity,
            transform: [
              {scale: this.scale},
              {translateX: this.transX}
            ]
          }}>
          {children}
        </Animated.View>
      </View>
    );
  }
}

export default Behaviour;
