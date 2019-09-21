// From https://github.com/kmagiera/react-native-reanimated/issues/232
// And the React Native Animated library

import * as React from 'react';

export const sequence = (animations) => {
  let finished = false;
  let running = false;
  let current;
  
  return {
    start(complete) {
      running = true;
      
      run(animations, (next) => {
        current = next;
        
        return running;
      }, () => {
        finished = true;
        running = false;
        
        complete();
      });
    },
    
    stop() {
      running = false;
      
      if (current) {
        current.stop();
      }
    }
  };
};

const run = (animations, onNext, onComplete) => {
  const animation = animations.shift();
  
  if (!animation) {
    return onComplete();
  }
  
  if (!onNext(animation)) {
    return;
  }
  
  animation.start(() => run(animations, onNext, onComplete));
};

export const parallel = function (animations, config) {
  let doneCount = 0;
  // Make sure we only call stop() at most once for each animation
  const hasEnded = {};
  const stopTogether = !(config && config.stopTogether === false);
  
  const result = {
    start: function (callback) {
      if (doneCount === animations.length) {
        callback && callback({finished: true});
        return;
      }
      
      animations.forEach((animation, idx) => {
        const cb = function (endResult) {
          hasEnded[idx] = true;
          doneCount++;
          if (doneCount === animations.length) {
            doneCount = 0;
            callback && callback(endResult);
            return;
          }
          
          if (!endResult.finished && stopTogether) {
            result.stop();
          }
        };
        
        if (!animation) {
          cb({finished: true});
        } else {
          animation.start(cb);
        }
      });
    },
    
    stop: function () {
      animations.forEach((animation, idx) => {
        !hasEnded[idx] && animation.stop();
        hasEnded[idx] = true;
      });
    },
    
    reset: function () {
      animations.forEach((animation, idx) => {
        animation.reset();
        hasEnded[idx] = false;
        doneCount = 0;
      });
    },
    
    _startNativeLoop: function () {
      throw new Error(
        'Loops run using the native driver cannot contain Animated.parallel animations',
      );
    },
    
    _isUsingNativeDriver: function () {
      return false;
    },
  };
  
  return result;
};
