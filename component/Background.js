import React from 'react';
import {View, ImageBackground} from 'react-native';
import leaves from "../../assets/leaves.jpg";

const Background = ({ children }) => {
  return (
    <View>
      <ImageBackground source={leaves} style={{ height: '100%' }} />
      <View style={{ position: "absolute" }}>
        {children}
      </View>
    </View>
  );
}

export default Background;