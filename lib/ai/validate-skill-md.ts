const REQUIRED_SECTIONS = [
  "# Student Learning Profile",
  "## Teaching Tone",
  "## Explanation Style",
  "## Personalization Anchors",
  "## What to Avoid",
  "## Explanation Depth",
  "## Encouragement Pattern",
];

export function validateSkillMd(skillMd: string | null | undefined) {
  if (!skillMd || skillMd.trim().length === 0) {
    return {
      valid: false,
      reason: "El skill.md está vacío.",
    };
  }

  if (skillMd.length > 8000) {
    return {
      valid: false,
      reason: "El skill.md es demasiado largo.",
    };
  }

  const missingSections = REQUIRED_SECTIONS.filter(
    (section) => !skillMd.includes(section)
  );

  if (missingSections.length > 0) {
    return {
      valid: false,
      reason: `Faltan secciones obligatorias: ${missingSections.join(", ")}`,
    };
  }

  return {
    valid: true,
    reason: null,
  };
}
