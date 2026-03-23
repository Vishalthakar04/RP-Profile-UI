// src/components/BottomNavBar.tsx

import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type NavItem = {
  name: string;       // route name
  icon: string;       // inactive icon
  activeIcon: string; // active icon
};

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", icon: "home-outline",      activeIcon: "home"          },
  { name: "Schools",   icon: "business-outline",  activeIcon: "business"      },
  { name: "Wallet",    icon: "wallet-outline",    activeIcon: "wallet"        },
  { name: "Reports",   icon: "bar-chart-outline", activeIcon: "bar-chart"     },
  { name: "Profile",   icon: "person-outline",    activeIcon: "person"        },
];

export default function BottomNavBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = route.name === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => {
              if (!isActive) navigation.navigate(item.name);
            }}
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.icon}
              size={22}
              color={isActive ? "#F97316" : "#9CA3AF"}
            />
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F97316",
    marginTop: 3,
  },
});