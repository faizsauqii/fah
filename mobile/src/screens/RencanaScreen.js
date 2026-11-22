import { useCallback } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import HeaderBar from "../components/HeaderBar";
import StateView from "../components/StateView";
import GuestGate from "../components/GuestGate";
import ListCard from "../components/ListCard";
import useApiData from "../hooks/useApiData";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { clockFromIso, dateFromIso } from "../utils/time";
import { COLORS } from "../theme/colors";

export default function RencanaScreen({ navigation }) {
  const { token, isLoggedIn } = useAuth();
  const { data, loading, error, reload } = useApiData(() => Api.getPlans(token), [token], {
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
        <HeaderBar title="Rencana Aktivitas" subtitle="Cari jam hijau terbaik" />
        <GuestGate feature="rencana aktivitas" />
      </View>
    );
  }

  const plans = data?.plans ?? [];

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Rencana Aktivitas"
        subtitle={data ? `${plans.length} rencana` : "Cari jam hijau terbaik"}
        rightIcon="add-circle-outline"
        rightLabel="Tambah rencana"
        onRightPress={() => navigation.navigate("TambahRencana")}
      />
      <FlatList
        data={error || loading ? [] : plans}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={false}
        onRefresh={reload}
        renderItem={({ item }) => (
          <ListCard
            icon="calendar-outline"
            title={item.title}
            subtitle={`${item.locationName ?? "Lokasi"} · ${dateFromIso(item.startAt)}, ${clockFromIso(item.startAt)}–${clockFromIso(item.endAt)}`}
            onPress={() => navigation.navigate("DetailRencana", { plan: item })}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={loading}
            error={error}
            onRetry={reload}
            empty
            emptyIcon="calendar-clear-outline"
            emptyText={"Belum ada rencana.\nKetuk + untuk membuat rencana dan dapatkan saran jam hijau."}
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
