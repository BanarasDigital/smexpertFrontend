import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TextInput,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { DataContext } from "../context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
const NOTE_TYPES = ["general", "follow_up", "meeting", "call", "email", "important"];
const TYPE_LABEL = (t) => t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const NOTE_STATUS = [
  "in_progress",
  "interested",
  "not_interested",
  "follow_up",
  "converted",
  "dropped",
];

const STATUS_LABEL = (t) =>
  t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function LeadUserPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { apiGet, apiPost, apiPut, apiDelete, user } = useContext(DataContext);

  let rawUserId = route?.params?.userId;
  if (typeof rawUserId === "object" && rawUserId?.userId) rawUserId = rawUserId.userId;
  const userId = String(rawUserId || "").trim();

  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [noteType, setNoteType] = useState("general");
  const [noteContent, setNoteContent] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [filterType, setFilterType] = useState("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const [showCallsModal, setShowCallsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedLeadForView, setSelectedLeadForView] = useState(null);
  const [noteStatus, setNoteStatus] = useState("in_progress");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null);

  const pageSize = 20;

  const fetchLeads = async () => {
    setLoading(true);

    const res = await apiGet(`/lead/user/${userId}?page=${page}&limit=${pageSize}`);

    if (res?.success) {
      setLeads(res.leads || []);
      setPage(res.page || 1);
      setPages(res.pages || 1);
      setTotal(res.total || 0);
    }

    setLoading(false);
  };


  useEffect(() => {
    fetchLeads();
  }, [userId, page]);

  const openNotesModal = (lead) => {
    setActiveLead(lead);
    setNoteModalOpen(true);
    setNoteContent("");
    setNoteType("general");
    setNoteStatus("in_progress");
    setEditMode(false);
    setEditNoteId(null);
  };


  const closeNotesModal = () => {
    setNoteModalOpen(false);
    setActiveLead(null);
    setNoteContent("");
    setEditMode(false);
    setEditNoteId(null);
  };

  const refreshLeadNotes = async (leadId) => {
    const res = await apiGet(`/lead/${leadId}/notes`);
    if (res?.success) {
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, notes: res.notes } : l))
      );
      if (selectedLeadForView?._id === leadId)
        setSelectedLeadForView((prev) => ({ ...prev, notes: res.notes }));
      if (activeLead?._id === leadId)
        setActiveLead((prev) => ({ ...prev, notes: res.notes }));
    }
  };

const handleAddOrEditNote = async () => {
  if (!activeLead?._id) {
    alert("Lead not found. Please reopen notes.");
    return;
  }

  if (!noteContent.trim()) {
    alert("Please write note content.");
    return;
  }

  try {
    let res;

    const payload = {
      content: noteContent.trim(),
      type: noteType,
      status: noteStatus,
    };

    if (!editMode) {
      res = await apiPost(`/lead/${activeLead._id}/notes`, payload);
    } else {
      res = await apiPut(
        `/lead/${activeLead._id}/notes/${editNoteId}`,
        payload
      );
    }

    if (!res?.success) {
      alert(res?.message || "Failed to save note");
      return;
    }
    await apiPut(`/lead/${activeLead._id}/status`, {
      status: noteStatus,
    });
    const notesRes = await apiGet(`/lead/${activeLead._id}/notes`);

    if (notesRes?.success) {
      setActiveLead((prev) =>
        prev ? { ...prev, notes: notesRes.notes } : prev
      );

      setSelectedLeadForView((prev) =>
        prev ? { ...prev, notes: notesRes.notes } : prev
      );
    }

    await fetchLeads(); 
    closeNotesModal();
  } catch (err) {
    console.error("Add/Edit note error:", err);
    alert("Something went wrong while saving note");
  }
};


