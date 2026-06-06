type SurveyData = {
  learning_style?: string;
  preferred_tone?: string;
  struggles_with?: string;
  additional_notes?: string;
  explanation_depth?: string;
  student_interests?: string;
  examples_that_worked?: string;
};

export function generateMockSkillMd(
  surveyData: SurveyData,
  regenerationReason?: string
) {
  return `# Student Learning Profile

## Teaching Tone
${surveyData.preferred_tone ?? "friendly"}

## Explanation Style
${surveyData.learning_style ?? "step_by_step"}

## Personalization Anchors
- ${surveyData.student_interests ?? "not specified"}
- ${surveyData.examples_that_worked ?? "not specified"}

## What to Avoid
- Avoid rushing the student.
- Avoid long explanations without checking understanding.
- Main difficulty observed: ${surveyData.struggles_with ?? "not specified"}

## Explanation Depth
${surveyData.explanation_depth ?? "step_by_step"}

## Encouragement Pattern
Use short, encouraging feedback. Before solving, ask the student to identify the key data in the question.

## Additional Tutor Notes
${surveyData.additional_notes ?? "not specified"}

${
  regenerationReason
    ? `## Regeneration Context
This skill.md was regenerated because: ${regenerationReason}`
    : ""
}
`;
}
