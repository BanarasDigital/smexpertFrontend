import React, { useEffect, useState, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { DataContext } from "../context";

const capitalize = (str) =>
  str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getId = (obj) => obj?._id ?? obj?.id ?? String(obj);
const SelectModal = ({ visible, title, options, onSelect, onClose }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>{title}</Text>

        <ScrollView style={{ maxHeight: 260 }}>
          {options.map((op) => (
            <TouchableOpacity
              key={op.value}
              style={styles.modalOption}
              onPress={() => {
                onSelect(op.value);
                onClose();
              }}
            >
              <Text style={styles.modalOptionText}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
          <Text style={styles.modalCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
export default function LeadFormModal({
  visible,
  mode,
  formState,
  setFormState,
  onClose,
  onSubmit,
  loading,
}) {
  const title = mode === "edit" ? "Edit Lead" : "Add Lead";
  const { apiGet } = useContext(DataContext);

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  const [branchModal, setBranchModal] = useState(false);
  const [userModal, setUserModal] = useState(false);

  const [sourceModal, setSourceModal] = useState(false);
  const [segmentModal, setSegmentModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [priorityModal, setPriorityModal] = useState(false);
  useEffect(() => {
    if (!visible) return;

    (async () => {
      try {
        const raw = await apiGet("/admin/branches", {}, null, null, false);

        const list = Array.isArray(raw?.branches)
          ? raw.branches
          : Array.isArray(raw)
            ? raw
            : [];

        if (list.length) {
          const formatted = list.map((b) => ({
            raw: b,
            label: capitalize(b.name),
            value: getId(b),
          }));

          setBranches(formatted);

          const exists = formatted.some(
            (b) => String(b.value) === String(formState.branchId)
          );

          if (!exists) {
            const first = formatted[0];
            setFormState((prev) => ({
              ...prev,
              branchId: String(first.value),
              assignedToId: null,
            }));
          }
        } else {
          setBranches([]);
          setFormState((prev) => ({
            ...prev,
            branchId: null,
            assignedToId: null,
          }));
        }
      } catch {
        setBranches([]);
        setFormState((prev) => ({
          ...prev,
          branchId: null,
          assignedToId: null,
        }));
      }
    })();
  }, [visible]);
  useEffect(() => {
    const fetchUsers = async () => {
      const branchId = formState.branchId;

      if (!branchId) {
        setUsers([]);
        return;
      }

      const valid = branches.some(
        (b) => String(b.value) === String(branchId)
      );

      if (!valid) {
        setUsers([]);
        return;
      }

      try {
        const res = await apiGet(
          `/admin/branches/${branchId}/users`,
          {},
          null,
          null,
          false
        );

        const list = Array.isArray(res?.users) ? res.users : [];

        setUsers(
          list.map((u) => ({
            raw: u,
            label: capitalize(u.name),
            value: getId(u),
          }))
        );
      } catch {
        setUsers([]);
      }
    };

    fetchUsers();
  }, [formState.branchId, branches]);
  const leadSources = [
    "google",
    "fb",
    "ig",
    "website",
    "referral",
  ].map((v) => ({ label: capitalize(v), value: v }));

  const segments = [
    "stock_equity",
    "bank_nifty_option",
    "stock_future",
    "crypto",
    "forex",
  ].map((v) => ({ label: capitalize(v), value: v }));

  const statuses = [
    "unassigned",
    "new",
    "in_progress",
    "interested",
    "follow_up",
    "converted",
    "dropped",
  ].map((v) => ({ label: capitalize(v), value: v }));

  const priorities = ["low", "medium", "high", "urgent"].map((v) => ({
    label: capitalize(v),
    value: v,
  }));

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.sectionLabel}>Personal Info</Text>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formState.name}
              onChangeText={(v) => setFormState({ ...formState, name: v })}
            />

            <Text style={styles.fieldLabel}>Phone *</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={formState.phone}
              onChangeText={(v) => setFormState({ ...formState, phone: v })}
            />

            <Text style={styles.fieldLabel}>Alternate Phone</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={formState.alternatePhone}
              onChangeText={(v) => setFormState({ ...formState, alternatePhone: v })}
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formState.email}
              onChangeText={(v) => setFormState({ ...formState, email: v })}
            />
            <Text style={styles.sectionLabel}>Address</Text>

            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={formState.city}
              onChangeText={(v) => setFormState({ ...formState, city: v })}
            />

            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.input}
              value={formState.state}
              onChangeText={(v) => setFormState({ ...formState, state: v })}
            />

            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput
              style={styles.input}
              value={formState.country}
              onChangeText={(v) => setFormState({ ...formState, country: v })}
            />

            <Text style={styles.fieldLabel}>Pincode</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formState.pincode}
              onChangeText={(v) =>
                setFormState({
                  ...formState,
                  pincode: v.replace(/[^\d]/g, ""),
                })
              }
            />

            {/* Lead Details */}
            <Text style={styles.sectionLabel}>Lead Details</Text>

            <Text style={styles.fieldLabel}>Lead Source</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setSourceModal(true)}
            >
              <Text style={styles.dropdownText}>
                {capitalize(formState.leadSource)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Segment</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setSegmentModal(true)}
            >
              <Text style={styles.dropdownText}>
                {capitalize(formState.segment)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Status</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusModal(true)}
            >
              <Text style={styles.dropdownText}>
                {capitalize(formState.status)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Priority</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPriorityModal(true)}
            >
              <Text style={styles.dropdownText}>
                {capitalize(formState.priority)}
              </Text>
            </TouchableOpacity>

            {/* Investment */}
            <Text style={styles.sectionLabel}>Investment</Text>

            <Text style={styles.fieldLabel}>Investment Amount</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formState.investmentAmount}
              onChangeText={(v) =>
                setFormState({
                  ...formState,
                  investmentAmount: v.replace(/[^\d.]/g, ""),
                })
              }
            />

            {/* Assignment */}
            <Text style={styles.sectionLabel}>Assignment</Text>

            <Text style={styles.fieldLabel}>Branch</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setBranchModal(true)}
            >
              <Text style={styles.dropdownText}>
                {branches.find((b) => b.value === formState.branchId)?.label ||
                  "Select Branch"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Assign To</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setUserModal(true)}
              disabled={users.length === 0}
            >
              <Text style={styles.dropdownText}>
                {formState.assignedToId
                  ? users.find((u) => u.value === formState.assignedToId)?.label
                  : users.length === 0
                    ? "Select branch first"
                    : "Select User"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnSecondary]}
              onPress={onClose}
            >
              <Text style={styles.footerBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={onSubmit}
              disabled={loading}
            >
              <Text style={styles.footerBtnPrimaryText}>
                {loading ? "Saving..." : "Save Lead"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dropdown Modals */}
      <SelectModal
        visible={sourceModal}
        title="Select Lead Source"
        options={leadSources}
        onSelect={(v) => setFormState({ ...formState, leadSource: v })}
        onClose={() => setSourceModal(false)}
      />

      <SelectModal
        visible={segmentModal}
        title="Select Segment"
        options={segments}
        onSelect={(v) => setFormState({ ...formState, segment: v })}
        onClose={() => setSegmentModal(false)}
      />

      <SelectModal
        visible={statusModal}
        title="Select Status"
        options={statuses}
        onSelect={(v) => setFormState({ ...formState, status: v })}
        onClose={() => setStatusModal(false)}
      />

      <SelectModal
        visible={priorityModal}
        title="Select Priority"
        options={priorities}
        onSelect={(v) => setFormState({ ...formState, priority: v })}
        onClose={() => setPriorityModal(false)}
      />

      <SelectModal
        visible={branchModal}
        title="Select Branch"
        options={branches}
        onSelect={(v) =>
          setFormState({ ...formState, branchId: v, assignedToId: null })
        }
        onClose={() => setBranchModal(false)}
      />

      <SelectModal
        visible={userModal}
        title="Select User"
        options={users}
        onSelect={(v) => setFormState({ ...formState, assignedToId: v })}
        onClose={() => setUserModal(false)}
      />
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    maxHeight: "95%",
  },
  handleBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeIcon: { fontSize: 20, color: "#6B7280" },

  body: { marginTop: 4 },

  sectionLabel: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    fontSize: 13,
    color: "#111827",
  },

  dropdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 6,
  },
  dropdownText: {
    fontSize: 13,
    color: "#111827",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    marginBottom:45,
  },
  footerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8,
  },
  footerBtnSecondary: {
    backgroundColor: "#E5E7EB",
  },
  footerBtnSecondaryText: {
    fontWeight: "600",
    color: "#111827",
  },
  footerBtnPrimary: {
    backgroundColor: "#0A84FF",
  },
  footerBtnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    width: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  modalOptionText: { fontSize: 14, color: "#111827" },
  modalCloseBtn: {
    padding: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 10,
  },
  modalCloseText: { textAlign: "center", fontWeight: "600" },
});