const deleteNote = async (leadId, noteId) => {
  try {
    const res = await apiDelete(`/lead/${leadId}/notes/${noteId}`);

    if (!res?.success) {
      alert(res?.message || "Failed to delete note");
      return;
    }
    const notesRes = await apiGet(`/lead/${leadId}/notes`);

    if (notesRes?.success) {
      setActiveLead((prev) =>
        prev ? { ...prev, notes: notesRes.notes } : prev
      );

      setSelectedLeadForView((prev) =>
        prev ? { ...prev, notes: notesRes.notes } : prev
      );
    }

    await fetchLeads(); 
  } catch (err) {
    console.error("Delete note error:", err);
    alert("Something went wrong while deleting note");
  }
};



  const handleImport = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (pick.canceled) return;

      const file = pick.assets?.[0];
      if (!file) return Alert.alert("Error", "No file selected.");

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name || "import.xlsx",
        type:
          file.mimeType ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const token = await checkSession();
      if (!token) return Alert.alert("Session expired");

      const importUrl = `${API_BASE_URL}/lead/import/${user.branch}/${user._id}`;

      const res = await fetch(importUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      console.log("IMPORT RESULT:", json);

      if (!json.success) {
        return Alert.alert("Import Failed", json.message || "Something went wrong");
      }
      if (json.insertedCount > 0) {
        await fetchLeads();
      }

      Alert.alert(
        "Import Summary",
        `Imported: ${json.imported}
Duplicates: ${json.duplicates}
Failed: ${json.failed}`
      );

    } catch (err) {
      console.log("IMPORT ERROR:", err);
      Alert.alert("Error", "Import failed.");
    }
  };

  const userName = user?.name || user?.fullName || "User";

  const filteredLeads =
    filterType === "all"
      ? leads
      : leads.filter((l) => l.notes?.some((n) => n.type === filterType));

  const totalNotes = leads.reduce((s, l) => s + (l.notes?.length || 0), 0);
  const followups = leads.reduce(
    (s, l) => s + (l.notes?.filter((n) => n.type === "follow_up")?.length || 0),
    0
  );
  const calls = leads.reduce(
    (s, l) => s + (l.notes?.filter((n) => n.type === "call")?.length || 0),
    0
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Leads Assigned to {userName}</Text>
        <Text style={styles.total}>Total: {total}</Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6, marginBottom: 10 }}>

        {/* IMPORT BUTTON */}
        {/* <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: "#22C55E" }]}
          onPress={handleImport}
        >
          <Text style={styles.smallBtnText}>Import</Text>
        </TouchableOpacity> */}

        <TouchableOpacity style={styles.smallBtn} onPress={() => setShowCallsModal(true)}>
          <Text style={styles.smallBtnText}>Calls</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallBtn} onPress={() => setShowEmailModal(true)}>
          <Text style={styles.smallBtnText}>Email</Text>
        </TouchableOpacity>
      </View>


      <View style={styles.analyticsRow}>
        <View style={styles.card}><Text style={styles.cardNumber}>{total}</Text><Text style={styles.cardLabel}>Total Leads</Text></View>
        <View style={styles.card}><Text style={styles.cardNumber}>{totalNotes}</Text><Text style={styles.cardLabel}>Notes Added</Text></View>
        <View style={styles.card}><Text style={styles.cardNumber}>{followups}</Text><Text style={styles.cardLabel}>Follow-ups</Text></View>
        <View style={styles.card}><Text style={styles.cardNumber}>{calls}</Text><Text style={styles.cardLabel}>Calls Logged</Text></View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text style={styles.label}>Filter by Note Type</Text>
        <TouchableOpacity
          style={styles.dropdownBox}
          onPress={() => setFilterDropdownOpen(!filterDropdownOpen)}
        >
          <Text style={styles.dropdownText}>
            {filterType === "all" ? "All Types" : TYPE_LABEL(filterType)}
          </Text>
        </TouchableOpacity>

        {filterDropdownOpen && (
          <View style={styles.dropdownList}>
            {["all", ...NOTE_TYPES].map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => {
                  setFilterType(t);
                  setFilterDropdownOpen(false);
                }}
              >
                <Text>{t === "all" ? "All Types" : TYPE_LABEL(t)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={{ minWidth: 1300 }}>
              <View style={styles.tableHeader}>
                {[
                  "S.No",
                  "Name",
                  "Phone",
                  "Email",
                  "Segment",
                  "Status",
                  "Priority",
                  "Investment",
                  "Branch",
                  "Created",
                  "Notes",
                  "Action"
                ].map((h, i) => (
                  <Text key={i} style={styles.tableHeaderText}>{h}</Text>
                ))}
              </View>

              {/* TABLE ROWS */}
              {filteredLeads.map((lead, index) => (
                <View key={lead._id} style={styles.tableRow}>
                  <Text style={styles.cell}>{index + 1 + (page - 1) * 20}</Text>

                  <Text style={styles.cell}>{lead?.personalInfo?.name}</Text>

                  <Text
                    style={[styles.cell, styles.boldLink]}
                    onPress={() => Linking.openURL(`tel:${lead.personalInfo.phone}`)}
                  >
                    {lead?.personalInfo?.phone || "-"}
                  </Text>

                  <Text
                    style={[styles.cell, styles.boldLink]}
                    onPress={() => Linking.openURL(`mailto:${lead.personalInfo.email}`)}
                  >
                    {lead?.personalInfo?.email || "-"}
                  </Text>

                  <Text style={styles.cell}>{lead?.segment}</Text>
                  <Text style={styles.cell}>{lead?.status}</Text>
                  <Text style={styles.cell}>{lead?.priority}</Text>

                  <Text style={styles.cell}>{lead?.investmentSize?.amount ?? "-"}</Text>
                  <Text style={styles.cell}>{lead?.branch?.name}</Text>

                  <Text style={styles.cell}>
                    {lead?.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString()
                      : "-"}
                  </Text>

                  <Text style={styles.cell}>{lead?.notes?.length || 0}</Text>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openNotesModal(lead)}
                  >
                    <Text style={styles.editBtnText}>Notes</Text>
                  </TouchableOpacity>
                </View>
              ))}

            </View>
          </ScrollView>
        </ScrollView>
      )}


      {total > 20 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(page - 1)}>
            <Text style={styles.pageBtn}>Prev</Text>
          </TouchableOpacity>
          <Text>Page {page} / {pages}</Text>
          <TouchableOpacity disabled={page >= pages} onPress={() => setPage(page + 1)}>
            <Text style={styles.pageBtn}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={noteModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Notes for {activeLead?.personalInfo?.name}</Text>
            <View style={styles.leadMeta}>
              <Text style={styles.leadMetaTitle}>Lead Details</Text>
              <Text style={styles.leadMetaText}>
                Phone: {activeLead?.personalInfo?.phone}
              </Text>
              <Text style={styles.leadMetaText}>
                Email: {activeLead?.personalInfo?.email}
              </Text>
              <Text style={styles.leadMetaText}>
                Segment: {activeLead?.segment}
              </Text>
              <Text style={styles.leadMetaText}>
                Status: {activeLead?.status}
              </Text>
              <Text style={styles.leadMetaText}>
                Priority: {activeLead?.priority}
              </Text>
            </View>
            <Text style={styles.label}>Select Status</Text>

            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Text style={styles.dropdownText}>{STATUS_LABEL(noteStatus)}</Text>
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.dropdownList}>
                {NOTE_STATUS.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNoteStatus(st);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text>{STATUS_LABEL(st)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}


            <Text style={styles.label}>Select Type</Text>

            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              <Text style={styles.dropdownText}>{TYPE_LABEL(noteType)}</Text>
            </TouchableOpacity>

            {showTypeDropdown && (
              <View style={styles.dropdownList}>
                {NOTE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNoteType(t);
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text>{TYPE_LABEL(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Content</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={noteContent}
              onChangeText={setNoteContent}
              placeholderTextColor="#9CA3AF"
              placeholder="Write your note…"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeNotesModal} style={styles.cancelBtn}>
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAddOrEditNote} style={styles.saveBtn}>
                <Text style={{ color: "#fff" }}>
                  {editMode ? "Update Note" : "Save Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCallsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>All Leads with Phone Numbers</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {leads
                .filter((l) => l?.personalInfo?.phone)
                .map((l) => (
                  <TouchableOpacity
                    key={l._id}
                    style={styles.callEmailCard}
                    onPress={() => setSelectedLeadForView(l)}
                  >
                    <View>
                      <Text style={styles.callEmailName}>{l.personalInfo.name}</Text>
                      <Text style={styles.callEmailValue}>{l.personalInfo.phone}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${l.personalInfo.phone}`)}>
                      <Text style={styles.callIcon}>📞</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCallsModal(false)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>All Leads with Email</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {leads
                .filter((l) => l?.personalInfo?.email)
                .map((l) => (
                  <TouchableOpacity
                    key={l._id}
                    style={styles.callEmailCard}
                    onPress={() => setSelectedLeadForView(l)}
                  >
                    <View>
                      <Text style={styles.callEmailName}>{l.personalInfo.name}</Text>
                      <Text style={styles.callEmailValue}>{l.personalInfo.email}</Text>
                    </View>

                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${l.personalInfo.email}`)}>
                      <Text style={styles.callIcon}>✉️</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEmailModal(false)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedLeadForView} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{selectedLeadForView?.personalInfo?.name}</Text>

            <ScrollView style={{ maxHeight: 350 }}>
              {[...(selectedLeadForView?.notes || [])]
                .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
                .map((n) => (
                  <View key={n._id} style={styles.noteBox}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.noteType}>
                        Status: {TYPE_LABEL(n.type)}
                      </Text>

                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setActiveLead(selectedLeadForView);
                            setEditMode(true);
                            setEditNoteId(n._id);
                            setNoteContent(n.content);
                            setNoteType(n.type);
                            setNoteStatus(n.status ?? "in_progress");
                            setSelectedLeadForView(null);
                            setNoteModalOpen(true);
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>✏️</Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                          onPress={() => deleteNote(selectedLeadForView._id, n._id)}
                        >
                          <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.noteContent}>Message: {n.content}</Text>
                    <Text style={styles.noteMeta}>By: {n.addedBy?.name}</Text>
                    <Text style={styles.noteMeta}>
                      At: {new Date(n.updatedAt || n.addedAt).toLocaleString()}
                    </Text>
                  </View>
                ))}

            </ScrollView>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSelectedLeadForView(null)}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  backBtn: { fontSize: 16, color: "#0A84FF" },
  heading: { fontSize: 17, fontWeight: "700", color: "#222" },
  total: { color: "#555" },

  smallBtn: {
    backgroundColor: "#0A84FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnText: { color: "#fff", fontWeight: "600" },

  analyticsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  card: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    padding: 14,
    marginHorizontal: 6,
    borderRadius: 10,
    elevation: 2,
  },
  cardNumber: { fontSize: 20, fontWeight: "700", color: "#0A84FF" },
  cardLabel: { fontSize: 12 },

  label: { fontWeight: "600", marginBottom: 4 },

  dropdownBox: { padding: 12, backgroundColor: "#eee", borderRadius: 6 },
  dropdownText: { fontSize: 14 },
  dropdownList: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", marginTop: 4, borderRadius: 6 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },

  tableHeader: { flexDirection: "row", backgroundColor: "#eee", paddingVertical: 8 },
  tableHeaderText: { width: 120, fontWeight: "700", paddingLeft: 10 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
  },
  cell: { width: 120, paddingLeft: 10 },
  boldLink: { color: "#0A84FF", fontWeight: "600" },
  editBtn: { backgroundColor: "#0A84FF", padding: 6, borderRadius: 6 },
  editBtnText: { color: "#fff" },

  pagination: { flexDirection: "row", justifyContent: "center", marginTop: 10, gap: 16 },
  pageBtn: { color: "#0A84FF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", padding: 18, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },

  leadMeta: { marginBottom: 10 },
  leadMetaTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  leadMetaText: { fontSize: 12, marginBottom: 2 },

  textArea: { backgroundColor: "#f1f1f1", padding: 10, borderRadius: 6, height: 80 },

  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  cancelBtn: { padding: 12 },
  saveBtn: { padding: 12, backgroundColor: "#0A84FF", borderRadius: 8 },

  callEmailCard: {
    padding: 12,
    backgroundColor: "#f8f9fb",
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  callEmailName: { fontSize: 15, fontWeight: "700" },
  callEmailValue: { marginTop: 2, color: "#0A84FF" },
  callIcon: { fontSize: 25 },

  noteBox: {
    backgroundColor: "#f8f9fb",
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  noteType: { fontWeight: "700", color: "#0A84FF", marginBottom: 4 },
  noteContent: { fontSize: 14, marginBottom: 4 },
  noteMeta: { fontSize: 11, color: "#666" },
});