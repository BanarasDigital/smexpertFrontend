// WhatsAppChatInput.js
import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function WhatsAppChatInput({
  message,
  setMessage,
  onSend,
  onAttach,
}) {
  const disabled = !message.trim();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
      >
        <View style={styles.container}>

          {/* Attachment */}
          <TouchableOpacity onPress={onAttach} style={styles.attachBtn}>
            <Ionicons name="attach-outline" size={26} color="#555" />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor="#9CA3AF"
            multiline
            value={message}
            onChangeText={setMessage}
          />

          {/* Send Button */}
          <TouchableOpacity
            disabled={disabled}
            onPress={onSend}
            style={[styles.sendWrapper, disabled && styles.sendDisabled]}
          >
            <Ionicons
              name="send"
              size={20}
              color={disabled ? "#777" : "#fff"}
            />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#fff",
  },

  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e2e2",
  },

  attachBtn: {
    padding: 6,
    paddingTop: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderRadius: 20,
    maxHeight: 140,
    lineHeight: 20,
    color: "#111",
  },

  sendWrapper: {
    backgroundColor: "#075E54",
    padding: 10,
    borderRadius: 20,
    marginLeft: 8,
  },

  sendDisabled: {
    backgroundColor: "#dadada",
  },
});
