import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  ActionSheetIOS,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { DataContext } from "../../context";
import MyHeader from "../../component/Header/Header";
import { Ionicons } from "@expo/vector-icons";

/* ---------------- helpers ---------------- */

const toStringSafe = (v) => {
  if (v == null) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toStringSafe).filter(Boolean).join(", ");
  if (t === "object") {
    const keys = [
      "name",
      "fullName",
      "title",
      "label",
      "username",
      "email",
      "id",
      "_id",
    ];
    for (const k of keys) if (v[k] != null) return toStringSafe(v[k]);
    return "";
  }
  return "";
};

const getId = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  const v =
    obj._id ??
    obj.id ??
    obj.groupId ??
    obj.uuid ??
    obj.userId ??
    obj.objectId ??
    obj.oid;
  return v != null ? String(v) : "";
};

const getName = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  return toStringSafe(
    obj.name ?? obj.title ?? obj.groupName ?? obj.fullName ?? obj.label ?? ""
  );
};

const getBranchName = (branch) => {
  if (!branch) return "";
  if (typeof branch === "string") return branch;
  if (typeof branch === "object")
    return getName(branch) || toStringSafe(branch._id || branch.id);
  return "";
};

const normalizeFileUri = (uri) => {
  if (!uri) return uri;
  if (
    Platform.OS === "ios" &&
    !uri.startsWith("file://") &&
    !uri.startsWith("content://")
  ) {
    return `file://${uri}`;
  }
  return uri;
};

/* ---------------- component ---------------- */

