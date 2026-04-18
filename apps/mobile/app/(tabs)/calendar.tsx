// apps/mobile/app/(tabs)/calendar.tsx

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import type { Availability, AvailabilityCreate } from "@mysitter/types";
import { useAuth } from "../../hooks/useAuth";
import {
  useMyProviderProfile,
  useProviderAvailability,
  useCreateAvailability,
  useDeleteAvailability,
} from "../../hooks/useProviders";
import { Ionicons } from "@expo/vector-icons";

function ProviderCalendarScreen() {
  const { data: profile } = useMyProviderProfile();
  const {
    data: availability,
    isLoading,
    error,
    refetch,
  } = useProviderAvailability(profile?.id);
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();
  const [modalVisible, setModalVisible] = useState(false);

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Availability",
      "Are you sure you want to delete this availability block?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAvailability.mutateAsync(id);
            } catch (e: any) {
              Alert.alert("Delete failed", e.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 20 }} />;
  }

  if (error) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Could not load your schedule. Pull down to retry.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Add Block</Text>
      </Pressable>
      <FlatList
        data={availability}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AvailabilityRow item={item} onDelete={handleDelete} />
        )}
        onRefresh={refetch}
        refreshing={isLoading}
      />
      <AddBlockModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={async (data) => {
          try {
            await createAvailability.mutateAsync(data);
            setModalVisible(false);
          } catch (e: any) {
            Alert.alert("Save failed", e.message);
          }
        }}
      />
    </View>
  );
}

function AvailabilityRow({
  item,
  onDelete,
}: {
  item: Availability;
  onDelete: (id: string) => void;
}) {
  const formatRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return `${new Intl.DateTimeFormat("en-US", options).format(
      startDate
    )} – ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(endDate)}`;
  };

  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>
        {formatRange(item.start_at, item.end_at)}
      </Text>
      <Pressable onPress={() => onDelete(item.id)}>
        <Ionicons name="trash-outline" size={24} color="red" />
      </Pressable>
    </View>
  );
}

function AddBlockModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AvailabilityCreate) => Promise<void>;
}) {
  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(new Date());
  const [rrule, setRrule] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = () => {
    onSubmit({
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      rrule_string: rrule || undefined,
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Availability</Text>

          <Pressable onPress={() => setShowStartPicker(true)}>
            <Text>Start: {startAt.toLocaleString()}</Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker
              value={startAt}
              mode="datetime"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) setStartAt(date);
              }}
            />
          )}

          <Pressable onPress={() => setShowEndPicker(true)} style={{marginTop: 10}}>
            <Text>End: {endAt.toLocaleString()}</Text>
          </Pressable>
          {showEndPicker && (
            <DateTimePicker
              value={endAt}
              mode="datetime"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndAt(date);
              }}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR (optional)"
            value={rrule}
            onChangeText={setRrule}
          />

          <View style={styles.modalButtons}>
            <Pressable style={styles.button} onPress={onClose}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSave]} onPress={handleSave}>
              <Text style={{color: 'white'}}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CalendarTab() {
  const { user } = useAuth();
  const router = useRouter();

  if (user?.role !== "PROVIDER") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>This feature is for providers.</Text>
        <Pressable onPress={() => router.replace("/(tabs)/bookings")}>
          <Text style={{ color: "blue", marginTop: 10 }}>View your bookings</Text>
        </Pressable>
      </View>
    );
  }

  return <ProviderCalendarScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  addButton: {
    backgroundColor: "#007bff",
    padding: 10,
    margin: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%'
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 15,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 15,
    paddingHorizontal: 10,
    width: '100%'
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    width: '100%'
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
  },
  buttonSave: {
    backgroundColor: "#007bff",
  },
});