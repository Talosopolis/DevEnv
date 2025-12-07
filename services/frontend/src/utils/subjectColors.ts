// Utility function to get the color class for a subject based on its category

export function getSubjectColor(subject: string): string {
  const subjectLower = subject.toLowerCase();
  
  // Science subjects - green
  const scienceKeywords = ['biology', 'physics', 'chemistry', 'science', 'anatomy', 'botany', 'zoology', 'geology', 'environmental'];
  if (scienceKeywords.some(keyword => subjectLower.includes(keyword))) {
    return 'bg-green-600 text-white hover:bg-green-700';
  }
  
  // Language subjects - yellow
  const languageKeywords = ['english', 'spanish', 'french', 'chinese', 'german', 'japanese', 'italian', 'language', 'literature', 'writing', 'reading'];
  if (languageKeywords.some(keyword => subjectLower.includes(keyword))) {
    return 'bg-yellow-500 text-white hover:bg-yellow-600';
  }
  
  // Math subjects - orange
  const mathKeywords = ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'arithmetic'];
  if (mathKeywords.some(keyword => subjectLower.includes(keyword))) {
    return 'bg-orange-600 text-white hover:bg-orange-700';
  }
  
  // History subjects - blue
  const historyKeywords = ['history', 'social studies', 'geography', 'religion', 'civics', 'government', 'economics', 'anthropology', 'archaeology'];
  if (historyKeywords.some(keyword => subjectLower.includes(keyword))) {
    return 'bg-blue-600 text-white hover:bg-blue-700';
  }
  
  // Default color for other subjects
  return 'bg-gray-600 text-white hover:bg-gray-700';
}
