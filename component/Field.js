import React from "react";
import { TextInput, Platform } from "react-native";
import { darkGreen } from "./Constants";

const Field = (props) => {
  return (
    <TextInput
      {...props}
      style={[
        {
          borderRadius: 100,
          color: darkGreen,
          paddingHorizontal: 14,
          height: 46,
          backgroundColor: "rgb(220,220,220)",
          marginVertical: 10,
        },
        props.style,
      ]}
      placeholderTextColor={darkGreen}
      keyboardDismissMode="interactive"
      returnKeyType={props.returnKeyType || "next"}
      blurOnSubmit={false}
      importantForAutofill="yes"
      autoCorrect={false}
      autoCapitalize="none"
      underlineColorAndroid="transparent"
    />
  );
};

export default Field;
