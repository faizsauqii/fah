import * as Location from "expo-location";

export async function getCurrentCoords() {
  let permission;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new Error("Tidak bisa meminta izin lokasi di perangkat ini.");
  }
  if (permission.status !== "granted") {
    throw new Error("Izin lokasi ditolak. Aktifkan izin lokasi untuk JamHijau di pengaturan HP, lalu coba lagi.");
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      lat: Number(pos.coords.latitude.toFixed(4)),
      lon: Number(pos.coords.longitude.toFixed(4)),
    };
  } catch {
    throw new Error("Lokasi tidak bisa ditentukan. Pastikan GPS/Location di HP menyala, lalu coba lagi.");
  }
}
