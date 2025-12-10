import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { Formik } from "formik";
import axios from "axios";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { resetToMainTabs } from "../../../navserviceRef";
import { Ionicons } from "@expo/vector-icons"; // Use Ionicons from @expo/vector-icons
import { API_BASE_URL } from "../../../config";
import inputLoginArr from "./LoginArr";
import generateValidationSchema from "../../../component/GenrateValidationSchema/genrateValidationSchema";
import genrateInitalValues from "../../../component/genrateInitialValues/InitialValues";
import LoadingSpinner from "../../../component/LoadingSpinner/LoadingSpinner";
import { darkGreen } from "../../../component/Constants";
import Btn from "../../../component/Btn";
import { DataContext } from "../../../context";

const Login = ({ navigation }) => {
  const validationSchema = generateValidationSchema(inputLoginArr);
  const initialValues = genrateInitalValues(inputLoginArr);
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false); 
  const { checkSession } = useContext(DataContext);
  const goToChats = () => resetToMainTabs("Chats");
  useEffect(() => {
    (async () => {
      try {
        const existing = await AsyncStorage.getItem("refreshToken");
        if (!existing) return;
        const fresh = await checkSession(); 
        if (fresh) goToChats();
      } catch {
      }
    })();
  }, []);

  const doLogin = async (values) => {
    try {
      setSubmitting(true);

      const res = await axios.post(`${API_BASE_URL}/login/`, values, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const refreshToken = res?.data?.refreshToken;
      if (!refreshToken) throw new Error("No refresh token received");

      await AsyncStorage.setItem("refreshToken", refreshToken);

      const fresh = await checkSession();
      if (!fresh) throw new Error("Could not refresh session after login");

      Toast.show({ type: "success", text1: "Welcome back!" });
      goToChats(); 
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2:
          error?.response?.data?.error ||
          error?.message ||
          "Invalid username or password",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Toast />
        <View style={styles.card}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logo}
          />
          <Text style={styles.appTitle}>SM Expert</Text>
          <Text style={styles.subTitle}>Login to continue</Text>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={doLogin}
          >
            {(props) => (
              <View style={{ width: "100%" }}>
                {inputLoginArr.map((element, index) => {
                  const name = element.name;
                  const isPassword = name === "password";
                  const showError = props.touched[name] && props.errors[name];
                  const borderColor = showError
                    ? "red"
                    : props.touched[name]
                      ? darkGreen
                      : "#ccc";

                  return (
                    <View key={index} style={{ marginBottom: 18 }}>
                      <TextInput
                        style={[styles.input, { borderColor }]}
                        placeholder={element.placeholder}
                        placeholderTextColor="#999"
                        onChangeText={props.handleChange(name)}
                        onBlur={props.handleBlur(name)}
                        value={props.values[name] ?? ""}
                        secureTextEntry={isPassword && !passwordVisible} // Toggle password visibility
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete={name === "email" ? "email" : "off"}
                        keyboardType={
                          name === "email" ? "email-address" : "default"
                        }
                        returnKeyType={
                          index === inputLoginArr.length - 1 ? "done" : "next"
                        }
                        onSubmitEditing={() => {
                          if (index === inputLoginArr.length - 1)
                            props.handleSubmit();
                        }}
                      />
                      {isPassword && (
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => setPasswordVisible(!passwordVisible)}
                        >
                          <Ionicons
                            name={passwordVisible ? "eye-off" : "eye"}
                            size={24}
                            color={darkGreen}
                          />
                        </TouchableOpacity>
                      )}
                      {showError && (
                        <Text style={styles.errorText}>
                          {props.errors[name]}
                        </Text>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {submitting ? (
                  <LoadingSpinner />
                ) : (
                  <Btn
                    width={"100%"}
                    textColor="white"
                    bgColor={darkGreen}
                    btnLabel="Login"
                    Press={props.handleSubmit}
                  />
                )}

                <View style={{ marginTop: 40, alignItems: "center" }}>
                  <Text style={{ color: "#888", fontSize: 13 }}>
                    Login access is managed by Admin Panel
                  </Text>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  logo: { width: 80, height: 80, marginBottom: 15, resizeMode: "contain" },
  appTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: darkGreen,
    marginBottom: 6,
  },
  subTitle: { fontSize: 16, color: "#666", marginBottom: 25 },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#666",
  },
  errorText: { fontSize: 13, color: "red", marginTop: 4 },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 5,
    padding: 10,
  },
  forgotPasswordText: {
    color: "#007BFF",
    marginTop: "-5px",
    fontSize: 14,
    textAlign: "right",
  },

});

export default Login;
