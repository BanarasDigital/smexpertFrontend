import * as React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MyHeader from "../../component/Header/Header";
import { DataContext } from "../../context";
import { formatConversationDate } from "../../component/formatDate";
import { useIsFocused } from "@react-navigation/native";
import io from "socket.io-client";
import { API_BASE_URL } from "../../config";

export default function HomePage({ navigation }) {
  const { user, apiGet, getFileUrl } = React.useContext(DataContext);
  const [chats, setChats] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const isFocused = useIsFocused();
  const socketRef = React.useRef(null);

  /* ----------------- Helpers ----------------- */
  const getAvatar = (obj) =>
    obj?.profileImage ||
    obj?.groupImage ||
    obj?.avatar ||
    obj?.image ||
    obj?.picture ||
    null;

  const getOtherUser = (conversation) => {
    if (conversation?.otherUser) return conversation.otherUser;
    const { user1, user2, sender, receiver } = conversation || {};
    if (user1 && user2)
      return String(user1?._id) === String(user?._id) ? user2 : user1;
    if (sender && receiver)
      return String(sender?._id) === String(user?._id) ? receiver : sender;
    return null;
  };

  const normalizeFile = (file) => {
    if (!file) return null;
    const url = getFileUrl
      ? getFileUrl(file.url || file.path || file)
      : file.url || file.path || file;
    const type = file.type || file.mimeType || "";
    return { url, type };
  };

  /* ----------------- Media icon logic ----------------- */
  const getMediaPreview = (file) => {
    if (!file) return { icon: "attach-outline", label: "Media" };
    const url = String(file.url || "").toLowerCase();
    const type = String(file.type || "").toLowerCase();

    if (type.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/.test(url))
      return { icon: "image-outline", label: "Photo" };
    if (type.startsWith("video/") || /\.(mp4|mov|mkv|webm)$/.test(url))
      return { icon: "videocam-outline", label: "Video" };
    if (/\.(pdf|docx?|xlsx?|pptx?)$/.test(url))
      return { icon: "document-text-outline", label: "File" };
    return { icon: "attach-outline", label: "Media" };
  };

  const buildPreview = (msg = {}, isGroup = false) => {
    if (!msg) return { text: "", icon: null };

    const senderName =
      msg.senderInfo?.name ||
      msg.sender?.name ||
      msg.senderName ||
      "Someone";

    // ✅ Always prefix sender name (even for private chat)
    const prefix =
      String(msg.senderId?._id || msg.senderId) === String(user?._id)
        ? "You: "
        : `${senderName}: `;

    const attachments = Array.isArray(msg.attachments)
      ? msg.attachments.map(normalizeFile)
      : [];

    if (attachments.length > 0) {
      const first = getMediaPreview(attachments[0]);
      return { text: `${prefix}${first.label}`, icon: first.icon };
    }

    if (msg.content) return { text: `${prefix}${msg.content}`, icon: null };

    return { text: "", icon: null };
  };

  /* ----------------- Fetch Chats ----------------- */
  const fetchChats = async () => {
    setLoading(true);
    try {
      const [privRes, grpRes] = await Promise.all([
        apiGet("/get-user-converstaions/"),
        apiGet("/get-group-conversations/"),
      ]);

      const privateChats = Array.isArray(privRes) ? privRes : [];
      const groupChats = Array.isArray(grpRes)
        ? grpRes.map((g) => ({
          ...g,
          isGroup: true,
          profileImage: g.groupImage || g.profileImage || null,
        }))
        : [];

      const normalizeLast = (chat) => {
        if (chat.isGroup && !chat.lastMessage && Array.isArray(chat.messages)) {
          chat.lastMessage = chat.messages[chat.messages.length - 1] || null;
        }
        return chat;
      };

      const all = [...privateChats, ...groupChats]
        .map(normalizeLast)
        .sort(
          (a, b) =>
            new Date(b?.lastMessage?.createdAt || b.updatedAt || 0) -
            new Date(a?.lastMessage?.createdAt || a.updatedAt || 0)
        );

      setChats(all);
    } catch (err) {
      console.error("fetchChats error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchChats();
  }, [isFocused]);

  /* ----------------- Socket.io ----------------- */
  React.useEffect(() => {
    if (!user?._id) return;
    socketRef.current = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.emit("register", user._id);

    socketRef.current.on("receive_message", (data) => {
      if (
        String(data.receiverId) === String(user._id) ||
        String(data.senderId) === String(user._id)
      )
        fetchChats();
    });

    socketRef.current.on("receive_group_message", () => fetchChats());

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]);

  /* ----------------- Render Each Chat ----------------- */
  const renderItem = ({ item }) => {
    const isGroup = item?.isGroup;
    const otherUser = !isGroup ? getOtherUser(item) : null;

    const name = isGroup
      ? item?.name || "Unnamed Group"
      : otherUser?.name || otherUser?.fullName || "Unknown";

    const avatar = isGroup ? item?.profileImage : getAvatar(otherUser) || null;
    const imageUri = avatar ? getFileUrl(avatar) : null;

    const lastMsg = item?.lastMessage || {};
    const preview = buildPreview(lastMsg, isGroup);
    const timeValue = lastMsg?.createdAt || item?.updatedAt;

    const senderId = lastMsg?.senderId?._id || lastMsg?.senderId;
    const isMine = String(senderId) === String(user?._id);
    const isRead = lastMsg?.isReadBy
      ? lastMsg.isReadBy.includes(user?._id)
      : lastMsg?.isRead;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          if (socketRef.current && user?._id) {
            if (isGroup) {
              socketRef.current.emit("mark_group_as_read", {
                groupId: item._id,
                userId: user._id,
              });
            } else {
              socketRef.current.emit("mark_chat_as_read", {
                conversationId: item._id,
                userId: user._id,
              });
            }
          }

          // ✅ Clear unread instantly
          setChats((prev) =>
            prev.map((c) =>
              String(c._id) === String(item._id)
                ? { ...c, unreadCount: 0 }
                : c
            )
          );

          navigation.navigate(isGroup ? "GroupChat" : "Chat", {
            groupId: isGroup ? item._id : undefined,
            id: !isGroup ? otherUser?._id : undefined,
            name,
            profileImage: imageUri,
          });
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <Ionicons
            name={isGroup ? "people-circle-outline" : "person-circle-outline"}
            size={60}
            color="#555"
          />
        )}

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.time}>{formatConversationDate(timeValue)}</Text>
          </View>

          <View style={styles.previewRow}>
            {preview.icon && (
              <Ionicons
                name={preview.icon}
                size={16}
                color="#555"
                style={{ marginRight: 5 }}
              />
            )}
            <Text style={styles.message} numberOfLines={1}>
              {preview.text}
            </Text>

            {isMine && (
              <Ionicons
                name={isRead ? "checkmark-done" : "checkmark"}
                size={16}
                color={isRead ? "#34B7F1" : "#888"}
                style={{ marginLeft: 5 }}
              />
            )}
          </View>

          {item?.unreadCount > 0 && (
            <View style={styles.unreadBubble}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* ----------------- UI ----------------- */
  return (
    <View style={styles.container}>
      <MyHeader navigation={navigation} />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#075E54" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={70} color="#A0AEC0" />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>Start a conversation 💬</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => String(item?._id)}
        />
      )}

      {/* {user?.user_type === "admin" && (
        <>
          <TouchableOpacity
            style={styles.fabAddUser}
            onPress={() => navigation.navigate("AddUser")}
          >
            <Ionicons name="person-add" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabPayment}
            onPress={() => navigation.navigate("Payments")}
          >
            <Ionicons name="cash-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )} */}
      {user?.user_type === "admin" ? (
        <>
          {/* Add User */}
          <TouchableOpacity
            style={styles.fabAddUser}
            onPress={() => navigation.navigate("AddUser")}
          >
            <Ionicons name="person-add" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Admin Lead Page */}
          <TouchableOpacity
            style={styles.fabLead1}
            onPress={() => navigation.navigate("leads")}
          >
            <Ionicons name="document-text-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.fabLead}
            onPress={() =>
              navigation.navigate("LeadUserPage", {
                userId: user?._id,
              })
            }
          >
            <Ionicons name="document-text-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

    </View>
  );
}

/* ----------------- Styles ----------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 10 },
  emptyText: { color: "#777", marginTop: 4 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 0.4,
    borderBottomColor: "#ddd",
  },
  avatar: { width: 55, height: 55, borderRadius: 28, marginRight: 12 },
  chatInfo: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "bold", color: "#111" },
  message: { color: "#555", flexShrink: 1 },
  time: { color: "#888", fontSize: 12 },
  previewRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  unreadBubble: {
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
    alignSelf: "flex-end",
    position: "absolute",
    right: 0,
    top: 20,
  },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  fabAddUser: {
    backgroundColor: "#34A853",
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  fabLead1: {
    backgroundColor: "#007bff",
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  fabLead: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#0A84FF",
    padding: 16,
    borderRadius: 50,
    elevation: 6,
  },
});
