export const HEALTH_PROFILES = [
  { value: "umum", label: "Umum" },
  { value: "asma", label: "Asma / paru" },
  { value: "lansia", label: "Lansia" },
  { value: "ibu_hamil", label: "Ibu hamil" },
  { value: "anak", label: "Anak" },
];

export function profileLabel(value) {
  return HEALTH_PROFILES.find((p) => p.value === value)?.label ?? value;
}
