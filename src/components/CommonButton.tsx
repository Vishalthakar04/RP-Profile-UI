// src/components/CommonButton.tsx

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}

export default function CommonButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && { backgroundColor: "#9CA3AF" },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#F97316",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  text: {
    color: "#fff",
    fontWeight: "700",
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },
});