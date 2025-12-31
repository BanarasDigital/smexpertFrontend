// screens/GroupList.js
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { DataContext } from "../context";

const getAvatar = (g) =>
  g?.image || g?.avatar || g?.photoURL || g?.picture || null;

const timeShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function GroupList({ navigation }) {
  const { apiGet } = useContext(DataContext) || {};
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await apiGet("/groups", {}, (res) => setGroups(res?.groups || []));
    setLoading(false);
  }, [apiGet]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const renderItem = ({ item }) => {
    const avatar = getAvatar(item);
    const last = item?.lastMessage;
    const unread = item?.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("GroupChat", { id: item._id })}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="people-outline" size={26} color="#fff" />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || "Group"}
            </Text>
            <Text style={styles.time}>{timeShort(last?.createdAt)}</Text>
          </View>
          <View style={styles.bottomLine}>
            <Text style={styles.preview} numberOfLines={1}>
              {last?.senderName ? `${last.senderName}: ` : ""}
              {last?.content
                ? last.content
                : last?.attachments?.length
                ? "📎 attachment"
                : "Say hello 👋"}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      data={groups}
      keyExtractor={(g) => g._id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      contentContainerStyle={{ paddingVertical: 6 }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  topLine: { flexDirection: "row", alignItems: "center" },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: "#111" },
  time: { color: "#777", marginLeft: 8, fontSize: 12 },
  bottomLine: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  preview: { flex: 1, color: "#666" },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#eee",
    marginLeft: 78,
  },
});
