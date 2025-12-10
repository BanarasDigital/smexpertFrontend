// LoginPage.js
import React, { useContext, useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Formik } from "formik";
import axios from "axios";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { darkGreen } from "../Constants";
import Btn from "../Btn";
import Background from "../Background";
import { API_BASE_URL } from "../../config";
import generateValidationSchema from "../GenrateValidationSchema/genrateValidationSchema";
import inputLoginArr from "./LoginArr";
import genrateInitalValues from "../genrateInitialValues/InitialValues";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { DataContext } from "../../context";
import { goToChats } from "../../navserviceRef";

const Login = () => {
  const validationSchema = generateValidationSchema(inputLoginArr);
  const initialValues = genrateInitalValues(inputLoginArr);
  const [submitting, setSubmitting] = useState(false);
  const { handleErrorFunc } = useContext(DataContext);

  const doLogin = async (values) => {
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/login/`, values, { headers: { "Content-Type": "application/json" } });
      const user = res?.data?.user;
      const access = res?.data?.token?.access;
      if (!user || !access) throw new Error("Invalid login response");

      await AsyncStorage.setItem("accessToken", access);
      await AsyncStorage.setItem("id", `${user.id}`);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      Toast.show({ type: "success", text1: "Welcome back!" });
      goToChats(); // root reset to MainTabs → Chats
    } catch (err) {
      handleErrorFunc?.(err);
      Toast.show({
        type: "error",
        text1: "Login failed",
        text2: err?.response?.data?.error || err?.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Background>
      <View style={{ marginTop: "15%" }}>
        <Toast ref={(ref) => Toast.setRef(ref)} />
      </View>
      <View style={{ alignItems: "center", width: 400, marginTop: "20%" }}>
        <View style={{ backgroundColor: "white", height: 700, width: 370, borderTopLeftRadius: 30, paddingTop: 30, alignItems: "center" }}>
          <Text style={{ fontSize: 40, color: darkGreen, fontWeight: "bold" }}>SM Expert</Text>
          <Text style={{ color: "grey", fontSize: 19, fontWeight: "bold", marginBottom: 20 }}>Login to your account</Text>

          <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={doLogin}>
            {(props) => (
              <View>
                {inputLoginArr.map((element, index) => {
                  const touched = props.touched[element.name];
                  const hasError = Boolean(props.errors[element.name] && touched);
                  const borderColor = hasError ? "red" : touched ? darkGreen : "black";
                  return (
                    <View key={element.name} style={{ marginBottom: 12 }}>
                      <TextInput
                        style={{
                          borderRadius: 10,
                          color: darkGreen,
                          paddingHorizontal: 10,
                          backgroundColor: "rgb(240,240,240)",
                          height: 50,
                          borderColor,
                          borderWidth: hasError || touched ? 2 : 1,
                        }}
                        placeholder={element.placeholder}
                        onChangeText={props.handleChange(element.name)}
                        onBlur={props.handleBlur(element.name)}
                        value={props.values[element.name] ?? ""}
                        secureTextEntry={element.name === "password"}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {hasError && <Text style={{ color: "red", marginTop: 4 }}>{props.errors[element.name]}</Text>}
                    </View>
                  );
                })}
                {submitting ? (
                  <LoadingSpinner />
                ) : (
                  <Btn textColor="white" bgColor={darkGreen} btnLabel="Login" Press={props.handleSubmit} />
                )}

                <View style={{ alignItems: "flex-end", width: "78%", paddingRight: 16, marginTop: 8 }}>
                  <Text style={{ color: darkGreen, fontWeight: "bold", fontSize: 16 }}>Forgot Password ?</Text>
                </View>

                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold" }}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => {/* route to Signup if present */}}>
                    <Text style={{ color: darkGreen, fontWeight: "bold", fontSize: 16 }}>Signup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </View>
    </Background>
  );
};

export default Login;
