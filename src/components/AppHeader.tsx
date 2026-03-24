import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function AppHeader({
  title,
  showBack = true,
  rightIcon,
  onRightPress,
}: any) {

  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>

      {/* LEFT */}
      <TouchableOpacity
        style={styles.side}
        onPress={() => showBack && navigation.goBack()}
      >
        {showBack && (
          <Ionicons name="arrow-back" size={24} color="#000" />
        )}
      </TouchableOpacity>

      {/* TITLE */}
      <Text style={styles.title}>{title}</Text>

      {/* RIGHT */}
      <TouchableOpacity
        style={styles.side}
        onPress={onRightPress}
        activeOpacity={0.7}
      >
        {rightIcon && (
          <Ionicons name={rightIcon} size={26} color="#FF7A00" />
        )}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,

    elevation: 5,
    zIndex: 999,           // 🔥 IMPORTANT
    position: "relative",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  side: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});