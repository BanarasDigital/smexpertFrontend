import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  memo,
} from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MyHeader from "../../../component/Header/Header";
import { DataContext } from "../../../context";
import ChatListSkeleton from "../../../component/Skeleton/ConversationSkeleton";
import { API_BASE_URL } from "../../../config";

// -------- URL helpers (reuse across app) --------
const BAD_URLS = new Set(["null", "undefined", "about:blank", ""]);
const isBadBlob = (v = "") => /^blob:null/i.test(v);
const isTruthyUrl = (v) => {
  if (!v || typeof v !== "string") return false;
  const t = v.trim();
  if (BAD_URLS.has(t)) return false;
  if (isBadBlob(t)) return false;
  return true;
};
const ensureBaseUrl = (u = "") => {
  if (!isTruthyUrl(u)) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  if (u.startsWith("uploads/")) return `${API_BASE_URL}/${u}`;
  return `${API_BASE_URL}/${u.replace(/^\/+/, "")}`;
};

// -------- Generic avatar field resolver --------
const getAnyAvatarField = (obj) =>
  obj?.profileImage ||
  obj?.photoURL ||
  obj?.avatar ||
  obj?.image ||
  obj?.picture ||
  obj?.avatarUrl ||
  obj?.profile?.image ||
  null;

// -------- Small component: Avatar with graceful fallback --------
const AvatarBubble = memo(function AvatarBubble({
  uri,
  size = 32,
  iconColor = "#555",
}) {
  const [failed, setFailed] = useState(false);

  if (!isTruthyUrl(uri) || failed) {
    return (
      <Ionicons name="person-circle-outline" size={size} color={iconColor} />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ddd",
      }}
      onError={() => setFailed(true)}
    />
  );
});

export default function UserManagement({ navigation }) {
  const { apiGet, apiPost, user, getFileUrl } = useContext(DataContext) || {};
  const [userData, setUserData] = useState(null);

  const fileUrl = useCallback(
    (u) =>
      typeof getFileUrl === "function" ? getFileUrl(u) : ensureBaseUrl(u),
    [getFileUrl]
  );

  useEffect(() => {
    if (typeof apiGet === "function") {
      apiGet("/get-all-user/", {}, (res) =>
        setUserData(Array.isArray(res) ? res : [])
      );
    } else {
      setUserData([]);
    }
  }, [apiGet]);

  const toggleActive = async (id, active) => {
    // optimistic: optional — here we keep it simple & fresh-fetch
    setUserData(null);
    if (typeof apiPost === "function") {
      await apiPost(`/update-user/${id}/`, { active: !active });
    }
    if (typeof apiGet === "function") {
      await apiGet("/get-all-user/", {}, (res) =>
        setUserData(Array.isArray(res) ? res : [])
      );
    }
  };

  const renderUser = ({ item }) => {
    const avatarRaw = getAnyAvatarField(item);
    const avatar = isTruthyUrl(avatarRaw) ? fileUrl(avatarRaw) : "";

    return (
      <View style={styles.row}>
        <AvatarBubble uri={avatar} size={40} />
        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {item?.name || "Unknown"}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {item?.email || ""}
          </Text>
        </View>

        {user?.user_type === "admin" && (
          <Switch
            value={!!item?.active}
            onValueChange={() => toggleActive(item._id, item.active)}
          />
        )}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            navigation.navigate("Chat", {
              id: item._id,
              name: item.name,
              profileImage: avatar || null,
            })
          }
        >
          <Ionicons name="chatbox-outline" size={22} color="#007AFF" />
          <Text style={styles.chatLabel}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      <MyHeader navigation={navigation} />
      {!userData ? (
        <ChatListSkeleton />
      ) : (
        <FlatList
          data={userData}
          keyExtractor={(item, idx) => String(item?._id || idx)}
          renderItem={renderUser}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  sep: {
    height: 1,
    backgroundColor: "#eee",
    marginLeft: 15,
  },
  userInfo: { flex: 1, marginLeft: 10, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "600" },
  email: { color: "#666", marginTop: 2 },
  chatBtn: { marginLeft: 12, alignItems: "center" },
  chatLabel: { fontSize: 11, color: "#007AFF", marginTop: 2 },
});
