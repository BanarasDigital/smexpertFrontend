import * as React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MyHeader from "../../../component/Header/Header";
import { DataContext } from "../../../context";
import { formatConversationDate } from "../../../component/formatDate";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import ChatListSkeleton from "../../../component/Skeleton/ConversationSkeleton";

export default function GroupConversation({ navigation }) {
  const { apiGet, user } = React.useContext(DataContext);
  const [groups, setGroups] = React.useState(null);
  const isFocused = useIsFocused();

  /** ✅ Fetch groups **/
  const fetchGroups = React.useCallback(async () => {
    try {
      const res = await apiGet("/get-group-conversation/");
      setGroups(res?.data || res || []);
    } catch (e) {
      console.log("❌ Failed to fetch groups:", e.message);
      setGroups([]);
    }
  }, [apiGet]);

 useFocusEffect(
  React.useCallback(() => {
    fetchGroups(); 
  }, [fetchGroups])
);
  /** ✅ Render Group Row **/
  const renderItem = ({ item }) => {
    const isAdmin = String(item.admin) === String(user?._id);
    const groupImage = item?.groupImage;

    return (
      <View style={styles.chatItem}>
        {groupImage ? (
          <Image
            source={{ uri: groupImage }}
            style={styles.groupImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="people-circle-outline" size={60} color="#555" />
        )}

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View>
              <Text style={styles.name}>{item?.name}</Text>
            </View>

            <View>
              <Text style={styles.time}>
                {formatConversationDate(item.createdAt)}
              </Text>
              {item.unreadCount > 0 && (
                <Text style={styles.unreadBadge}>{item.unreadCount}</Text>
              )}
            </View>
          </View>

          {/* ✅ Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.viewBtn]}
              onPress={() =>
                navigation.navigate("GroupChat", {
                  groupId: item._id,
                  groupName: item.name,
                })
              }
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Chat</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                style={[styles.btn, styles.editBtn]}
                onPress={() =>
                  navigation.navigate("ManageGroupMembers", {
                    groupId: item._id,
                    groupName: item.name,
                  })
                }
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MyHeader navigation={navigation} />

      {!groups ? (
        <ChatListSkeleton />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No groups available</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.3,
    borderBottomColor: "#ccc",
  },

  /** ✅ Group Image / Icon **/
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f3f4f6",
  },

  chatInfo: { flex: 1, marginLeft: 10 },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: { fontWeight: "700", fontSize: 16, color: "#111" },
  message: { color: "#555" },
  time: { color: "#888", fontSize: 12 },
  unreadBadge: {
    backgroundColor: "green",
    borderRadius: 12,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
  },

  actions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 5,
  },
  viewBtn: { backgroundColor: "#2563EB" },
  editBtn: { backgroundColor: "#059669" },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
    fontSize: 15,
  },
});
