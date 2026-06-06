export type SurveySkillInput = {
  learningDifficulties?: string;
  preferredStyle?: string;
  interests?: string;
  avoid?: string;
  notes?: string;
};

function cleanText(value: unknown, fallback = "not specified") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

function formatListFromText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function generateMockSkillMd(
  surveyData: SurveySkillInput,
  regenerationReason = ""
) {
  const learningDifficulties = cleanText(surveyData.learningDifficulties);
  const preferredStyle = cleanText(surveyData.preferredStyle, "step_by_step");
  const interests = cleanText(surveyData.interests);
  const avoid = cleanText(surveyData.avoid);
  const notes = cleanText(surveyData.notes);

  const personalizationAnchors =
    interests === "not specified" ? "- not specified" : formatListFromText(interests);

  const regenerationSection = regenerationReason
    ? `

## Regeneration Context
This skill.md was regenerated because:
${regenerationReason}`
    : "";

  return `# Student Learning Profile

## Teaching Tone
friendly

## Explanation Style
${preferredStyle}

## Personalization Anchors
${personalizationAnchors}

## What to Avoid
- ${avoid}

## Main Difficulty
- ${learningDifficulties}

## Explanation Depth
Adapt depth based on the student's response. Start simple, then add detail if needed.

## Encouragement Pattern
Use short, encouraging feedback. Before solving, ask the student to identify the key data in the question.

## Additional Tutor Notes
${notes}${regenerationSection}
`;
}
