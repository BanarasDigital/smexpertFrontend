// pages/Auth/RegisterScreen.js
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoadingSpinner from "../../component/LoadingSpinner/LoadingSpinner";
import Btn from "../../component/Btn";
import { API_BASE_URL } from "../../config";
import { DataContext } from "../../context";

/* ------------------------ Auth Axios Helper (no stacking) ------------------------ */
function useAxiosAuth(navigation) {
  const clientRef = useRef(null);
  const reqIdRef = useRef(null);
  const resIdRef = useRef(null);

  if (!clientRef.current) {
    clientRef.current = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });
  }

  useEffect(() => {
    const reqId = clientRef.current.interceptors.request.use(async (config) => {
      try {
        const token = await AsyncStorage.getItem("accessToken"); // adjust key if different
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch { }
      return config;
    });

    const resId = clientRef.current.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          Toast.show({ type: "error", text1: "Session expired", text2: "Please log in again." });
          AsyncStorage.removeItem("accessToken").finally(() => {
            navigation?.navigate?.("Login");
          });
        }
        return Promise.reject(err);
      }
    );

    reqIdRef.current = reqId;
    resIdRef.current = resId;

    return () => {
      if (reqIdRef.current !== null) clientRef.current.interceptors.request.eject(reqIdRef.current);
      if (resIdRef.current !== null) clientRef.current.interceptors.response.eject(resIdRef.current);
      reqIdRef.current = resIdRef.current = null;
    };
  }, [navigation]);

  return clientRef.current;
}

/* -------------------------- Validation -------------------------- */
const RegisterSchema = Yup.object()
  .shape({
    name: Yup.string().required("Name is required"),
    email: Yup.string().email("Enter a valid email").required("Email is required"),
    profession: Yup.string().nullable(),
    password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match")
      .required("Confirm your password"),
    branchId: Yup.string().nullable(),
    branchName: Yup.string().nullable(),
  })
  .test("branchId-or-branchName", "Select a branch or add a new one", (val) => !!(val.branchId || val.branchName));

