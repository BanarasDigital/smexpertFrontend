// screens/CreateGroupScreen.js — ADMIN-ONLY, branch-safe, clear-after-create

import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { DataContext } from "../../../context";
import { API_BASE_URL } from "../../../config";
import MyHeader from "../../../component/Header/Header";

const PAGE_SIZE = 30;
const WA_GREEN = "#075E54";
const WA_ACCENT = "#25D366";

const toStringSafe = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
  if (typeof v === "object") return v.name ?? v.label ?? v.title ?? v.id ?? "";
  return "";
};
const safeText = (v) =>
  v == null
    ? ""
    : typeof v === "object"
    ? v.name ?? v.label ?? v.title ?? v.id ?? ""
    : String(v);

const getId = (obj) => {
  if (!obj) return "";
  const id = obj._id ?? obj.id ?? obj.userId ?? obj.uuid;
  return id ? String(id) : "";
};

const resolveProfileUri = (val) => {
  const v = toStringSafe(val);
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

const CreateGroupScreen = ({ navigation }) => {
  const { apiGet, apiPost, user } = useContext(DataContext);

  // --- robust admin check (role or user_type, case-insensitive)
  const isAdmin =
    (user?.user_type && String(user.user_type).toLowerCase() === "admin") ||
    (user?.role && String(user.role).toLowerCase() === "admin");

  // Soft-redirect if not admin (don’t render heavy UI)
  useEffect(() => {
    if (!isAdmin) {
      Toast.show({ type: "info", text1: "Only admins can create groups" });
      navigation.replace("BranchUsers");
    }
  }, [isAdmin, navigation]);

  if (!isAdmin) return null;

  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

  const [search, setSearch] = useState("");
  const skipRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const headerTabs = useMemo(
    () => [
      { name: "Chats", label: "CHATS" },
      { name: "Users", label: "USERS" },
      { name: "Groups", label: "GROUPS" },
      { name: "Payments", label: "PAYMENTS" },
    ],
    []
  );

  // --- fetch branches (single shot) and validate branchId
  useEffect(() => {
    (async () => {
      try {
        const list = await apiGet("/admin/branches", {}, null, null, false);
        if (Array.isArray(list) && list.length) {
          setBranches(list);
          // if current branchId invalid or empty, default to the first
          const exists = list.some(
            (b) => String(b.id ?? b._id) === String(branchId)
          );
          if (!exists) {
            const first = list[0];
            setBranchId(String(first.id ?? first._id));
            setBranchName(String(first?.name || ""));
          }
        } else {
          setBranches([]);
          setBranchId(null);
          setBranchName("");
        }
      } catch {
        setBranches([]);
        setBranchId(null);
        setBranchName("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = useCallback(
    async ({ reset = true } = {}) => {
      // Guard: avoid “user branch is not exist” by ensuring valid branch
      if (loading || !branchId) return;
      // Also ensure branchId exists in branches (backend may 404 if not)
      const valid = branches.some(
        (b) => String(b.id ?? b._id) === String(branchId)
      );
      if (!valid) return;

      setLoading(true);
      try {
        const params = { limit: PAGE_SIZE, skip: reset ? 0 : skipRef.current };
        if (search.trim()) params.search = search.trim();

        const res = await apiGet(
          `/admin/branches/${branchId}/users`,
          params,
          null,
          null,
          false
        );

        const fetchedRaw = Array.isArray(res?.users) ? res.users : [];
        const fetched = fetchedRaw.map((u) => ({ ...u, _id: getId(u) }));

        if (reset) {
          setAllUsers(fetched);
          skipRef.current = fetched.length;
        } else {
          setAllUsers((prev) => [...prev, ...fetched]);
          skipRef.current += fetched.length;
        }
        setHasMore(fetched.length === PAGE_SIZE);

        const bName = typeof res?.branchName === "string" ? res.branchName : "";
        if (bName) setBranchName(bName);
      } catch (e) {
        // If backend says branch not found, allow user to re-pick
        setAllUsers([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [apiGet, branchId, search, loading, branches]
  );

  // refetch when branch changes
  useEffect(() => {
    if (!branchId) return;
    skipRef.current = 0;
    fetchUsers({ reset: true });
  }, [branchId, fetchUsers]);

  const onUserPress = (u) => {
    const id = getId(u);
    if (!id) return;
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openProfile = (u) => {
    setProfileUser(u);
    setProfileModalOpen(true);
  };

  // --- CREATE GROUP: clears fields after success and navigates
  // const handleCreateGroup = async () => {
  //   const title = (name || "").trim();
  //   if (!title) return Alert.alert("Error", "Group name is required");

  //   const branchIsValid = branches.some(
  //     (b) => String(b.id ?? b._id) === String(branchId)
  //   );
  //   if (!branchIsValid) {
  //     Toast.show({
  //       type: "info",
  //       text1: "Please select a valid branch",
  //     });
  //     setBranchPickerOpen(true);
  //     return;
  //   }

  //   try {
  //     const creatorId = getId(user);
  //     const merged = Array.from(
  //       new Set([...selectedMembers, creatorId].filter(Boolean))
  //     );
  //     if (merged.length < 2) {
  //       return Alert.alert("Error", "Select at least 1 more member");
  //     }

  //    const payload = {
  //     name: title,
  //     members: merged,
  //     branchId,
  //     branchName,
  //   };
  //     const res = await apiPost("/create-group", payload);

  //     const group = res?.data?.data ?? res?.data ?? res;
  //     const groupName = toStringSafe(group?.name) || title;
  //     if (!groupName) {
  //       return Alert.alert("Error", "Failed to create group");
  //     }

  //     // Clear all fields after successful create
  //     setName("");
  //     setSearch("");
  //     setSelectedMembers([]);
  //     skipRef.current = 0;
  //     await fetchUsers({ reset: true });

  //     Toast.show({ type: "success", text1: "Group created" });

  //     // Navigate to the new group's conversation
  //     navigation.navigate("GroupConversation", {
  //       name: groupName,
  //       group,
  //     });
  //   } catch (e) {
  //     const msg = (e?.response?.data?.error || e?.message || "")
  //       .toLowerCase()
  //       .includes("exists")
  //       ? "Group name already exists."
  //       : "Failed to create group";
  //     Alert.alert("Error", msg);
  //   }
  // };
// --- CREATE GROUP: clears fields after success and navigates
const handleCreateGroup = async () => {
  const title = (name || "").trim();
  if (!title) return Alert.alert("Error", "Group name is required");

  const branchIsValid = branches.some(
    (b) => String(b.id ?? b._id) === String(branchId)
  );
  if (!branchIsValid) {
    Toast.show({
      type: "info",
      text1: "Please select a valid branch",
    });
    setBranchPickerOpen(true);
    return;
  }

  try {
    const creatorId = getId(user);
    const merged = Array.from(
      new Set([...selectedMembers, creatorId].filter(Boolean))
    );
    if (merged.length < 2) {
      return Alert.alert("Error", "Select at least 1 more member");
    }

    const payload = {
      name: title,
      members: merged,
      branchId,
      branchName,
    };
    const res = await apiPost("/create-group", payload);

    const group = res?.data?.data ?? res?.data ?? res;
    const groupName = toStringSafe(group?.name) || title;
    if (!groupName) {
      return Alert.alert("Error", "Failed to create group");
    }

    // Clear all fields after successful create
    setName("");
    setSearch("");
    setSelectedMembers([]);
    skipRef.current = 0;
    await fetchUsers({ reset: true });

    Toast.show({ type: "success", text1: "Group created" });
   navigation.navigate("Chats", { newGroup: group });
    navigation.navigate("GroupConversation", {
      name: groupName,
      group,
    });
  } catch (e) {
    const msg = (e?.response?.data?.error || e?.message || "")
      .toLowerCase()
      .includes("exists")
      ? "Group name already exists."
      : "Failed to create group";
    Alert.alert("Error", msg);
  }
};

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const nameV = toStringSafe(u?.name).toLowerCase();
      const emailV = toStringSafe(u?.email).toLowerCase();
      return nameV.includes(q) || emailV.includes(q);
    });
  }, [allUsers, search]);

  const selectedUsers = useMemo(
    () =>
      selectedMembers
        .map((id) => allUsers.find((u) => getId(u) === id))
        .filter(Boolean),
    [selectedMembers, allUsers]
  );

  const renderAvatar = (u, size = 38) => {
    const uri = resolveProfileUri(u?.profileImage);
    const style =
      size === 24
        ? styles.avatarImgSm
        : size === 32
        ? styles.avatarImgMd
        : styles.avatarImg;
    if (uri) return <Image source={{ uri }} style={style} />;
    return (
      <View
        style={[
          styles.avatarFallback,
          {
            width: style.width,
            height: style.height,
            borderRadius: style.borderRadius,
          },
        ]}
      >
        <Ionicons
          name="person"
          size={Math.max(14, Math.floor(style.width * 0.45))}
          color="#fff"
        />
      </View>
    );
  };

  const branchPillText =
    safeText(branchName) || (branches.length ? "Select Branch" : "No branches");

  const noBranch = !branches.length;
  const noBranchHint =
    "No branches are available. Please create a branch in the admin panel first.";

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={WA_GREEN} />
      <Toast />
      <MyHeader navigation={navigation} tabs={headerTabs} />

      <View style={styles.topControls}>
        <TouchableOpacity
          style={[styles.branchSelector, noBranch && { opacity: 0.6 }]}
          onPress={() => !noBranch && setBranchPickerOpen(true)}
          activeOpacity={0.9}
          disabled={noBranch}
        >
          <Ionicons name="business" size={18} color="#fff" />
          <Text style={styles.branchSelectorText}>{branchPillText}</Text>
          <Ionicons name="chevron-down" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.inputWrap}>
          <Ionicons name="pricetag" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Group subject"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.searchPillWrap}>
        <View style={styles.searchPill}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => fetchUsers({ reset: true })}
          />
          {search ? (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                fetchUsers({ reset: true });
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.searchAction,
            (!branchId || noBranch) && { opacity: 0.6 },
          ]}
          onPress={() => fetchUsers({ reset: true })}
          disabled={!branchId || noBranch}
        >
          <Text style={styles.searchActionText}>Search</Text>
        </TouchableOpacity>
      </View>

      {selectedUsers.length > 0 && (
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <Text
            style={{
              fontSize: 12,
              color: "#374151",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Selected ({selectedUsers.length})
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedUsers}
            keyExtractor={(u) => getId(u)}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chipRich}
                activeOpacity={0.85}
                onLongPress={() =>
                  setProfileUser(item) || setProfileModalOpen(true)
                }
              >
                {renderAvatar(item, 24)}
                <View style={{ maxWidth: 140 }}>
                  <Text style={styles.chipTitle} numberOfLines={1}>
                    {toStringSafe(item?.name) || "User"}
                  </Text>
                  <Text style={styles.chipSub} numberOfLines={1}>
                    {toStringSafe(item?.email) ||
                      toStringSafe(item?.profession) ||
                      "—"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedMembers((prev) =>
                      prev.filter((x) => String(x) !== getId(item))
                    )
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#555" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {noBranch ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{noBranchHint}</Text>
          </View>
        ) : loading && allUsers.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={WA_GREEN} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Contacts</Text>
            </View>
            <View style={styles.listCard}>
              {filteredUsers.map((u, idx) => {
                const id = getId(u);
                const isPicked = selectedMembers.includes(String(id));
                return (
                  <View key={id || String(idx)}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => onUserPress(u)}
                      onLongPress={() => openProfile(u)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.rowLeft}>
                        {renderAvatar(u, 38)}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>
                            {toStringSafe(u?.name)}
                          </Text>
                          <Text style={styles.userSub}>
                            {toStringSafe(u?.profession) ||
                              toStringSafe(u?.email) ||
                              "—"}
                          </Text>
                        </View>
                      </View>
                      {isPicked ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={WA_ACCENT}
                        />
                      ) : (
                        <Ionicons
                          name="ellipse-outline"
                          size={20}
                          color="#b8c2cc"
                        />
                      )}
                    </TouchableOpacity>

                    {idx < filteredUsers.length - 1 && (
                      <View className="separator" style={styles.separator} />
                    )}
                  </View>
                );
              })}
            </View>

            {!loading && hasMore && allUsers.length > 0 && (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={() => fetchUsers({ reset: false })}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, (!branchId || noBranch) && { opacity: 0.7 }]}
        onPress={handleCreateGroup}
        disabled={!branchId || noBranch}
      >
        <Ionicons name="checkmark" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Branch Picker */}
      <Modal
        visible={branchPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBranchPickerOpen(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select branch</Text>
            <FlatList
              data={branches}
              keyExtractor={(b) => String(b.id ?? b._id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setBranchId(String(item.id ?? item._id));
                    setBranchName(String(item?.name || ""));
                    setSelectedMembers([]);
                    setBranchPickerOpen(false);
                  }}
                >
                  <Ionicons name="business" size={16} color={WA_GREEN} />
                  <Text style={styles.pickerText}>{safeText(item?.name)}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: "#e5e7eb" }} />
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Profile preview of a picked user */}
      <Modal
        visible={profileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProfileModalOpen(false)}
        >
          <View style={styles.profileCard}>
            {profileUser ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 10 }}>
                  {renderAvatar(profileUser, 64)}
                </View>
                <Text style={styles.profileName}>
                  {toStringSafe(profileUser?.name)}
                </Text>
                <Text style={styles.profileSub}>
                  {toStringSafe(profileUser?.email) ||
                    toStringSafe(profileUser?.profession) ||
                    "—"}
                </Text>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => {
                    const id = getId(profileUser);
                    setSelectedMembers((prev) =>
                      prev.filter((x) => String(x) !== id)
                    );
                    setProfileModalOpen(false);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.removeBtnText}>Remove from selected</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  topControls: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    backgroundColor: "#fff",
  },

  branchSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WA_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  branchSelectorText: { color: "#fff", fontWeight: "800" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  searchPillWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 0,
  },
  searchAction: {
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: WA_GREEN,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  searchActionText: { color: "#fff", fontWeight: "800" },

  chips: { gap: 8 },
  chipRich: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 44,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
    maxWidth: 110,
  },
  chipSub: { color: "#6b7280", fontSize: 11, maxWidth: 110 },

  sectionHeader: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  sectionHeaderText: { color: "#374151", fontWeight: "700", fontSize: 12 },

  listCard: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },

  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e5e7eb",
  },
  avatarImgMd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  avatarImgSm: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  avatarFallback: {
    backgroundColor: "#128C7E",
    alignItems: "center",
    justifyContent: "center",
  },

  userName: { color: "#111827", fontSize: 15, fontWeight: "600" },
  userSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: "#f1f5f9", marginLeft: 62 },

  loaderWrap: { paddingTop: 30, alignItems: "center" },
  emptyWrap: { paddingTop: 30, alignItems: "center", paddingHorizontal: 16 },
  emptyText: { color: "#94a3b8", textAlign: "center" },

  loadMore: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  loadMoreText: { color: "#0f172a", fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    backgroundColor: WA_ACCENT,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  pickerCard: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerText: { color: "#0f172a", fontSize: 15, fontWeight: "600" },

  profileCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  profileSub: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  removeBtn: {
    marginTop: 14,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  removeBtnText: { color: "#fff", fontWeight: "800" },
});

export default CreateGroupScreen;
