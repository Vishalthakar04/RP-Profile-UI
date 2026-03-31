import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNavBar from "../../components/BottomNavbar";
import DateTimePicker from "@react-native-community/datetimepicker";

const OPTIONS = ["Travel", "Food", "Accommodation", "Miscellaneous"];

export default function ExpenseScreen({ navigation }: any) {
  const [selectedType, setSelectedType] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);

  const [expenses, setExpenses] = useState<Array<{id:number; type:string; amount:string; date:string; status:string;}>>([]);
  const [error, setError] = useState<string | null>(null);

  const isUploadVisible = Number(amount) > 100;

  const resetForm = () => {
    setSelectedType("");
    setAmount("");
    setDate(null);
    setShowDate(false);
  };

  const handleSubmit = () => {
    if (!selectedType) {
      setError("Please choose an expense type.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!date) {
      setError("Please select a date.");
      return;
    }

    const newExpense = {
      id: Date.now(),
      type: selectedType,
      amount: parseFloat(amount).toFixed(2),
      date: date.toLocaleDateString("en-IN"),
      status: "Submitted",
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setError(null);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FF7A00" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Expense Management</Text>

        <View style={styles.profileIcon}>
          <Ionicons name="person" size={18} color="#FF7A00" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>➕ Add New Expense</Text>

          {/* DROPDOWN */}
          <Text style={styles.label}>Expense Type</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Text style={{ color: selectedType ? "#000" : "#9CA3AF" }}>
                {selectedType || "Select Category"}
              </Text>
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdown}>
                {OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedType(item);
                      setShowDropdown(false);
                    }}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* AMOUNT + DATE */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDate(true)}
              >
                <Text style={{ color: date ? "#000" : "#9CA3AF" }}>
                  {date
                    ? date.toLocaleDateString("en-IN")
                    : "Select Date"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DATE PICKER */}
          {showDate && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDate(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* UPLOAD (ONLY >100) */}
          {isUploadVisible && (
            <>
              <Text style={styles.label}>Upload Bill</Text>
              <View style={styles.uploadBox}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={30}
                  color="#9CA3AF"
                />
                <Text style={styles.uploadText}>Tap to upload</Text>
              </View>
            </>
          )}
        </View>

        {/* BUTTONS ABOVE */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.draftBtn} onPress={resetForm}>
            <Text style={styles.draftText}>Save as Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
        </View>

        {/* SUBMITTED EXPENSES LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>Submitted Expenses</Text>
          <Text style={styles.sectionHeaderCount}>{expenses.length} item(s)</Text>
        </View>

        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses submitted yet.</Text>
        ) : (
          expenses.map((e) => (
            <View key={e.id} style={styles.expenseRow}>
              <View>
                <Text style={styles.expenseType}>{e.type}</Text>
                <Text style={styles.expenseDate}>{e.date}</Text>
              </View>
              <View style={styles.expenseAmountWrapper}>
                <Text style={styles.expenseAmount}>₹{e.amount}</Text>
                <Text style={styles.expenseStatus}>{e.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FIXED NAVBAR */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 4,
  },

  headerTitle: { fontSize: 18, fontWeight: "700" },

  profileIcon: {
    backgroundColor: "#FFE8D6",
    padding: 8,
    borderRadius: 20,
  },

  card: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 15,
    borderRadius: 12,
  },

  cardTitle: { fontWeight: "700", marginBottom: 10 },

  label: { marginTop: 10, fontWeight: "600" },

  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
  },

  dropdownContainer: {
    position: "relative",
    zIndex: 999,
  },

  dropdown: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 4,
    maxHeight: 170,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#f5f5f5",
  },

  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    padding: 30,
    alignItems: "center",
    marginTop: 10,
    borderRadius: 10,
  },

  uploadText: { color: "#9CA3AF", marginTop: 5 },

  footer: {
    flexDirection: "row",
    marginHorizontal: 15,
    marginTop: 10,
    gap: 10,
  },

  draftBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#F97316",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  draftText: { color: "#F97316" },

  submitBtn: {
    flex: 1,
    backgroundColor: "#F97316",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  submitText: { color: "#fff", fontWeight: "700" },

  errorText: { color: "#EF4444", paddingHorizontal: 15, marginTop: 10 },

  sectionHeader: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 15,
  },

  sectionHeaderTitle: { fontWeight: "700", color: "#111827" },
  sectionHeaderCount: { color: "#6B7280" },

  emptyText: {
    paddingHorizontal: 15,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 15,
  },

  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 15,
    marginBottom: 10,
  },

  expenseType: { fontWeight: "700", color: "#111827" },
  expenseDate: { color: "#6B7280", marginTop: 3 },

  expenseAmountWrapper: { alignItems: "flex-end" },
  expenseAmount: { fontWeight: "700", color: "#111827", fontSize: 16 },
  expenseStatus: { color: "#16A34A", marginTop: 2 },

});