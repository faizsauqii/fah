import {
  validateLogin,
  validateRegister,
  validateLocation,
  validatePlan,
  parseCoordinate,
  isValidDate,
} from "../src/utils/validators";

describe("validateLogin", () => {
  test("data valid -> tidak ada error", () => {
    expect(validateLogin({ email: "demo@fah.stei.site", password: "x" })).toEqual({});
  });

  test("email salah format & password kosong -> 2 error", () => {
    const errors = validateLogin({ email: "budi@", password: "" });
    expect(Object.keys(errors)).toEqual(["email", "password"]);
    expect(errors.email).toBe("Format email tidak valid");
  });
});

describe("validateRegister (aturan sama dengan auth-service)", () => {
  const valid = { name: "Budi", email: "budi@itb.ac.id", password: "rahasia123", confirm: "rahasia123" };

  test("data valid -> tidak ada error", () => {
    expect(validateRegister(valid)).toEqual({});
  });

  test("nama hanya spasi -> wajib diisi", () => {
    expect(validateRegister({ ...valid, name: "   " }).name).toBe("Nama wajib diisi");
  });

  test("nama 81 karakter ditolak, 80 diterima", () => {
    expect(validateRegister({ ...valid, name: "a".repeat(81) }).name).toBe("Nama maksimal 80 karakter");
    expect(validateRegister({ ...valid, name: "a".repeat(80) }).name).toBeUndefined();
  });

  test("password 7 karakter ditolak", () => {
    const errors = validateRegister({ ...valid, password: "1234567", confirm: "1234567" });
    expect(errors.password).toBe("Password minimal 8 karakter");
  });

  test("konfirmasi berbeda ditolak", () => {
    expect(validateRegister({ ...valid, confirm: "lain12345" }).confirm).toBe("Konfirmasi password tidak sama");
  });

  test("email dengan spasi di tengah ditolak", () => {
    expect(validateRegister({ ...valid, email: "bu di@itb.ac.id" }).email).toBe("Format email tidak valid");
  });
});

describe("validateLocation", () => {
  test("koordinat dengan koma desimal diterima", () => {
    expect(parseCoordinate("-6,8915")).toBe(-6.8915);
    expect(validateLocation({ name: "Rumah", lat: "-6,8915", lon: "107.6107" })).toEqual({});
  });

  test("latitude di luar rentang & longitude bukan angka ditolak", () => {
    const errors = validateLocation({ name: "Taman", lat: "91", lon: "abc" });
    expect(Object.keys(errors).sort()).toEqual(["lat", "lon"]);
  });
});

describe("validatePlan", () => {
  const valid = { title: "Jalan pagi", locationId: "loc-1", date: "2026-11-28", start: "05:00", end: "09:00" };

  test("data valid -> tidak ada error", () => {
    expect(validatePlan(valid)).toEqual({});
  });

  test("jam selesai sebelum jam mulai ditolak", () => {
    expect(validatePlan({ ...valid, start: "09:00", end: "07:00" }).end).toBe("Jam selesai harus setelah jam mulai");
  });

  test("tanggal yang tidak ada (30 Februari) ditolak", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(validatePlan({ ...valid, date: "2026-02-30" }).date).toBeDefined();
  });

  test("lokasi belum dipilih ditolak", () => {
    expect(validatePlan({ ...valid, locationId: null }).locationId).toBeDefined();
  });
});
