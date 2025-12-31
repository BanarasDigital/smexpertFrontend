import React, { useState } from "react";
import {
  View,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ImageEditScreen({ navigation, route }) {
  const { imageUri } = route.params;
  const [caption, setCaption] = useState("");

  const handleSend = () => {
    console.log("Sending image:", imageUri);
    console.log("Caption:", caption);
    alert("Image sent!");
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="contain"
      />
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

      <View style={styles.bottomBar}>
        <TextInput
          style={styles.input}
          placeholder="Add a caption..."
          placeholderTextColor="#999"
          value={caption}
          onChangeText={setCaption}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  cancelButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
  image: { flex: 1, width: "100%", marginTop: 60 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#121212",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    color: "#fff",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#0b93f6",
    borderRadius: 25,
    padding: 12,
    marginLeft: 8,
  },

});
