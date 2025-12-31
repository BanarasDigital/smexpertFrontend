import {View, Text, TouchableOpacity} from 'react-native';
import React from 'react';

export default function Btn({bgColor, btnLabel, textColor, Press, width }) {
  return (
    <TouchableOpacity
    onPress={Press}
      style={{
        backgroundColor: bgColor,
        borderRadius:  10,
        alignItems: 'center',
        width: width ? width : 280,
        paddingVertical: 5,
        marginVertical: 10,
        
      }}>
      <Text style={{color: textColor, fontSize: 20, fontWeight: 'bold'}}>
        {btnLabel}
      </Text>
    </TouchableOpacity>
  );
}

const Btn2 = ({style, btnLabel, textColor, Press, width}) => {
  return (
      <TouchableOpacity
      onPress={Press}
        style={{
          // backgroundColor: "",
          borderRadius:  10,
          alignItems: 'center',
          width: width ? width : 280,
          paddingVertical: 5,
          borderColor : "green",
          borderWidth : 2,
          
          marginVertical: 10}}>
        <Text style={{color: textColor, fontSize: 15, fontWeight: 'bold'}}>
          {btnLabel}
        </Text>
      </TouchableOpacity>
    );
}

const Btn3 = ({style, btnLabel, textColor, Press, width}) => {
  return (
      <TouchableOpacity
      onPress={Press}
        style={{
          borderRadius:  10,
          alignItems: 'center',
          width: width ? width : 280,
          paddingVertical: 5,
          borderColor : "white",
          borderWidth : 2,
          marginVertical: 10}}>
        <Text style={{color: textColor, fontSize: 15, fontWeight: 'bold'}}>
          {btnLabel}
        </Text>
      </TouchableOpacity>
    );
}

export { Btn2, Btn3 }
