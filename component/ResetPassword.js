import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { DataContext } from "../context";
import Ionicons from "react-native-vector-icons/Ionicons";

const ResetPassword = ({ route, navigation }) => {
  const { apiPostPublic } = useContext(DataContext);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const handleResetPassword = async () => {
    if (!otp || !password || !confirmPassword)
      return Toast.show({ type: "error", text1: "Fill all fields" });

    if (password !== confirmPassword)
      return Toast.show({ type: "error", text1: "Passwords do not match" });

    const res = await apiPostPublic("/reset-password", {
      email: route.params.email?.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword: password,
    });

    if (res?.success) {
      Toast.show({ type: "success", text1: "Password reset successful" });
      setTimeout(() => navigation.navigate("Login"), 1500);
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
          <Text style={styles.appTitle}>Reset Password</Text>
          <Text style={styles.subTitle}>Enter your new password</Text>

          {/* OTP */}
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
             placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />

          {/* New Password */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setPasswordVisible(!passwordVisible)}
            >
              <Ionicons
                name={passwordVisible ? "eye-off" : "eye"}
                size={22}
                color="#444"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!confirmVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setConfirmVisible(!confirmVisible)}
            >
              <Ionicons
                name={confirmVisible ? "eye-off" : "eye"}
                size={22}
                color="#444"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
            <Text style={styles.buttonText}>Reset Password</Text>
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
  inputWrapper: {
    width: "100%",
    position: "relative",
    marginBottom: 10,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#666",
    paddingRight: 45,
    marginBottom: 10,
    color: "#666",
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    top: 14,
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

export default ResetPassword;
