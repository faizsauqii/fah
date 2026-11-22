import { render, screen, fireEvent } from "@testing-library/react-native";
import Button from "../src/components/Button";
import StateView from "../src/components/StateView";
import RiskBadge from "../src/components/RiskBadge";

describe("<Button />", () => {
  test("memanggil onPress saat ditekan", async () => {
    const onPress = jest.fn();
    await render(<Button title="Masuk" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Masuk"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("loading: judul diganti spinner dan tombol tidak bereaksi", async () => {
    const onPress = jest.fn();
    await render(<Button title="Masuk" onPress={onPress} loading />);
    expect(screen.queryByText("Masuk")).toBeNull();
    await fireEvent.press(screen.getByTestId("button-spinner"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("<StateView />", () => {
  test("error menampilkan pesan dan tombol Coba Lagi", async () => {
    const onRetry = jest.fn();
    await render(<StateView error={{ message: "Tidak dapat terhubung ke server.", code: "NETWORK_ERROR" }} onRetry={onRetry} />);
    expect(screen.getByText("Tidak dapat terhubung ke server.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Coba Lagi"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("data kosong menampilkan teks kosong", async () => {
    await render(<StateView empty emptyText="Belum ada lokasi tersimpan." />);
    expect(screen.getByText("Belum ada lokasi tersimpan.")).toBeTruthy();
  });
});

describe("<RiskBadge />", () => {
  test("tingkat dikenal tampil dengan label", async () => {
    await render(<RiskBadge level="HIJAU" />);
    expect(screen.getByText("Hijau · Aman")).toBeTruthy();
  });

  test("tingkat tidak dikenal tidak ditebak", async () => {
    await render(<RiskBadge level="UNGU" />);
    expect(screen.getByText("Tidak diketahui")).toBeTruthy();
  });
});
