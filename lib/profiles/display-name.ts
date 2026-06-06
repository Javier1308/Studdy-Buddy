export type ProfileDisplayNameSource = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export function getProfileDisplayName(
  profile: ProfileDisplayNameSource | null | undefined,
  fallback = "Sin nombre"
) {
  const displayName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();

  return displayName || profile?.email || fallback;
}
