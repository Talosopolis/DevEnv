import { useState } from "react";
import { LessonPlan, Note } from "../App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Progress } from "./ui/progress";
import { CheckCircle2, XCircle, Trophy, BookOpen, PlayCircle, RotateCcw, StickyNote } from "lucide-react";
import { getSubjectColor } from "../utils/subjectColors";
import { toast } from "sonner@2.0.3";

type QuizProps = {
  lessonPlans: LessonPlan[];
  notes: Note[];
};

type Question = {
  id: number;
  question: string;
  answer: string;
  blankedText: string;
};

type QuizResult = {
  questionId: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export function Quiz({ lessonPlans, notes }: QuizProps) {
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Get lesson plans that have associated notes
  const lessonPlansWithNotes = lessonPlans.filter(lesson => 
    Array.isArray(notes) && notes.some(note => note.lessonPlanId === lesson.id)
  );

  // Get notes for a specific lesson
  const getNotesForLesson = (lessonId: string): Note[] => {
    if (!Array.isArray(notes)) return [];
    return notes.filter(note => note.lessonPlanId === lessonId);
  };

  // Common words to avoid blanking (articles, prepositions, common verbs, etc.)
  const COMMON_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'shall', 'about', 'above', 'across', 'after',
    'against', 'along', 'among', 'around', 'at', 'before', 'behind', 'below',
    'beneath', 'beside', 'between', 'beyond', 'by', 'down', 'during', 'for',
    'from', 'in', 'into', 'like', 'near', 'of', 'off', 'on', 'onto', 'over',
    'through', 'to', 'toward', 'under', 'until', 'up', 'upon', 'with', 'within',
    'without', 'and', 'but', 'or', 'nor', 'so', 'yet', 'as', 'if', 'than',
    'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'then',
    'there', 'very', 'just', 'also', 'often', 'called', 'known', 'used', 'made',
    'because', 'however', 'therefore', 'thus', 'hence', 'while', 'although'
  ]);

  // Parse note content to extract sentences for fill-in-the-blank
  const parseNoteContent = (content: string): { sentence: string; type: 'definition' | 'statement' }[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const sentences: { sentence: string; type: 'definition' | 'statement' }[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Remove bullet points and numbers
      let cleaned = trimmed
        .replace(/^[-•]\s*/, '')
        .replace(/^\d+\.\s*/, '');
      
      // Extract sentences with colons (definitions)
      if (cleaned.includes(':') && !cleaned.includes('http')) {
        const parts = cleaned.split(':');
        if (parts.length === 2 && parts[0].length < 50 && parts[1].trim().length > 15) {
          sentences.push({ sentence: cleaned, type: 'definition' });
        }
      }
      // Regular sentences (longer content)
      else if (cleaned.length > 30 && cleaned.length < 250) {
        // Check if it has meaningful content (not just a header)
        const wordCount = cleaned.split(/\s+/).length;
        if (wordCount >= 6) {
          sentences.push({ sentence: cleaned, type: 'statement' });
        }
      }
    });

    return sentences;
  };

  // Identify key vocabulary terms (capitalized words, longer words, subject-specific terms)
  const isKeyTerm = (word: string, position: number, totalWords: number): boolean => {
    const cleanWord = word.replace(/[.,!?;:]$/, '').toLowerCase();
    
    // Skip if it's a common word
    if (COMMON_WORDS.has(cleanWord)) return false;
    
    // Skip very short words (likely not key concepts)
    if (cleanWord.length < 4) return false;
    
    // Prioritize words that are:
    // 1. At the beginning of the sentence (often the subject/key concept)
    // 2. Capitalized mid-sentence (proper nouns, important terms)
    // 3. Longer words (typically more specific/technical)
    // 4. Not ending in common suffixes that indicate function words
    
    const isCapitalized = word[0] === word[0].toUpperCase() && position > 0;
    const isLongWord = cleanWord.length >= 6;
    const isAtStart = position <= 2; // First few words often contain key subject
    
    return isCapitalized || isLongWord || isAtStart;
  };

  // Generate fill-in-the-blank questions from note content
  const generateQuestions = (lesson: LessonPlan): Question[] => {
    const lessonNotes = getNotesForLesson(lesson.id);
    if (lessonNotes.length === 0) return [];

    const generatedQuestions: Question[] = [];
    const allContent = lessonNotes.map(note => note.content).join('\n\n');
    const parsedSentences = parseNoteContent(allContent);

    // Function to create a blank from a sentence
    const createBlank = (sentenceData: { sentence: string; type: 'definition' | 'statement' }): { blankedText: string; answer: string } | null => {
      const { sentence, type } = sentenceData;
      
      // For definition-style sentences (term: definition)
      if (type === 'definition') {
        const parts = sentence.split(':');
        const term = parts[0].trim();
        const definition = parts[1].trim();
        
        // Prefer blanking the term (the key vocabulary)
        if (term.split(/\s+/).length <= 5) {
          return {
            blankedText: `_____ : ${definition}`,
            answer: term
          };
        }
        
        // If term is too long, find the most important word in the definition
        const defWords = definition.split(/\s+/);
        const keyWords = defWords
          .map((word, index) => ({ word, index }))
          .filter(({ word, index }) => isKeyTerm(word, index, defWords.length))
          .sort((a, b) => b.word.length - a.word.length); // Prefer longer words
        
        if (keyWords.length > 0) {
          const { word, index } = keyWords[0];
          const defWordsCopy = [...defWords];
          defWordsCopy[index] = '_____';
          const cleanAnswer = word.replace(/[.,!?;:]$/, '');
          return {
            blankedText: `${term}: ${defWordsCopy.join(' ')}`,
            answer: cleanAnswer
          };
        }
      }
      
      // For regular statement sentences
      const words = sentence.split(/\s+/);
      if (words.length >= 6) {
        // Find key terms to blank
        const keyWords = words
          .map((word, index) => ({ word, index }))
          .filter(({ word, index }) => isKeyTerm(word, index, words.length));
        
        if (keyWords.length > 0) {
          // Prioritize:
          // 1. Words at the beginning (subject of sentence)
          // 2. Capitalized words (proper nouns, important concepts)
          // 3. Longer words (more specific terms)
          const scoredWords = keyWords.map(({ word, index }) => {
            let score = 0;
            if (index <= 2) score += 3; // Beginning of sentence
            if (word[0] === word[0].toUpperCase() && index > 0) score += 2; // Capitalized
            score += word.length / 10; // Longer words get higher score
            return { word, index, score };
          });
          
          scoredWords.sort((a, b) => b.score - a.score);
          const { word, index } = scoredWords[0];
          
          const wordsCopy = [...words];
          wordsCopy[index] = '_____';
          const cleanAnswer = word.replace(/[.,!?;:]$/, '');
          
          return {
            blankedText: wordsCopy.join(' '),
            answer: cleanAnswer
          };
        }
      }
      
      return null;
    };

    // Prioritize definition sentences, then regular sentences
    const definitions = parsedSentences.filter(s => s.type === 'definition');
    const statements = parsedSentences.filter(s => s.type === 'statement');
    
    // Shuffle each type
    const shuffledDefinitions = [...definitions].sort(() => Math.random() - 0.5);
    const shuffledStatements = [...statements].sort(() => Math.random() - 0.5);
    
    // Combine with definitions first (they're usually better for vocab learning)
    const orderedSentences = [...shuffledDefinitions, ...shuffledStatements];
    
    let questionCount = 0;
    
    for (const sentenceData of orderedSentences) {
      if (questionCount >= 5) break; // Maximum 5 questions
      
      const blank = createBlank(sentenceData);
      if (blank) {
        generatedQuestions.push({
          id: questionCount + 1,
          question: `Fill in the blank:`,
          blankedText: blank.blankedText,
          answer: blank.answer
        });
        questionCount++;
      }
    }

    return generatedQuestions;
  };

  const handleStartQuiz = (lesson: LessonPlan) => {
    setSelectedLesson(lesson);
    const newQuestions = generateQuestions(lesson);
    
    // Check if we have enough questions
    if (newQuestions.length < 3) {
      toast.error("Not enough content in the notes to generate a quiz. Please add more detailed notes with complete sentences and definitions.");
      setShowLessonDialog(false);
      return;
    }
    
    setQuestions(newQuestions);
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setQuizResults([]);
    setShowResults(false);
    setUserAnswer("");
    setShowLessonDialog(false);
  };

  const normalizeAnswer = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize spaces
  };

  const handleNextQuestion = () => {
    if (!userAnswer.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.answer);
    
    // Check if answer is correct (allow for minor variations)
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    setQuizResults([
      ...quizResults,
      {
        questionId: currentQuestion.id,
        userAnswer: userAnswer.trim(),
        correctAnswer: currentQuestion.answer,
        isCorrect
      }
    ]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
    } else {
      setShowResults(true);
    }
  };

  const handleRestartQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setQuizResults([]);
    setShowResults(false);
    setUserAnswer("");
    setSelectedLesson(null);
  };

  const calculateScore = () => {
    const correctAnswers = quizResults.filter(result => result.isCorrect).length;
    return Math.round((correctAnswers / questions.length) * 100);
  };

  // If quiz is completed, show results
  if (showResults && selectedLesson) {
    const score = calculateScore();
    const correctCount = quizResults.filter(r => r.isCorrect).length;

    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle>Quiz Complete!</CardTitle>
            <CardDescription>
              You answered {correctCount} out of {questions.length} questions correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-2">{score}%</div>
              <Progress value={score} className="h-3" />
            </div>

            <div className="space-y-2 mt-6">
              <h3 className="text-sm">Question Review:</h3>
              {questions.map((question, index) => {
                const result = quizResults[index];
                return (
                  <div
                    key={question.id}
                    className={`p-3 rounded-lg border ${
                      result.isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm mb-1">
                          Question {index + 1}: {question.blankedText}
                        </p>
                        <p className="text-xs text-gray-600">
                          Your answer: <span className={result.isCorrect ? "text-green-700" : "text-red-700"}>{result.userAnswer}</span>
                        </p>
                        {!result.isCorrect && (
                          <p className="text-xs text-gray-600">
                            Correct answer: <span className="text-green-700">{result.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleRestartQuiz} className="flex-1" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Another Quiz
              </Button>
              <Button
                onClick={() => handleStartQuiz(selectedLesson)}
                className="flex-1"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Retry This Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If quiz is started, show questions
  if (quizStarted && selectedLesson) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge className={getSubjectColor(selectedLesson.subject)}>
                {selectedLesson.subject}
              </Badge>
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-base leading-relaxed whitespace-pre-line">
                {currentQuestion.blankedText}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="answer-input" className="text-sm text-gray-600">
                Your answer:
              </label>
              <Input
                id="answer-input"
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNextQuestion();
                  }
                }}
                placeholder="Type your answer here..."
                className="text-base"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Tip: Type the word or phrase that fills in the blank
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleRestartQuiz}
                variant="outline"
                className="flex-1"
              >
                Exit Quiz
              </Button>
              <Button
                onClick={handleNextQuestion}
                className="flex-1"
                disabled={!userAnswer.trim()}
              >
                {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default view: lesson selection
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-green-700 to-emerald-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Quiz Challenge
          </CardTitle>
          <CardDescription className="text-amber-100">
            Test your knowledge with fill-in-the-blank questions
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h3 className="text-sm mb-3 text-gray-600">Select a lesson with notes to begin:</h3>
        <div className="space-y-3">
          {lessonPlansWithNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No lessons with study notes available</p>
              <p className="text-xs">Quizzes require teachers to upload notes for lessons</p>
            </div>
          ) : (
            lessonPlansWithNotes.map(plan => {
              const noteCount = getNotesForLesson(plan.id).length;
              return (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedLesson(plan);
                    setShowLessonDialog(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                      <Badge className={`shrink-0 ${getSubjectColor(plan.subject)}`}>
                        {plan.subject}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {plan.description}
                    </CardDescription>
                    <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2">
                      <StickyNote className="w-3.5 h-3.5" />
                      <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'} available</span>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Quiz</DialogTitle>
            <DialogDescription>
              You're about to start a fill-in-the-blank quiz on "{selectedLesson?.title}". You'll complete sentences based on the study notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLesson && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <StickyNote className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        This quiz is based on {getNotesForLesson(selectedLesson.id).length} study {getNotesForLesson(selectedLesson.id).length === 1 ? 'note' : 'notes'} uploaded by the teacher.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs">Available notes:</p>
                  {getNotesForLesson(selectedLesson.id).map(note => (
                    <div key={note.id} className="bg-gray-50 rounded p-2 text-xs">
                      <p>{note.title}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLessonDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedLesson && handleStartQuiz(selectedLesson)}
              className="flex-1"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
