import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

function BrownScreenGradient() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.base]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="brown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#812917" />
            <Stop offset="35%" stopColor="#4D190E" />
            <Stop offset="70%" stopColor="#B33A21" />
            <Stop offset="100%" stopColor="#802A17" />
          </LinearGradient>
        </Defs>

        <Rect width="100%" height="100%" fill="url(#brown-gradient)" />

        {/* Glow superior */}
        <Ellipse
          cx="82%"
          cy="14%"
          rx="160"
          ry="150"
          fill="#7A2A1A"
          opacity="0.16"
        />

        {/* Glow inferior */}
        <Ellipse
          cx="18%"
          cy="84%"
          rx="230"
          ry="200"
          fill="#4D190E"
          opacity="0.18"
        />

        {/* Sombra central */}
        <Ellipse
          cx="50%"
          cy="50%"
          rx="320"
          ry="240"
          fill="#000000"
          opacity="0.4"
        />
      </Svg>
    </View>
  );
}

export default BrownScreenGradient;

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#120403',
  },
});