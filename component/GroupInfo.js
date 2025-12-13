// screens/GroupInfo.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { DataContext } from "../context";

export default function GroupInfo({ navigation, route }) {
  const { apiGet } = useContext(DataContext) || {};
  const groupId = route?.params?.id;
  const [group, setGroup] = useState(null);

  useEffect(() => {
    apiGet(`/group/${groupId}`, {}, (res) => setGroup(res?.group || res));
  }, [groupId]);

  const leaveGroup = () => {
    Alert.alert("Leave group?", "You will stop receiving messages.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          // Optional: call your leave endpoint
          // await fetch(`${API_BASE_URL}/group/${groupId}/leave`, { method: "POST" });
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group info</Text>
      </View>

      <View style={styles.top}>
        {group?.image ? (
          <Image source={{ uri: group.image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="people-outline" size={32} color="#fff" />
          </View>
        )}
        <Text style={styles.name}>{group?.name || "Group"}</Text>
        <Text style={styles.sub}>
          {Array.isArray(group?.members)
            ? `${group.members.length} participants`
            : ""}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Participants</Text>
      <FlatList
        data={group?.members || []}
        keyExtractor={(m) => m._id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            {item?.avatar ? (
              <Image
                source={{ uri: item.avatar }}
                style={styles.memberAvatar}
              />
            ) : (
              <View style={[styles.memberAvatar, styles.memberFallback]}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
            )}
            <Text style={styles.memberName}>{item.name || item.email}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity onPress={leaveGroup} style={styles.leaveBtn}>
        <Text style={styles.leaveText}>Leave group</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#075E54",
    paddingTop: 36,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  top: { alignItems: "center", paddingVertical: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { marginTop: 10, fontSize: 18, fontWeight: "700", color: "#111" },
  sub: { color: "#666", marginTop: 2 },

  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    color: "#666",
    fontSize: 12,
  },
  memberRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  memberFallback: {
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: { fontSize: 15, color: "#111" },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#eee",
    marginLeft: 58,
  },

  leaveBtn: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: { color: "#fff", fontWeight: "700" },
});
