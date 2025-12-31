import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DataContext } from "../context";

export default function SelectChat({ route }) {
  const { pdfUri, meta } = route.params;
  const { apiGet } = useContext(DataContext);
  const [chats, setChats] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const [users, groups] = await Promise.all([
          apiGet("/get-user-converstaions/"),
          apiGet("/get-group-conversations/"),
        ]);
        setChats([
          ...users.map((u) => ({ ...u, isGroup: false })),
          ...groups.map((g) => ({ ...g, isGroup: true })),
        ]);
      } catch {
        Alert.alert("Error", "Failed to load chats.");
      }
    })();
  }, []);

  const sendPdfToChat = async (chat) => {
    try {
      navigation.navigate(chat.isGroup ? "GroupChat" : "Chat", {
        id: chat.isGroup ? undefined : chat._id,
        groupId: chat.isGroup ? chat._id : undefined,
        attachment: {
          uri: pdfUri,
          type: "application/pdf",
          name: "Receipt.pdf",
        },
        meta,
      });
    } catch {
      Alert.alert("Error", "Failed to send PDF.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Chat or Group</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => sendPdfToChat(item)}
          >
            <Ionicons
              name={
                item.isGroup ? "people-circle-outline" : "person-circle-outline"
              }
              size={28}
              color="#2563eb"
            />
            <Text style={styles.name}>{item.name || item.fullName}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220", padding: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  name: { color: "#e6eefc", fontSize: 16, fontWeight: "600" },
});
