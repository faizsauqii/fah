process.env.EXPO_PUBLIC_API_URL = "https://contoh.test/api/";
const Api = require("../src/services/ApiService");

const respond = (status, body) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body)),
  });

const errorBody = (code, message, details) => ({ error: { code, message, ...(details ? { details } : {}) } });

describe("ApiService", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test("BASE_URL dari .env, garis miring di akhir dibuang", () => {
    expect(Api.BASE_URL).toBe("https://contoh.test/api");
  });

  test("login mengirim email & password ke /auth/login", async () => {
    const user = { id: "u1", email: "demo@fah.stei.site", name: "Akun Uji", role: "user" };
    fetch.mockReturnValueOnce(respond(200, { accessToken: "jwt", tokenType: "Bearer", expiresIn: 604800, user }));
    const res = await Api.login(" demo@fah.stei.site ", "rahasia123");
    expect(res.accessToken).toBe("jwt");
    const [url, opt] = fetch.mock.calls[0];
    expect(url).toBe("https://contoh.test/api/auth/login");
    expect(opt.method).toBe("POST");
    expect(JSON.parse(opt.body)).toEqual({ email: "demo@fah.stei.site", password: "rahasia123" });
    expect(opt.headers.Authorization).toBeUndefined();
  });

  test("getMe mengirim header Bearer dan mengembalikan user", async () => {
    fetch.mockReturnValueOnce(respond(200, { user: { id: "u1", name: "Akun Uji" } }));
    const user = await Api.getMe("abc.def.ghi");
    expect(user.name).toBe("Akun Uji");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  test("401 login: pesan server dipakai apa adanya", async () => {
    fetch.mockReturnValueOnce(respond(401, errorBody("UNAUTHENTICATED", "Email atau password salah.")));
    const err = await Api.login("a@b.co", "salah").catch((e) => e);
    expect(err).toBeInstanceOf(Api.ApiError);
    expect(err.status).toBe(401);
    expect(Api.friendlyMessage(err)).toBe("Email atau password salah.");
  });

  test("400 register: details diubah menjadi error per field", async () => {
    fetch.mockReturnValueOnce(
      respond(
        400,
        errorBody("VALIDATION_ERROR", "Data pendaftaran tidak valid.", [
          { field: "email", issue: "invalid_format" },
          { field: "password", issue: "too_short" },
        ]),
      ),
    );
    const err = await Api.register("Budi", "x", "1").catch((e) => e);
    expect(Api.fieldErrors(err)).toEqual({ email: "Format tidak valid", password: "Terlalu pendek" });
  });

  test("409 register: kode CONFLICT terbaca", async () => {
    fetch.mockReturnValueOnce(respond(409, errorBody("CONFLICT", "Email sudah terdaftar.")));
    const err = await Api.register("Budi", "budi@itb.ac.id", "rahasia123").catch((e) => e);
    expect(err.code).toBe("CONFLICT");
    expect(Api.friendlyMessage(err)).toBe("Email sudah terdaftar.");
  });

  test("501 dari core-service -> pesan fitur belum tersedia", async () => {
    fetch.mockReturnValueOnce(respond(501, errorBody("NOT_IMPLEMENTED", "Endpoint belum dibuat.")));
    const err = await Api.getRisk({ lat: -6.89, lon: 107.61, profile: "asma" }).catch((e) => e);
    expect(fetch.mock.calls[0][0]).toBe("https://contoh.test/api/risk?lat=-6.89&lon=107.61&profile=asma");
    expect(Api.friendlyMessage(err)).toBe("Fitur ini belum tersedia di server JamHijau.");
  });

  test("jaringan putus -> NETWORK_ERROR, tidak crash", async () => {
    fetch.mockReturnValueOnce(Promise.reject(new TypeError("Network request failed")));
    const err = await Api.getHealth().catch((e) => e);
    expect(err.status).toBe(0);
    expect(err.code).toBe("NETWORK_ERROR");
  });

  test("server tidak menjawab -> TIMEOUT setelah batas waktu", async () => {
    jest.useFakeTimers();
    fetch.mockImplementationOnce(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("Aborted")));
        }),
    );
    const pending = Api.request("/health", { timeoutMs: 1000 }).catch((e) => e);
    jest.advanceTimersByTime(1000);
    const err = await pending;
    jest.useRealTimers();
    expect(err.code).toBe("TIMEOUT");
  });

  test("halaman HTML 530 dari Cloudflare -> BAD_GATEWAY, bukan error parsing", async () => {
    fetch.mockReturnValueOnce(respond(530, "<html>Error 1033</html>"));
    const err = await Api.getHealth().catch((e) => e);
    expect(err.code).toBe("BAD_GATEWAY");
    expect(Api.friendlyMessage(err)).toMatch(/tidak tersedia/);
  });

  test("204 No Content -> null", async () => {
    fetch.mockReturnValueOnce(respond(204));
    await expect(Api.deleteLocation("t", "id 1")).resolves.toBeNull();
    expect(fetch.mock.calls[0][0]).toBe("https://contoh.test/api/me/locations/id%201");
  });
});
