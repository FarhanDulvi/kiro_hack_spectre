import type { WorkerGroup } from "@/lib/types";

/**
 * Fictional demo groups. `district` is the administrative district MetMalaysia
 * uses in its warnings; `town` is the place name local agencies use.
 * Locations are approximate town centres.
 */
export const GROUPS: WorkerGroup[] = [
  { id: "kilang-klang", name: "Kilang Klang", community: "Bangladeshi workers", state: "Selangor", district: "Klang", town: "Klang", lang: "bn", members: 240, lat: 3.0449, lng: 101.4456 },
  { id: "tapak-shah-alam", name: "Tapak bina Shah Alam", community: "Nepali workers", state: "Selangor", district: "Petaling", town: "Shah Alam", lang: "ne", members: 180, lat: 3.0733, lng: 101.5185 },
  { id: "pelabuhan-klang", name: "Pelabuhan Klang", community: "Myanmar workers", state: "Selangor", district: "Klang", town: "Port Klang", lang: "my", members: 130, lat: 3.0003, lng: 101.3925 },
  { id: "kilang-seksyen-26", name: "Kilang Seksyen 26", community: "Pakistani workers", state: "Selangor", district: "Petaling", town: "Shah Alam", lang: "ur", members: 90, lat: 3.035, lng: 101.53 },
  { id: "restoran-pj", name: "Restoran PJ", community: "Indian workers", state: "Selangor", district: "Petaling", town: "Petaling Jaya", lang: "hi", members: 60, lat: 3.1073, lng: 101.6067 },
  { id: "ladang-kemaman", name: "Ladang Kemaman", community: "Indonesian workers", state: "Terengganu", district: "Kemaman", town: "Chukai", lang: "id", members: 310, lat: 4.2333, lng: 103.4167 },
  { id: "kilang-kuantan", name: "Kilang Kuantan", community: "Bangladeshi workers", state: "Pahang", district: "Kuantan", town: "Kuantan", lang: "bn", members: 150, lat: 3.8077, lng: 103.326 },
  { id: "asrama-kota-bharu", name: "Asrama Kota Bharu", community: "Nepali workers", state: "Kelantan", district: "Kota Bharu", town: "Kota Bharu", lang: "ne", members: 120, lat: 6.1254, lng: 102.2381 },
];

/** The demo siren box lives in this group's dormitory. */
export const SIREN_GROUP_ID = "kilang-klang";
