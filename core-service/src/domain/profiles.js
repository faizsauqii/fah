export const PROFILES = Object.freeze([
  { value: 'umum', label: 'Umum', sensitive: false },
  { value: 'asma', label: 'Asma / penyakit paru', sensitive: true },
  { value: 'lansia', label: 'Lansia', sensitive: true },
  { value: 'ibu_hamil', label: 'Ibu hamil', sensitive: true },
  { value: 'anak', label: 'Anak', sensitive: true },
]);

export const PROFILE_VALUES = PROFILES.map((p) => p.value);

export function isSensitiveProfile(value) {
  return PROFILES.find((p) => p.value === value)?.sensitive ?? false;
}
