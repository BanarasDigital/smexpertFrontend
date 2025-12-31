import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef, 
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { DataContext } from "../context";
import { API_BASE_URL } from "../config";
import MyHeader from "../component/Header/Header";

const WA_GREEN = "#075E54";

/* ------------------------ helpers ------------------------ */

const toStringSafe = (v) => {
  if (v == null) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toStringSafe).filter(Boolean).join(", ");
  if (t === "object") {
    const keys = [
      "name",
      "fullName",
      "label",
      "title",
      "username",
      "email",
      "id",
      "_id",
    ];
    for (const k of keys) if (v[k] != null) return toStringSafe(v[k]);
    if (
      typeof v.toString === "function" &&
      v.toString !== Object.prototype.toString
    ) {
      const s = String(v);
      if (s && s !== "[object Object]") return s;
    }
    return "";
  }
  return "";
};

const getId = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  const v =
    obj._id ?? obj.id ?? obj.userId ?? obj.uuid ?? obj.objectId ?? obj.oid;
  return v != null ? String(v) : "";
};

const resolveProfileUri = (val) => {
  const v = toStringSafe(val).trim();
  if (!v || v === "null" || v === "undefined") return null;
  if (/^https?:\/\//i.test(v)) return v;
  const base = (API_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return null; // FIX: avoid bad "null/..." URIs
  const path = v.startsWith("/") ? v : `/${v}`;
  return `${base}${path}`;
};

/* ------------------------ screen ------------------------ */

export default function UserListChat({ navigation }) {
  const { apiGet, user } = useContext(DataContext);
  const isAdmin = toStringSafe(user?.user_type).toLowerCase() === "admin";
  const [firstLoad, setFirstLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState([]);
  const cacheRef = useRef([]);
  const mountedRef = useRef(true);
  const [branchName, setBranchName] = useState("");
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isAdmin) navigation.replace("CreateGroup");
  }, [isAdmin, navigation]);

  const shapeUsers = useCallback((raw, currentUser) => {
    const rawList = Array.isArray(raw) ? raw : [];
    const shaped = rawList.map((u) => {
      const _id = toStringSafe(u?._id);
      return {
        _id,
        id: _id,
        name: toStringSafe(u?.name),
        email: toStringSafe(u?.email),
        user_type: toStringSafe(u?.user_type),
        branchId: toStringSafe(u?.branchId),
        branchName: toStringSafe(u?.branchName),
        profileImage: toStringSafe(u?.profileImage),
        profession: toStringSafe(u?.profession),
        active: !!u?.active,
      };
    });
    const myId = toStringSafe(getId(currentUser));
    return shaped.filter((u) => u._id && u._id !== myId);
  }, []);

  const loadUsers = useCallback(
    async (mode = "initial") => {
      if (isAdmin) return;
      if (mode === "initial") setFirstLoad(false);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "manual") setLoading(true);

      try {
        const res = await apiGet("/users/by-branch");

        if (!res?.success) throw new Error("API returned unsuccessful status");

        const finalList = shapeUsers(res?.users, user);
        cacheRef.current = finalList;

        if (!mountedRef.current) return;

        setUsers(finalList);
        setCount(Number.isFinite(res?.count) ? res.count : finalList.length);
        setBranchName(
          toStringSafe(res?.branchName) ||
            toStringSafe(user?.branch?.name) ||
            toStringSafe(user?.branchName) ||
            toStringSafe(user?.branch_name) ||
            "My Branch"
        );
      } catch (e) {
        if (!mountedRef.current) return;

        if (cacheRef.current.length === 0) {
          Toast.show({
            type: "error",
            text1: "Failed to load users",
            text2: "Pull to refresh or try again.",
          });
          setUsers([]);
          setCount(0);
        } else {
          Toast.show({
            type: "info",
            text1: "Showing last available list",
            text2: "Couldn’t refresh just now.",
          });
          setUsers(cacheRef.current);
          setCount(cacheRef.current.length);
        }
      } finally {
        if (!mountedRef.current) return;
        setFirstLoad(false);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiGet, isAdmin, shapeUsers, user]
  );
  useEffect(() => {
    loadUsers("initial");
  }, [loadUsers]);

  const onRefresh = useCallback(async () => {
    await loadUsers("refresh");
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const n = toStringSafe(u?.name).toLowerCase();
      const e = toStringSafe(u?.email).toLowerCase();
      return n.includes(q) || e.includes(q);
    });
  }, [users, search]);

  const openChat = useCallback(
    (u) => {
      const id = toStringSafe(u?._id || u?.id);
      if (!id) return;
      const name = toStringSafe(u?.name) || "User";
      navigation.navigate("Chat", { id, name });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const name = toStringSafe(item?.name) || "User";
      const email = toStringSafe(item?.email);
      const avatar = resolveProfileUri(item?.profileImage);

      return (
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {!!email && (
                <Text style={styles.sub} numberOfLines={1}>
                  {email}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => openChat(item)}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.chatText}>Chat</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [openChat]
  );

  const keyExtractor = useCallback(
    (item, idx) => toStringSafe(item?._id || item?.id) || String(idx),
    []
  );

  const showEmpty = !firstLoad && filtered.length === 0;

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle={Platform.OS === "ios" ? "light-content" : "light-content"}
        backgroundColor={WA_GREEN}
      />
      <Toast />

      <MyHeader navigation={navigation} activeTab="UserListChat" />

      <View style={styles.topBar}>
        <View style={styles.branchPill}>
          <Ionicons name="business" size={16} color="#fff" />
          <Text style={styles.branchText}>
            {branchName}
            {/* {Number.isFinite(count) ? ` · ${count}` : ""} */}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search name or email"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {firstLoad ? (
        <ActivityIndicator style={{ marginTop: 18 }} color={WA_GREEN} />
      ) : showEmpty ? (
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ color: "#94a3b8" }}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[WA_GREEN]}
              tintColor={WA_GREEN}
            />
          }
          removeClippedSubviews
          initialNumToRender={14}
          windowSize={11}
          maxToRenderPerBatch={14}
          ListFooterComponent={
            loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  topBar: { paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: WA_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  branchText: { color: "#fff", fontWeight: "800" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },

  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    flex: 1,
  },
  sep: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 62 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e5e7eb",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#128C7E",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#111827", fontWeight: "700" },
  sub: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    backgroundColor: "#1F4FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chatText: { color: "#fff", fontWeight: "700" },
});
