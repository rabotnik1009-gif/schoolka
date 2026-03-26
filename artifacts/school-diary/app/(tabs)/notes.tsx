import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const NOTES_KEY = "school_notes_v2";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

// ── Editor modal ─────────────────────────────────────────
function EditorModal({
  visible,
  note,
  onSave,
  onClose,
  isDark,
}: {
  visible: boolean;
  note: Note | null;
  onSave: (title: string, content: string) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const contentRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
    }
  }, [visible, note]);

  const handleSave = () => {
    const t = title.trim() || "Заметка";
    const c = content.trim();
    onSave(t, c);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingTop: Platform.OS === "ios" ? 20 : 16 }]}>
          <Pressable onPress={onClose} style={styles.modalHeaderBtn}>
            <Text style={[styles.modalCancelText, { color: Colors.danger, fontFamily: "Inter_500Medium" }]}>Отмена</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {note ? "Редактировать" : "Новая заметка"}
          </Text>
          <Pressable
            onPress={handleSave}
            style={[styles.modalSaveBtn, { backgroundColor: Colors.accent }]}
          >
            <Text style={[styles.modalSaveText, { fontFamily: "Inter_600SemiBold" }]}>Сохранить</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.border, fontFamily: "Inter_700Bold" }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Название заметки..."
            placeholderTextColor={theme.textSecondary}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={contentRef}
            style={[styles.contentInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
            value={content}
            onChangeText={setContent}
            placeholder="Напиши что угодно: домашнее задание, мысли, планы..."
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
            autoFocus={!note}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Rename modal ─────────────────────────────────────────
function RenameModal({
  visible,
  current,
  onRename,
  onClose,
  isDark,
}: {
  visible: boolean;
  current: string;
  onRename: (name: string) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (visible) setValue(current);
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.renameOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.renameBackdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.renameBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.renameTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Переименовать
          </Text>
          <TextInput
            style={[styles.renameInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => { if (value.trim()) onRename(value.trim()); }}
          />
          <View style={styles.renameActions}>
            <Pressable onPress={onClose} style={[styles.renameBtn, { borderColor: theme.border }]}>
              <Text style={[styles.renameBtnText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={() => { if (value.trim()) onRename(value.trim()); }}
              style={[styles.renameBtn, { backgroundColor: Colors.accent, borderColor: Colors.accent }]}
            >
              <Text style={[styles.renameBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Action sheet modal ────────────────────────────────────
function ActionSheet({
  visible,
  note,
  onEdit,
  onRename,
  onDelete,
  onClose,
  isDark,
}: {
  visible: boolean;
  note: Note | null;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetBackdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
        <Text style={[styles.sheetNoteTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {note?.title ?? ""}
        </Text>
        {[
          { icon: "pencil-outline", label: "Редактировать", action: onEdit, color: Colors.accent },
          { icon: "text-outline", label: "Переименовать", action: onRename, color: Colors.warning },
          { icon: "trash-outline", label: "Удалить", action: onDelete, color: Colors.danger },
        ].map((item, i) => (
          <Pressable
            key={i}
            onPress={item.action}
            style={({ pressed }) => [
              styles.sheetItem,
              { borderTopColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name={item.icon as any} size={20} color={item.color} />
            <Text style={[styles.sheetItemText, { color: item.color, fontFamily: "Inter_500Medium" }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.sheetCancel, { backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.sheetCancelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Закрыть</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────
export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [notes, setNotes] = useState<Note[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Load notes from storage
  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY).then((v) => {
      if (v) {
        try { setNotes(JSON.parse(v)); } catch {}
      }
    });
  }, []);

  const persist = useCallback(async (updated: Note[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  }, []);

  const handleCreate = useCallback(() => {
    setActiveNote(null);
    setEditorOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEditorSave = useCallback(async (title: string, content: string) => {
    if (activeNote) {
      const updated = notes.map((n) =>
        n.id === activeNote.id ? { ...n, title, content, updatedAt: Date.now() } : n
      );
      await persist(updated);
    } else {
      const newNote: Note = { id: genId(), title, content, updatedAt: Date.now() };
      await persist([newNote, ...notes]);
    }
    setEditorOpen(false);
    setActionOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activeNote, notes, persist]);

  const handleLongPress = useCallback((note: Note) => {
    setActiveNote(note);
    setActionOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleEdit = useCallback(() => {
    setActionOpen(false);
    setTimeout(() => setEditorOpen(true), 300);
  }, []);

  const handleRenameOpen = useCallback(() => {
    setActionOpen(false);
    setTimeout(() => setRenameOpen(true), 300);
  }, []);

  const handleRename = useCallback(async (name: string) => {
    if (!activeNote) return;
    const updated = notes.map((n) =>
      n.id === activeNote.id ? { ...n, title: name, updatedAt: Date.now() } : n
    );
    await persist(updated);
    setRenameOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activeNote, notes, persist]);

  const handleDelete = useCallback(async () => {
    if (!activeNote) return;
    const updated = notes.filter((n) => n.id !== activeNote.id);
    await persist(updated);
    setActionOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [activeNote, notes, persist]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Заметки</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {notes.length} {notes.length === 1 ? "заметка" : notes.length >= 2 && notes.length <= 4 ? "заметки" : "заметок"}
          </Text>
        </View>
        <Pressable
          onPress={handleCreate}
          style={[styles.addBtn, { backgroundColor: Colors.accent }]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Notes list */}
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Нет заметок
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Нажми + чтобы создать первую
          </Text>
          <Pressable
            onPress={handleCreate}
            style={[styles.emptyBtn, { backgroundColor: Colors.accent }]}
          >
            <Ionicons name="add-outline" size={18} color="#fff" />
            <Text style={[styles.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>Новая заметка</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {notes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => { setActiveNote(note); setEditorOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              onLongPress={() => handleLongPress(note)}
              delayLongPress={300}
              style={({ pressed }) => [
                styles.noteCard,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={styles.noteCardTop}>
                <View style={[styles.noteIcon, { backgroundColor: Colors.accent + "18" }]}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.accent} />
                </View>
                <Text style={[styles.noteTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {note.title}
                </Text>
                <Pressable
                  onPress={() => handleLongPress(note)}
                  hitSlop={10}
                  style={styles.noteMenuBtn}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
              {note.content.length > 0 && (
                <Text style={[styles.notePreview, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {note.content}
                </Text>
              )}
              <Text style={[styles.noteTime, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {timeAgo(note.updatedAt)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      {notes.length > 0 && (
        <Pressable
          onPress={handleCreate}
          style={[
            styles.fab,
            {
              backgroundColor: Colors.accent,
              bottom: Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 100,
            },
          ]}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}

      {/* Modals */}
      <EditorModal
        visible={editorOpen}
        note={activeNote}
        onSave={handleEditorSave}
        onClose={() => setEditorOpen(false)}
        isDark={isDark}
      />
      <ActionSheet
        visible={actionOpen}
        note={activeNote}
        onEdit={handleEdit}
        onRename={handleRenameOpen}
        onDelete={handleDelete}
        onClose={() => setActionOpen(false)}
        isDark={isDark}
      />
      <RenameModal
        visible={renameOpen}
        current={activeNote?.title ?? ""}
        onRename={handleRename}
        onClose={() => setRenameOpen(false)}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  noteCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  noteCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  noteIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  noteTitle: { flex: 1, fontSize: 16 },
  noteMenuBtn: { padding: 4 },
  notePreview: { fontSize: 14, lineHeight: 20 },
  noteTime: { fontSize: 11 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20 },
  emptyHint: { fontSize: 14, textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 16 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Editor modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalHeaderBtn: { minWidth: 70 },
  modalCancelText: { fontSize: 15 },
  modalTitle: { fontSize: 16 },
  modalSaveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  modalSaveText: { color: "#fff", fontSize: 14 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  titleInput: {
    fontSize: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 26,
    minHeight: 200,
  },
  // Rename modal
  renameOverlay: { flex: 1, justifyContent: "flex-end" },
  renameBackdrop: { flex: 1 },
  renameBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    margin: 16,
    gap: 14,
  },
  renameTitle: { fontSize: 17, textAlign: "center" },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  renameBtnText: { fontSize: 15 },
  // Action sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 34,
    gap: 4,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetNoteTitle: { fontSize: 15, paddingHorizontal: 4, marginBottom: 8, textAlign: "center" },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderTopWidth: 1,
    borderRadius: 12,
  },
  sheetItemText: { fontSize: 16 },
  sheetCancel: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelText: { fontSize: 16 },
});
