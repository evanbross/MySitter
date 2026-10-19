/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import type { PetType } from "@mysitter/types";
import { useCustomerProfile, useUpdateCustomerProfile } from "../hooks/useCustomerProfile";

const HOME_TYPES = ["house", "apartment", "condo", "other"] as const;
const PET_TYPES: PetType[] = ["DOG", "CAT", "BIRD", "FISH", "RABBIT", "REPTILE", "OTHER"];

export default function CustomerProfileScreen() {
  const customerProfileQuery = useCustomerProfile();
  const updateCustomerProfile = useUpdateCustomerProfile();
  const customerProfile = customerProfileQuery.data;

  const [homeType, setHomeType] = useState<string | null>(null);
  const [hasYard, setHasYard] = useState(false);
  const [homeDescription, setHomeDescription] = useState("");
  const [petNameInput, setPetNameInput] = useState("");
  const [petNames, setPetNames] = useState<string[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [petDescription, setPetDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  useEffect(() => {
    if (!customerProfile) return;
    setHomeType(customerProfile.home_type);
    setHasYard(customerProfile.has_yard);
    setHomeDescription(customerProfile.home_description ?? "");
    setPetNames(customerProfile.pet_names ?? []);
    setPetTypes(customerProfile.pet_types ?? []);
    setPetDescription(customerProfile.pet_description ?? "");
    setSpecialInstructions(customerProfile.special_instructions ?? "");
  }, [customerProfile]);

  function addPetName() {
    const value = petNameInput.trim();
    if (!value || petNames.includes(value)) return;
    setPetNames((prev) => [...prev, value]);
    setPetNameInput("");
  }

  function togglePetType(type: PetType) {
    setPetTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  }

  function handleSave() {
    updateCustomerProfile.mutate(
      {
        home_type: homeType,
        has_yard: hasYard,
        home_description: homeDescription,
        pet_names: petNames,
        pet_types: petTypes,
        pet_description: petDescription,
        special_instructions: specialInstructions,
      },
      {
        onSuccess: () => Alert.alert("Saved", "Pets & Home updated."),
        onError: (err) => Alert.alert("Error", err.message),
      },
    );
  }

  if (customerProfileQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Pets & Home" }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Home</Text>

            <View style={styles.pillRow}>
              {HOME_TYPES.map((value) => {
                const selected = homeType === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.pill, selected ? styles.pillSelected : styles.pillUnselected]}
                    onPress={() => setHomeType(value)}
                  >
                    <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Has a yard</Text>
              <Switch value={hasYard} onValueChange={setHasYard} />
            </View>

            <Text style={styles.label}>Describe your home</Text>
            <TextInput
              style={styles.multilineInput}
              value={homeDescription}
              onChangeText={setHomeDescription}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              placeholder="Size, neighborhood, and anything sitters should know."
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.counter}>{homeDescription.length}/2000</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Pets</Text>

            <Text style={styles.label}>Pet names</Text>
            <View style={styles.petNameRow}>
              <TextInput
                style={[styles.input, styles.petNameInput]}
                value={petNameInput}
                onChangeText={setPetNameInput}
                placeholder="Add a pet name"
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
                onSubmitEditing={addPetName}
              />
              <TouchableOpacity style={styles.addButton} onPress={addPetName}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tagList}>
              {petNames.map((name) => (
                <View key={name} style={styles.tag}>
                  <Text style={styles.tagText}>{name}</Text>
                  <TouchableOpacity onPress={() => setPetNames((prev) => prev.filter((item) => item !== name))}>
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.label}>Pet types</Text>
            <View style={styles.checkboxList}>
              {PET_TYPES.map((type) => {
                const selected = petTypes.includes(type);
                return (
                  <TouchableOpacity key={type} style={styles.checkboxRow} onPress={() => togglePetType(type)}>
                    <View style={[styles.checkbox, selected ? styles.checkboxSelected : styles.checkboxUnselected]} />
                    <Text style={styles.checkboxLabel}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Tell sitters about your pets</Text>
            <TextInput
              style={styles.multilineInput}
              value={petDescription}
              onChangeText={setPetDescription}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.counter}>{petDescription.length}/2000</Text>

            <Text style={styles.label}>Special instructions</Text>
            <TextInput
              style={styles.multilineInput}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.counter}>{specialInstructions.length}/1000</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, updateCustomerProfile.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateCustomerProfile.isPending}
          >
            <Text style={styles.saveButtonText}>{updateCustomerProfile.isPending ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  label: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  multilineInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    backgroundColor: "#fff",
  },
  counter: { fontSize: 12, color: "#6b7280", textAlign: "right", marginTop: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillSelected: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" },
  pillUnselected: { backgroundColor: "#fff", borderColor: "#e5e7eb" },
  pillText: { fontSize: 14, fontWeight: "600" },
  pillTextSelected: { color: "#fff" },
  pillTextUnselected: { color: "#6b7280" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 14,
  },
  petNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  petNameInput: { flex: 1 },
  addButton: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  tagRemove: { fontSize: 16, color: "#6b7280", lineHeight: 16 },
  checkboxList: { gap: 8, marginBottom: 14 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  checkboxSelected: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" },
  checkboxUnselected: { backgroundColor: "#fff", borderColor: "#d1d5db" },
  checkboxLabel: { fontSize: 14, color: "#374151" },
  saveButton: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
