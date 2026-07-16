import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Toast } from "../../../components/ui/Toast";
import { ProgressState } from "../../../components/ui/ProgressState";
import { COLORS } from "../../../constants/theme";
import {
  PaperPlaneRight,
  Robot,
  Trash,
  ArrowLeft,
  Sparkle,
} from "phosphor-react-native";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const MAX_CHARS = 1000;

const SUGGESTIONS = [
  "How do I negotiate a higher salary?",
  "Tips for a backend developer interview?",
  "How should I write my CV summary?",
  "What skills should I learn in 2025?",
];

export default function ChatScreen() {
  const { profile, user } = useAuthStore();
  const { showToast } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    loadOrCreateSession();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages, sending]);

  const loadOrCreateSession = async () => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }
    try {
      const { data: existing } = await supabase
        .from("ai_chat_sessions")
        .select("id, messages")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        setSessionId(existing.id);
        setMessages(Array.isArray(existing.messages) ? existing.messages : []);
      } else {
        const { data: newSession } = await supabase
          .from("ai_chat_sessions")
          .insert({ user_id: user.id, messages: [] })
          .select("id")
          .single();
        if (newSession) setSessionId(newSession.id);
      }
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  };

  const persistMessages = async (msgs: Message[]) => {
    if (!sessionId || !user) return;
    try {
      await supabase
        .from("ai_chat_sessions")
        .update({ messages: msgs, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } catch {}
  };

  // -- BUG #10 FIX: handleSend accepts optional override text so suggestion chips auto-send
  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || sending) return;
      Keyboard.dismiss();
      setInput("");
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      const updatedWithUser = [...messages, userMessage];
      setMessages(updatedWithUser);
      setSending(true);
      try {
        const history = updatedWithUser
          .slice(-20)
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content }));
        const { data, error } = await supabase.functions.invoke(
          "ai-career-chat",
          {
            method: "POST",
            body: {
              action: "chat",
              message: text,
              history,
              profile_context: {
                job_title: profile?.job_title,
                industry: profile?.industry,
                experience_years: profile?.experience_years,
                target_countries: (profile as any)?.target_countries,
                skills: profile?.skills,
              },
            },
          },
        );
        if (error) throw new Error(error.message);
        const reply =
          data?.reply ||
          data?.message ||
          "Sorry, I could not generate a response right now. Please try again.";
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          created_at: new Date().toISOString(),
        };
        const updatedWithReply = [...updatedWithUser, assistantMessage];
        setMessages(updatedWithReply);
        persistMessages(updatedWithReply);
      } catch (err: unknown) {
        showToast((err as Error).message || "Failed to send message", "error");
        setMessages(messages);
      } finally {
        setSending(false);
      }
    },
    [input, sending, messages, profile, sessionId],
  );

  const handleClearChat = async () => {
    setMessages([]);
    if (sessionId && user) {
      try {
        await supabase
          .from("ai_chat_sessions")
          .update({ messages: [], updated_at: new Date().toISOString() })
          .eq("id", sessionId);
      } catch {}
    }
    showToast("Chat cleared", "success");
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const greeting = `Hi ${firstName}! I'm your AI career assistant. I can help with interview prep, salary negotiation, CV writing, job search strategy, and career advice.\n\nWhat would you like to discuss?`;

  const MessageBubble = React.memo(({ msg }: { msg: Message }) => {
    const isUser = msg.role === "user";
    return (
      <View
        style={[
          styles.bubbleRow,
          isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Robot size={15} color={COLORS.emerald} weight="fill" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <RNText
            style={{
              color: isUser ? "#fff" : COLORS.snow,
              fontSize: 14,
              lineHeight: 21,
              fontFamily: "Outfit-Regular",
            }}
          >
            {msg.content}
          </RNText>
        </View>
      </View>
    );
  });

  const charCount = input.length;
  const isNearLimit = charCount > MAX_CHARS * 0.85;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(16,185,129,0.07)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={COLORS.snow} />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Sparkle size={16} color={COLORS.emerald} weight="fill" />
              </View>
              <View>
                <Text variant="label" color={COLORS.snow}>
                  AI Career Chat
                </Text>
                <RNText
                  style={{
                    fontSize: 11,
                    color: COLORS.emerald,
                    fontFamily: "Outfit-Regular",
                  }}
                >
                  Powered by Claude
                </RNText>
              </View>
            </View>
            {messages.length > 0 && (
              <TouchableOpacity
                onPress={handleClearChat}
                style={styles.clearBtn}
                activeOpacity={0.7}
              >
                <Trash size={16} color={COLORS.fog} />
              </TouchableOpacity>
            )}
          </View>

          {/* BUG #10 FIX: Android input visibility , use "padding" on Android too,
              with a larger keyboardVerticalOffset to ensure the input bar is always visible */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
          >
            {loadingHistory ? (
              <ProgressState
                title="Opening your chat"
                steps={[
                  "Reading your recent messages",
                  "Preparing Alex's context",
                  "Getting the chat ready",
                ]}
                activeStep={0}
              />
            ) : (
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() =>
                  scrollRef.current?.scrollToEnd({ animated: false })
                }
              >
                <GlassCard
                  padding={16}
                  style={{
                    marginBottom: 16,
                    borderColor: "rgba(16,185,129,0.2)",
                    borderWidth: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={styles.aiAvatar}>
                      <Robot size={15} color={COLORS.emerald} weight="fill" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <RNText
                        style={{
                          color: COLORS.snow,
                          fontSize: 14,
                          lineHeight: 21,
                          fontFamily: "Outfit-Regular",
                        }}
                      >
                        {greeting}
                      </RNText>
                    </View>
                  </View>
                </GlassCard>

                {/* BUG #10 FIX: Suggestion chips now auto-send on tap */}
                {messages.length === 0 && (
                  <View style={styles.suggestions}>
                    {SUGGESTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => handleSend(s)}
                        style={styles.suggestionChip}
                        activeOpacity={0.7}
                      >
                        <RNText
                          style={{
                            color: COLORS.emerald,
                            fontSize: 12,
                            fontFamily: "Outfit-Regular",
                          }}
                        >
                          {s}
                        </RNText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}

                {sending && (
                  <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
                    <View style={styles.aiAvatar}>
                      <Robot size={15} color={COLORS.emerald} weight="fill" />
                    </View>
                    <View
                      style={[
                        styles.bubble,
                        styles.bubbleAssistant,
                        {
                          paddingVertical: 14,
                          paddingHorizontal: 18,
                          minWidth: 64,
                          alignItems: "center",
                        },
                      ]}
                    >
                      <ActivityIndicator size="small" color={COLORS.emerald} />
                    </View>
                  </View>
                )}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}

            {/* TEXT INPUT BAR , always visible, always at bottom */}
            <View style={styles.inputBarWrapper}>
              {/* Character counter , only shown when near limit */}
              {isNearLimit && (
                <View style={styles.charCountRow}>
                  <RNText
                    style={[
                      styles.charCount,
                      charCount >= MAX_CHARS && styles.charCountOver,
                    ]}
                  >
                    {charCount}/{MAX_CHARS}
                  </RNText>
                </View>
              )}
              <View style={styles.inputBar}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your message..."
                  placeholderTextColor={COLORS.fog}
                  multiline
                  maxLength={MAX_CHARS}
                  returnKeyType="default"
                  textAlignVertical="center"
                  editable={!sending}
                />
                <TouchableOpacity
                  onPress={() => handleSend()}
                  disabled={!input.trim() || sending}
                  style={[
                    styles.sendBtn,
                    (!input.trim() || sending) && styles.sendBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  {sending ? (
                    <ActivityIndicator size={16} color="#fff" />
                  ) : (
                    <PaperPlaneRight size={18} color="#fff" weight="fill" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.14)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  messagesList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  bubbleRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowAssistant: { justifyContent: "flex-start", alignItems: "flex-end" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(16,185,129,0.14)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { backgroundColor: COLORS.indigo, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderBottomLeftRadius: 4,
  },
  inputBarWrapper: {
    borderTopWidth: 1,
    borderTopColor: COLORS.rim,
    backgroundColor: "rgba(8,14,26,0.97)",
  },
  charCountRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    color: COLORS.fog,
  },
  charCountOver: { color: "#EF4444" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: COLORS.snow,
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.rim,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.emerald,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: "rgba(16,185,129,0.3)" },
});