export default function ProfilePage({ navigation }) {
  const { user, updateUser, updateProfile, apiGet } = useContext(DataContext);

  const role = (user?.role || user?.user_type || "").toLowerCase();
  const isAdmin = role === "admin";
  const branchName =
    (typeof user?.branch === "object" ? user?.branch?.name : user?.branch) ||
    "";

  const userId = getId(user);

  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [profession, setProfession] = useState(user?.profession || "");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  /* ---- Permissions & Image upload ---- */

  const ensurePhotoPerms = async () => {
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === "granted" || status === "limited") return status;
      if (!canAskAgain) {
        Alert.alert(
          "Photos access blocked",
          "Enable Photos access in Settings to update your profile picture.",
          [{ text: "OK" }]
        );
        return "denied";
      }
      Alert.alert("Permission required", "Please allow Photos access.");
      return "denied";
    } catch {
      Alert.alert("Permission error", "Could not check Photos permission.");
      return "denied";
    }
  };

  const uploadProfileImage = async (uri) => {
    const safeUri = normalizeFileUri(uri);
    const formData = new FormData();
    formData.append("profileImage", {
      uri: safeUri,
      name: "profile.jpg",
      type: "image/jpeg",
    });

    setSaving(true);
    const res = await updateProfile(formData);
    setSaving(false);

    if (res?.user) {
      updateUser(res.user);
      setProfileImage(res.user.profileImage || safeUri);
    } else {
      setError(res?.message || "Failed to upload image.");
    }
  };

  const pickFromGallery = useCallback(async () => {
    setError("");
    const perm = await ensurePhotoPerms();
    if (perm === "denied") return;

    if (
      perm === "limited" &&
      Platform.OS === "ios" &&
      ImagePicker.presentLimitedLibraryPickerAsync
    ) {
      try {
        await ImagePicker.presentLimitedLibraryPickerAsync();
      } catch {}
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    setProfileImage(normalizeFileUri(uri));
    await uploadProfileImage(uri);
  }, []);

  const pickFromCamera = useCallback(async () => {
    setError("");
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== "granted") {
      Alert.alert("Permission required", "Please allow Camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    setProfileImage(normalizeFileUri(uri));
    await uploadProfileImage(uri);
  }, []);

  const pickImage = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Choose from Gallery", "Take Photo"],
          cancelButtonIndex: 0,
        },
        async (idx) => {
          if (idx === 1) await pickFromGallery();
          if (idx === 2) await pickFromCamera();
        }
      );
    } else {
      Alert.alert("Profile photo", "Select a source", [
        { text: "Gallery", onPress: () => pickFromGallery() },
        { text: "Camera", onPress: () => pickFromCamera() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [pickFromGallery, pickFromCamera]);

  /* ---- API compat + fetch ---- */

  const apiGetCompat = useCallback(
    async (path) => {
      try {
        const data = await apiGet(path);
        return data;
      } catch {
        try {
          return await new Promise((resolve) =>
            apiGet(path, {}, (d) => resolve(d))
          );
        } catch {
          return null;
        }
      }
    },
    [apiGet]
  );

  const loadGroups = useCallback(async () => {
    if (!userId) return;
    const route = `/get-group-userGroup/${encodeURIComponent(userId)}`;
    const res = await apiGetCompat(route);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];
    setGroups(list);
  }, [apiGetCompat, userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      //      setLoading(true);
      try {
        await loadGroups();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadGroups, setLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGroups();
    } finally {
      setRefreshing(false);
    }
  }, [loadGroups]);

  /* ---- profession update ---- */

  const handleUpdateProfession = async () => {
    if (!profession.trim()) return;
    setError("");
    setSaving(true);

    const formData = new FormData();
    formData.append("profession", profession.trim());

    const res = await updateProfile(formData);
    setSaving(false);

    if (res?.user) {
      updateUser(res.user);
      setProfession(res.user.profession || "");
      setEditMode(false);
    } else setError("Failed to update profession.");
  };

  /* ---- group helpers ---- */

  const getGroupId = (g) =>
    g?._id || g?.id || g?.groupId || String(g?.name || Math.random());
  const getGroupName = (g) => g?.name || g?.title || g?.groupName || "Untitled";

  const data = useMemo(() => (Array.isArray(groups) ? groups : []), [groups]);

  const renderGroupItem = useCallback(
    ({ item }) => {
      const id = getGroupId(item);
      const name = getGroupName(item);
      let groupImage =
        item?.groupImage || item?.image || item?.photo || item?.avatarUrl || "";
      if (groupImage && !groupImage.startsWith("http")) {
        groupImage = `${
          process.env.EXPO_PUBLIC_CDN_URL ||
          "https://your-s3-bucket.s3.amazonaws.com"
        }/${groupImage}`;
      }

      const hasImage =
        typeof groupImage === "string" &&
        (groupImage.startsWith("http") ||
          groupImage.startsWith("https") ||
          groupImage.startsWith("file://") ||
          groupImage.startsWith("content://"));

      const initial = (name || "?").trim().charAt(0).toUpperCase();

      return (
        <TouchableOpacity
          style={styles.groupCard}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("GroupChat", {
              groupId: id,
              groupName: name,
              groupImage: hasImage ? groupImage : null,
            })
          }
        >
          <View style={styles.groupAvatar}>
            {hasImage ? (
              <Image
                source={{ uri: groupImage }}
                style={styles.groupImage}
                resizeMode="cover"
                onError={() =>
                  console.warn("❌ Failed to load group image:", groupImage)
                }
              />
            ) : (
              <Text style={styles.groupAvatarText}>{initial}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.groupName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.groupSubText} numberOfLines={1}>
              Tap to open group chat
            </Text>
          </View>

          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#25D366"
          />
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const keyExtractor = useCallback(
    (item, idx) => String(getGroupId(item) || idx),
    []
  );

  const ListHeader = (
    <View style={styles.headerBlock}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Profile Image */}
      <TouchableOpacity
        onPress={pickImage}
        style={styles.profileContainer}
        activeOpacity={0.9}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle-outline" size={120} color="#c7d1d9" />
        )}
        <View style={styles.editIconContainer}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="camera-outline" size={20} color="#fff" />
          )}
        </View>
      </TouchableOpacity>

      {/* User Info */}
      <View style={styles.infoCard}>
        <Text style={styles.nameText}>
          {user?.name || getName(user) || "User"}
        </Text>
        {!!user?.email && <Text style={styles.emailText}>{user.email}</Text>}
        {!isAdmin && !!branchName && (
          <Text style={styles.branchText}>Branch: {branchName}</Text>
        )}

        {!editMode ? (
          <View style={styles.professionRow}>
            <Text style={styles.professionText}>
              Profession:{" "}
              <Text style={{ fontWeight: "600" }}>
                {profession || "Not set"}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={18} color="#1a73e8" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.professionEditRow}>
            <TextInput
              style={styles.input}
              placeholder="Your Profession"
              value={profession}
              onChangeText={setProfession}
              returnKeyType="done"
              onSubmitEditing={handleUpdateProfession}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleUpdateProfession}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Groups you are in</Text>
    </View>
  );

  const ListEmpty = !loading ? (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubbles-outline" size={40} color="#9aa0a6" />
      <Text style={styles.emptyTextTitle}>No groups yet</Text>
      <Text style={styles.emptyTextSub}>
        You’ll see your groups listed here.
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#f2f4f7" }}
    >
      <MyHeader navigation={navigation} />
      <FlatList
        style={{ flex: 1 }}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  headerBlock: {
    marginBottom: 8,
  },
  errorText: { color: "#d93025", textAlign: "center", marginBottom: 8 },
  profileContainer: {
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#25D366",
    backgroundColor: "#e9eef2",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 2,
    right: 90 - 10, // visually on bottom-right corner of the avatar
    backgroundColor: "#25D366",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fff",
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: "#eef1f4",
  },
  nameText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
    color: "#111827",
  },
  emailText: { fontSize: 14, color: "#5f6368", marginBottom: 2 },
  branchText: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  professionRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  professionText: { fontSize: 15, color: "#374151" },
  professionEditRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginRight: 10,
    backgroundColor: "#fafafa",
  },
  saveBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#075E54",
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#eef1f4",
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e6f4ea",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groupAvatarText: { fontWeight: "700", fontSize: 16, color: "#128C7E" },
  groupName: { fontSize: 15, color: "#1f2937", fontWeight: "600" },
  groupSubText: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "transparent",
  },
  emptyTextTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyTextSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  separator: { height: 10 },
});
