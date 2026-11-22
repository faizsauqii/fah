import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CekRisikoScreen from "../screens/CekRisikoScreen";
import LokasiScreen from "../screens/LokasiScreen";
import TambahLokasiScreen from "../screens/TambahLokasiScreen";
import RencanaScreen from "../screens/RencanaScreen";
import TambahRencanaScreen from "../screens/TambahRencanaScreen";
import DetailRencanaScreen from "../screens/DetailRencanaScreen";
import ProfilScreen from "../screens/ProfilScreen";
import TentangScreen from "../screens/TentangScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  CekRisiko: "leaf",
  Lokasi: "location",
  Rencana: "calendar",
  Profil: "person",
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="CekRisiko" component={CekRisikoScreen} options={{ title: "Cek Risiko" }} />
      <Tab.Screen name="Lokasi" component={LokasiScreen} />
      <Tab.Screen name="Rencana" component={RencanaScreen} />
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { restoring, isLoggedIn, isGuest } = useAuth();

  if (restoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.onPrimary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn || isGuest ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="TambahLokasi" component={TambahLokasiScreen} />
            <Stack.Screen name="TambahRencana" component={TambahRencanaScreen} />
            <Stack.Screen name="DetailRencana" component={DetailRencanaScreen} />
            <Stack.Screen name="Tentang" component={TentangScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary },
});