/* -------------------------- Searchable Branch Picker -------------------------- */
const BranchPicker = ({ value, branches = [], onSelect, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedName = useMemo(() => {
    return branches.find((b) => String(b._id) === String(value))?.name || "Select Branch";
  }, [branches, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [branches, query]);

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => {
          onOpen?.(); // mark Formik field as touched
          setOpen(true);
        }}
      >
        <Text
          style={[
            styles.dropdownTriggerText,
            selectedName === "Select Branch" && { color: "#6B7280" },
          ]}
          numberOfLines={1}
        >
          {selectedName}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#374151" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Branch</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="Search branch…"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />

            {filtered.length === 0 ? (
              <Text style={{ color: "#6B7280", paddingVertical: 8 }}>
                No results{query ? ` for “${query}”` : ""}.
              </Text>
            ) : (
              <FlatList
                data={filtered}
                keyboardDismissMode="interactive"
                keyExtractor={(item) => String(item._id)}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={18}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => {
                  const isSelected = String(item._id) === String(value);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.branchRow,
                        isSelected && { backgroundColor: "#F3F4F6", borderRadius: 8 },
                      ]}
                      onPress={() => {
                        onSelect?.(item._id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={[styles.branchRowText, isSelected && { fontWeight: "700" }]}>
                          {item.name}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color="#111827" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function RegisterScreen({ navigation }) {
  const { user, apiPost } = useContext(DataContext);
  const isAdmin = user?.user_type === "admin";
  const ax = useAxiosAuth(navigation);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [addingBranch, setAddingBranch] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);

  /* Navigate to Users tab, works for nested navigators too */
  const goToUsersTab = () => {
    if (navigation?.navigate) {
      navigation.navigate("MainTabs", { screen: "Users" });
    }
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate("Users");
    }
    // If you named the tab navigator route: navigation.navigate("MainTabs", { screen: "Users" });
  };

  /* -------------------------- Load Branches -------------------------- */
  const loadBranches = async () => {
    setLoadingBranches(true);
    let mounted = true;
    try {
      // Use verifyUser-safe endpoint
      const res = await ax.get(`/admin/branches`); // requireAdmin server-side
      if (mounted) setBranches(res?.data || []);
    } catch (e) {
      if (mounted) Toast.show({ type: "error", text1: "Failed to load branches" });
    } finally {
      if (mounted) setLoadingBranches(false);
    }
    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadBranches();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const noBranches = useMemo(() => !loadingBranches && branches.length === 0, [loadingBranches, branches]);

  const createBranch = async (values, setFieldValue) => {
    try {
      if (!isAdmin) {
        Toast.show({
          type: "error",
          text1: "Permission denied",
          text2: "Only admins can create branches",
        });
        return;
      }

      const name = values.branchName?.trim();
      if (!name) {
        Toast.show({ type: "error", text1: "Branch name is required" });
        return;
      }

      setCreatingBranch(true);

      // ✅ Use global secure API (auto token refresh)
      const created = await apiPost("/branches", { name });

      if (!created?._id) {
        Toast.show({
          type: "error",
          text1: "Failed to create branch",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Branch created ✅",
      });

      setBranches((prev) => {
        const exists = prev.some((b) => String(b._id) === String(created._id));
        return exists ? prev : [{ _id: created._id, name: created.name, code: created.code }, ...prev];
      });

      setFieldValue("branchId", created._id);

      await loadBranches();
      setAddingBranch(false);
      setFieldValue("branchName", "");
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Could not create branch",
        text2: e?.response?.data?.error || "Try a different name",
      });
    } finally {
      setCreatingBranch(false);
    }
  };




  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create New User</Text>

          <Formik
            initialValues={{
              name: "",
              email: "",
              profession: "",
              password: "",
              confirmPassword: "",
              branchId: "",
              branchName: "",
            }}
            validationSchema={RegisterSchema}
            onSubmit={async (values, actions) => {
              if (submitting) return;
              setSubmitting(true);
              try {
                const payload = {
                  name: values.name,
                  email: values.email,
                  profession: values.profession || undefined,
                  password: values.password,
                  confirmPassword: values.confirmPassword,
                  branchId: values.branchId || undefined,
                  branchName: !values.branchId ? values.branchName : undefined,
                };
                await ax.post(`/register`, payload); // requireAdmin server-side

                Toast.show({
                  type: "success",
                  text1: "Registration Successful",
                  text2: "Welcome aboard!",
                  position: "top",
                });
                actions.resetForm();
                goToUsersTab();
              } catch (error) {
                Toast.show({
                  type: "error",
                  text1: "Registration Failed",
                  text2: error?.response?.data?.error || "Something went wrong",
                  position: "top",
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              setFieldValue,
              setFieldTouched,
            }) => (
              <>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#aaa"
                    autoCapitalize="words"
                    onChangeText={handleChange("name")}
                    onBlur={handleBlur("name")}
                    value={values.name}
                  />
                  {errors.name && touched.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    value={values.email}
                  />
                  {errors.email && touched.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Branch dropdown (picker) */}
                <View style={styles.inputGroup}>
                  <View style={styles.box}>
                    <Text style={styles.boxTitle}>Branch</Text>
                    <BranchPicker
                      value={values.branchId}
                      branches={branches}
                      onOpen={() => setFieldTouched("branchId", true)}
                      onSelect={(id) => {
                        setFieldValue("branchId", id);
                        if (addingBranch) setAddingBranch(false);
                        setFieldValue("branchName", "");
                      }}
                    />
                    {touched.branchId && errors.branchId ? (
                      <Text style={styles.errorText}>{errors.branchId}</Text>
                    ) : null}

                    {values.branchId ? (
                      <Text style={{ marginTop: 6, color: "#374151" }}>
                        Selected: {branches.find((x) => String(x._id) === String(values.branchId))?.name || "—"}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Admin: add a new branch */}
                {isAdmin && (
                  <View style={{ marginTop: 8, marginBottom: 15 }}>
                    {!addingBranch && !noBranches && (
                      <TouchableOpacity
                        onPress={() => {
                          setAddingBranch(true);
                          setFieldValue("branchId", "");
                        }}
                      >
                        <Text style={{ color: "#1F4FFF", fontWeight: "700" }}>+ Add new branch</Text>
                      </TouchableOpacity>
                    )}

                    {(addingBranch || noBranches) && (
                      <View style={[styles.box, { marginTop: 8 }]}>
                        <Text style={styles.boxTitle}>New Branch</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Branch Name (required)"
                          placeholderTextColor="#9CA3AF"
                          value={values.branchName}
                          onChangeText={handleChange("branchName")}
                          onBlur={handleBlur("branchName")}
                        />
                        <View style={{ height: 10 }} />
                        <Btn
                          width={"100%"}
                          textColor="#FFFFFF"
                          bgColor={creatingBranch ? "#9CA3AF" : "#1F4FFF"}
                          btnLabel={creatingBranch ? "Saving..." : "Save Branch"}
                          Press={() => (creatingBranch ? null : createBranch(values, setFieldValue))}
                        />
                        {!noBranches && (
                          <TouchableOpacity
                            style={{ marginTop: 10, alignSelf: "flex-start" }}
                            onPress={() => {
                              setAddingBranch(false);
                              setFieldValue("branchName", "");
                            }}
                          >
                            <Text style={{ color: "#1F4FFF", fontWeight: "700" }}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Passwords */}
                <View style={styles.inputGroup}>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#aaa"
                      secureTextEntry={!passwordVisible}
                      onChangeText={handleChange("password")}
                      onBlur={handleBlur("password")}
                      value={values.password}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                    >
                      <Ionicons
                        name={passwordVisible ? "eye-off" : "eye"}
                        size={22}
                        color="#555"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && touched.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#aaa"
                      secureTextEntry={!confirmVisible}
                      onChangeText={handleChange("confirmPassword")}
                      onBlur={handleBlur("confirmPassword")}
                      value={values.confirmPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setConfirmVisible(!confirmVisible)}
                    >
                      <Ionicons
                        name={confirmVisible ? "eye-off" : "eye"}
                        size={22}
                        color="#555"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>

                {submitting ? (
                  <LoadingSpinner />
                ) : (
                  <Btn width={"100%"} textColor="white" bgColor={"green"} btnLabel="Create User" Press={handleSubmit} />
                )}
              </>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------------------- Styles ---------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    padding: 20,
    paddingTop: 36,
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  container: { flex: 1 },
  scrollContainer: { padding: 20, justifyContent: "center", flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 25, textAlign: "center" },

  inputGroup: { marginBottom: 15 },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#666",
  },

  box: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  boxTitle: { marginBottom: 6, color: "#555", fontWeight: "600" },

  dropdownTrigger: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerText: { fontSize: 16, color: "#111827" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  branchRow: { paddingVertical: 10, paddingHorizontal: 6 },
  branchRowText: { fontSize: 16, color: "#111827" },
  passwordWrapper: {
    position: "relative",
    width: "100%",
  },

  eyeIcon: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  errorText: { color: "red", fontSize: 13, marginTop: 5 },
  linkButton: { marginTop: 20, alignItems: "center" },
  linkText: { color: "#075E54", fontSize: 14, fontWeight: "500" },
});
