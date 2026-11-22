import { useCallback } from "react";
import { View, FlatList, Alert, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import HeaderBar from "../components/HeaderBar";
import StateView from "../components/StateView";
import GuestGate from "../components/GuestGate";
import ListCard from "../components/ListCard";
import useApiData from "../hooks/useApiData";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { COLORS } from "../theme/colors";

export default function LokasiScreen({ navigation }) {
  const { token, isLoggedIn, handleAuthError } = useAuth();
  const { data, loading, error, reload, setData } = useApiData(() => Api.getLocations(token), [token], {
    enabled: isLoggedIn,
    auto: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) reload();
    }, [isLoggedIn, reload]),
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Lokasi Tersimpan" subtitle="Rumah, kantor, taman" />
        <GuestGate feature="lokasi tersimpan" />
      </View>
    );
  }

  const locations = data?.locations ?? [];

  const hapus = (loc) =>
    Alert.alert("Hapus lokasi?", `"${loc.name}" akan dihapus beserta rencana di lokasi ini.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await Api.deleteLocation(token, loc.id);
            setData({ locations: locations.filter((l) => l.id !== loc.id) });
          } catch (e) {
            if (!(await handleAuthError(e))) Alert.alert("Gagal menghapus", Api.friendlyMessage(e));
          }
        },
      },
    ]);

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Lokasi Tersimpan"
        subtitle={data ? `${locations.length} lokasi` : "Rumah, kantor, taman"}
        rightIcon="add-circle-outline"
        rightLabel="Tambah lokasi"
        onRightPress={() => navigation.navigate("TambahLokasi")}
      />
      <FlatList
        data={error || loading ? [] : locations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={reload}
        renderItem={({ item }) => (
          <ListCard
            icon="location-outline"
            title={item.name}
            subtitle={`${item.lat}, ${item.lon}`}
            onDelete={() => hapus(item)}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={loading}
            error={error}
            onRetry={reload}
            empty
            emptyIcon="map-outline"
            emptyText={"Belum ada lokasi tersimpan.\nKetuk + di kanan atas untuk menambah."}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, flexGrow: 1 },
});
