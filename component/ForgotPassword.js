import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import axios from "axios";
import Toast from "react-native-toast-message";
import { API_BASE_URL } from "../config";
import { useContext } from "react";
import { DataContext } from "../context";

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const { apiPostPublic } = useContext(DataContext);
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return Toast.show({ type: "error", text1: "Enter your email" });
    }

    const res = await apiPostPublic("/forgot-password", { email });

    if (res?.success) {
      Toast.show({ type: "success", text1: "OTP sent to email" });
      setTimeout(() => navigation.navigate("ResetPassword", { email }), 1000);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.card}>
          <Text style={styles.appTitle}>Forgot Password</Text>
          <Text style={styles.subTitle}>Enter your registered email</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleForgotPassword}
          >
            <Text style={styles.buttonText}>Send Reset Link</Text>
          </TouchableOpacity>
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
  appTitle: { fontSize: 30, fontWeight: "700", marginBottom: 20 },
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
    marginBottom: 20,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontSize: 16 },
});

export default ForgotPassword;
