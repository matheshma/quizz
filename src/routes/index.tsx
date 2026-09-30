import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Key,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  generateQuiz,
  getGeminiApiKey,
  QuizData,
  QuizQuestion,
} from "@/lib/gemini";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrightMind — AI Topic Quiz Generator" },
      {
        name: "description",
        content:
          "Enter any topic and generate 10 custom multiple-choice questions powered by Gemini AI with detailed answer explanations.",
      },
      { property: "og:title", content: "BrightMind — AI Topic Quiz Generator" },
      {
        property: "og:description",
        content:
          "Generate instant 10-question quizzes on any topic using Gemini AI.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

// Default fallback quiz in case AI fails or API key is not present initially
const DEFAULT_GENERAL_KNOWLEDGE_QUIZ: QuizData = {
  topic: "General Knowledge",
  questions: [
    {
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Mercury"],
      answer: 1,
      explanation: "Mars is called the Red Planet because iron minerals in its soil oxidize (rust), giving it a reddish appearance.",
    },
    {
      question: "What is the largest ocean on Earth?",
      options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
      answer: 3,
      explanation: "The Pacific Ocean is the largest and deepest ocean basin on Earth, covering over 60 million square miles.",
    },
    {
      question: "Who painted the Mona Lisa?",
      options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
      answer: 2,
      explanation: "Leonardo da Vinci painted the Mona Lisa during the Italian Renaissance in the early 16th century.",
    },
    {
      question: "What is the chemical symbol for gold?",
      options: ["Ag", "Au", "Gd", "Go"],
      answer: 1,
      explanation: "Au comes from the Latin word for gold, 'Aurum', meaning shining dawn.",
    },
    {
      question: "Which country is home to the ancient city of Petra?",
      options: ["Egypt", "Greece", "Jordan", "Turkey"],
      answer: 2,
      explanation: "Petra is a famous archaeological site located in Jordan's southwestern desert.",
    },
    {
      question: "How many sides does a hexagon have?",
      options: ["Five", "Six", "Seven", "Eight"],
      answer: 1,
      explanation: "A hexagon is a polygon with six straight sides and six angles.",
    },
    {
      question: "What is the fastest land animal on Earth?",
      options: ["Lion", "Pronghorn", "Cheetah", "Greyhound"],
      answer: 2,
      explanation: "Cheetahs can accelerate from 0 to 60 mph in just 3 seconds, reaching top speeds of around 70 mph.",
    },
    {
      question: "Which language has the most native speakers worldwide?",
      options: ["English", "Spanish", "Hindi", "Mandarin Chinese"],
      answer: 3,
      explanation: "Mandarin Chinese has over 900 million native speakers, making it the most spoken native language.",
    },
    {
      question: "What is the capital city of Canada?",
      options: ["Toronto", "Ottawa", "Vancouver", "Montreal"],
      answer: 1,
      explanation: "Ottawa was selected as the capital of Canada by Queen Victoria in 1857.",
    },
    {
      question: "Which gas do plants absorb from the atmosphere for photosynthesis?",
      options: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"],
      answer: 2,
      explanation: "Plants take in carbon dioxide and water to convert sunlight into glucose and release oxygen.",
    },
  ],
};

const POPULAR_TOPICS = [
  { name: "Quantum Physics", icon: "⚛️" },
  { name: "World History", icon: "🏛️" },
  { name: "React & TypeScript", icon: "💻" },
  { name: "Astronomy & Planets", icon: "🪐" },
  { name: "Human Biology", icon: "🧬" },
  { name: "Cinema & Movie Trivia", icon: "🎬" },
  { name: "Cricket World Cup", icon: "🏏" },
  { name: "Artificial Intelligence", icon: "🤖" },
];

type Screen = "home" | "quiz" | "results" | "review";

function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentQuiz, setCurrentQuiz] = useState<QuizData>(DEFAULT_GENERAL_KNOWLEDGE_QUIZ);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | undefined>>(() =>
    Array(DEFAULT_GENERAL_KNOWLEDGE_QUIZ.questions.length).fill(undefined)
  );

  // Topic generation state
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Check if API key is configured
  const hasEnvKey = !!getGeminiApiKey(customApiKey);

  const questions = currentQuiz.questions;
  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const selectedAnswer = answers[currentQuestionIndex];

  const score = answers.reduce<number>((total, answer, index) => {
    const item = questions[index];
    return total + (item && answer === item.answer ? 1 : 0);
  }, 0);

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const handleGenerateQuiz = async (topicToUse?: string) => {
    const selectedTopic = (topicToUse || topicInput).trim();
    if (!selectedTopic) {
      setGenerationError("Please enter a topic name or pick one of the suggested topics.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const generatedData = await generateQuiz({
        topic: selectedTopic,
        difficulty,
        customApiKey: customApiKey.trim() || undefined,
      });

      setCurrentQuiz(generatedData);
      setAnswers(Array(generatedData.questions.length).fill(undefined));
      setCurrentQuestionIndex(0);
      setScreen("quiz");
    } catch (err: any) {
      console.error("Quiz generation error:", err);
      setGenerationError(
        err?.message || "Failed to generate quiz with Gemini. Please verify your API key and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const startDefaultQuiz = () => {
    setCurrentQuiz(DEFAULT_GENERAL_KNOWLEDGE_QUIZ);
    setAnswers(Array(DEFAULT_GENERAL_KNOWLEDGE_QUIZ.questions.length).fill(undefined));
    setCurrentQuestionIndex(0);
    setScreen("quiz");
  };

  const chooseAnswer = (answerIndex: number) => {
    setAnswers((prev) =>
      prev.map((val, idx) => (idx === currentQuestionIndex ? answerIndex : val))
    );
  };

  const handleNext = () => {
    if (currentQuestionIndex === questions.length - 1) {
      setScreen("results");
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleRetrySameQuiz = () => {
    setAnswers(Array(questions.length).fill(undefined));
    setCurrentQuestionIndex(0);
    setScreen("quiz");
  };

  return (
    <main className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-8">
          <button
            className="flex items-center gap-3 text-left transition-opacity hover:opacity-90"
            onClick={() => setScreen("home")}
            aria-label="BrightMind Home"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Brain className="size-6" />
            </span>
            <div>
              <span className="font-display text-xl font-extrabold tracking-tight text-foreground block">
                BrightMind <span className="text-primary">AI Quiz</span>
              </span>
              <span className="text-xs font-semibold text-muted-foreground hidden sm:block">
                Powered by Gemini AI
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {screen !== "home" && (
              <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 py-1.5 px-3 font-bold">
                <Sparkles className="size-3.5 text-primary" />
                {currentQuiz.topic}
              </Badge>
            )}

            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                hasEnvKey
                  ? "border-success/30 bg-success-soft text-success hover:border-success/60"
                  : "border-warning/30 bg-amber-50 text-amber-700 hover:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              <Key className="size-3.5" />
              <span>{hasEnvKey ? "Gemini Key Ready" : "Set API Key"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* API Key Modal / Banner */}
      {showKeyInput && (
        <div className="border-b border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="mx-auto max-w-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-2">
                <Key className="size-4 text-primary" /> Gemini API Key Configuration
              </h3>
              <button onClick={() => setShowKeyInput(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your key is added as <code className="rounded bg-secondary px-1 py-0.5 text-foreground font-mono">GEMINI_API_KEY</code> in <code className="rounded bg-secondary px-1 py-0.5 text-foreground font-mono">.env</code>, it is loaded automatically. You can also paste or override your API key below:
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={() => setShowKeyInput(false)}>
                Save Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Screen 1: Home / Generator Screen */}
      {screen === "home" && (
        <HomeScreen
          topicInput={topicInput}
          setTopicInput={setTopicInput}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          isGenerating={isGenerating}
          generationError={generationError}
          onGenerate={handleGenerateQuiz}
          onStartDefault={startDefaultQuiz}
        />
      )}

      {/* Screen 2: Quiz Question Screen */}
      {screen === "quiz" && (
        <section className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
          {/* Top Progress & Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold">
                  {currentQuiz.topic}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  • 10 Questions
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-primary">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-muted-foreground mb-1">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Progress
              </span>
              <div
                className="h-2.5 w-36 overflow-hidden rounded-full bg-secondary sm:w-48"
                role="progressbar"
                aria-valuenow={currentQuestionIndex + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10 transition-all">
            <h1 className="font-display text-xl font-extrabold leading-snug text-foreground sm:text-2xl">
              {currentQuestion.question}
            </h1>

            <fieldset className="mt-8 grid gap-3.5">
              <legend className="sr-only">Choose your answer</legend>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                return (
                  <label
                    key={`${index}-${option}`}
                    className={cn(
                      "group flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-200 select-none",
                      isSelected
                        ? "border-primary bg-accent shadow-[0_0_0_2px_var(--primary)]"
                        : "border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                    )}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      checked={isSelected}
                      onChange={() => chooseAnswer(index)}
                    />
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-black transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="font-medium text-foreground text-sm sm:text-base leading-snug">
                      {option}
                    </span>
                    {isSelected && (
                      <Check className="ml-auto size-5 text-primary shrink-0" aria-hidden="true" />
                    )}
                  </label>
                );
              })}
            </fieldset>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="size-4 mr-1" /> Previous
            </Button>

            <Button onClick={handleNext} disabled={selectedAnswer === undefined} size="lg">
              {currentQuestionIndex === questions.length - 1 ? "Finish Quiz & See Score" : "Next Question"}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </section>
      )}

      {/* Screen 3: Results Screen */}
      {screen === "results" && (
        <ResultsScreen
          quiz={currentQuiz}
          score={score}
          percentage={percentage}
          onReview={() => setScreen("review")}
          onRetry={handleRetrySameQuiz}
          onNewQuiz={() => setScreen("home")}
        />
      )}

      {/* Screen 4: Answer Review Screen */}
      {screen === "review" && (
        <ReviewScreen
          quiz={currentQuiz}
          answers={answers}
          onBack={() => setScreen("results")}
          onRetry={handleRetrySameQuiz}
          onNewTopic={() => setScreen("home")}
        />
      )}
    </main>
  );
}

function HomeScreen({
  topicInput,
  setTopicInput,
  difficulty,
  setDifficulty,
  isGenerating,
  generationError,
  onGenerate,
  onStartDefault,
}: {
  topicInput: string;
  setTopicInput: (val: string) => void;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  setDifficulty: (val: "easy" | "medium" | "hard" | "mixed") => void;
  isGenerating: boolean;
  generationError: string | null;
  onGenerate: (topic?: string) => void;
  onStartDefault: () => void;
}) {
  return (
    <section className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-14">
      {/* Left Column: Hero & AI Input Generator */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent/80 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
          <Zap className="size-4" /> AI Powered 10-Question Quiz Engine
        </span>

        <h1 className="mt-6 font-display text-4xl font-black leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
          What topic do you want to <span className="text-primary">test yourself on?</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
          Enter any topic—from astrophysics to ancient mythologies—and Gemini AI will create 10 tailored multiple-choice questions with 4 distinct options and complete answer explanations.
        </p>

        {/* AI Topic Input Form */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7 space-y-5">
          <div>
            <label htmlFor="topic-input" className="block text-xs font-extrabold uppercase tracking-wide text-foreground mb-2">
              Enter Quiz Topic
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-4 size-5 text-muted-foreground pointer-events-none" />
              <Input
                id="topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) onGenerate();
                }}
                placeholder="e.g. Quantum Computing, World War II, JavaScript Promises..."
                className="pl-12 pr-4 h-14 text-base font-medium rounded-xl border-border bg-background shadow-inner"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-foreground mb-2">
              Select Difficulty
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["mixed", "easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all border",
                    difficulty === level
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Topic Badges */}
          <div>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
              Or pick a trending topic
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TOPICS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setTopicInput(item.name);
                    onGenerate(item.name);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-bold text-secondary-foreground transition-all hover:border-primary/40 hover:bg-accent"
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {generationError && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">Quiz Generation Failed</p>
                <p className="leading-relaxed">{generationError}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            size="lg"
            className="w-full h-14 rounded-xl text-base font-extrabold shadow-md"
            onClick={() => onGenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" /> Generating 10 Questions with Gemini AI...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="size-5" /> Generate 10 Questions Quiz
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Right Column: Quiz Info & Pre-made General Knowledge Option */}
      <div className="relative lg:pl-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Features</p>
              <h2 className="mt-1 font-display text-2xl font-black text-foreground">How it works</h2>
            </div>
            <GraduationCap className="size-9 text-primary" />
          </div>

          <ul className="space-y-4">
            {[
              {
                step: "1",
                title: "Enter Any Topic",
                desc: "Choose from science, history, technology, movies, sports, or custom prompts.",
              },
              {
                step: "2",
                title: "10 Smart Questions",
                desc: "Gemini AI crafts 10 relevant questions with 4 distinct plausible options.",
              },
              {
                step: "3",
                title: "Instant Scoring & AI Review",
                desc: "Get your score percentage alongside detailed AI explanations for each question.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary font-display text-sm font-black text-primary">
                  {item.step}
                </span>
                <div>
                  <p className="font-bold text-foreground text-sm">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-extrabold text-muted-foreground mb-3 uppercase tracking-wide">
              Want a quick start?
            </p>
            <Button
              variant="outline"
              className="w-full justify-between h-12 rounded-xl text-sm font-bold border-border"
              onClick={onStartDefault}
            >
              <span className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" /> Play General Knowledge Quiz (10 Qs)
              </span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsScreen({
  quiz,
  score,
  percentage,
  onReview,
  onRetry,
  onNewQuiz,
}: {
  quiz: QuizData;
  score: number;
  percentage: number;
  onReview: () => void;
  onRetry: () => void;
  onNewQuiz: () => void;
}) {
  const total = quiz.questions.length;
  const wrong = total - score;

  const getFeedback = () => {
    if (percentage >= 90) return "Mastery level performance! You have exceptional knowledge in this topic.";
    if (percentage >= 70) return "Great job! You showed strong understanding of key concepts.";
    if (percentage >= 50) return "Solid effort! Review your answers to master the trickier questions.";
    return "Keep learning! Check the detailed answer explanations to strengthen your foundation.";
  };

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 text-center sm:px-8 sm:pt-14">
      <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <Trophy className="size-10" />
      </div>

      <p className="mt-6 text-xs font-extrabold uppercase tracking-widest text-primary">Quiz Complete</p>
      <h1 className="mt-2 font-display text-4xl font-black text-foreground sm:text-5xl">
        {quiz.topic} Result
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">{getFeedback()}</p>

      {/* Score Summary Box */}
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] sm:grid-cols-[1.3fr_1fr_1fr]">
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary to-accent p-8 text-primary-foreground">
          <span className="text-xs font-extrabold uppercase opacity-85 tracking-wider">Final Score</span>
          <span className="mt-2 font-display text-5xl font-black">
            {score} <span className="text-2xl font-bold opacity-75">/ {total}</span>
          </span>
          <span className="mt-2 text-lg font-black">{percentage}% Accuracy</span>
        </div>

        <div className="flex items-center justify-center gap-3.5 border-b border-border p-6 sm:border-b-0 sm:border-r">
          <CheckCircle2 className="size-8 text-success shrink-0" />
          <div className="text-left">
            <p className="text-2xl font-black text-foreground">{score}</p>
            <p className="text-xs font-bold text-muted-foreground">Correct Answers</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3.5 p-6">
          <XCircle className="size-8 text-destructive shrink-0" />
          <div className="text-left">
            <p className="text-2xl font-black text-foreground">{wrong}</p>
            <p className="text-xs font-bold text-muted-foreground">Incorrect Answers</p>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button size="lg" className="rounded-xl font-extrabold" onClick={onReview}>
          <BookOpenCheck className="size-4 mr-2" /> View Detailed Explanations
        </Button>
        <Button size="lg" variant="outline" className="rounded-xl font-bold" onClick={onRetry}>
          <RotateCcw className="size-4 mr-2" /> Retry Same Quiz
        </Button>
        <Button size="lg" variant="secondary" className="rounded-xl font-bold" onClick={onNewQuiz}>
          <Sparkles className="size-4 mr-2 text-primary" /> Try Another Topic
        </Button>
      </div>
    </section>
  );
}

function ReviewScreen({
  quiz,
  answers,
  onBack,
  onRetry,
  onNewTopic,
}: {
  quiz: QuizData;
  answers: Array<number | undefined>;
  onBack: () => void;
  onRetry: () => void;
  onNewTopic: () => void;
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="size-4 mr-2" /> Back to score summary
      </Button>

      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <Badge variant="outline" className="font-bold text-primary mb-2">
            {quiz.topic} Review
          </Badge>
          <h1 className="font-display text-3xl font-black text-foreground">
            Detailed Answers & AI Explanations
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4 mr-1" /> Retry
          </Button>
          <Button size="sm" onClick={onNewTopic}>
            <Sparkles className="size-4 mr-1" /> New Topic
          </Button>
        </div>
      </div>

      {/* Question Cards Review */}
      <div className="mt-8 space-y-5">
        {quiz.questions.map((item, index) => {
          const userAnswer = answers[index];
          const isCorrect = userAnswer === item.answer;

          return (
            <article
              key={`${index}-${item.question}`}
              className={cn(
                "rounded-2xl border bg-card p-6 shadow-sm transition-all",
                isCorrect ? "border-success/40" : "border-destructive/35"
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl font-bold text-sm",
                    isCorrect
                      ? "bg-success-soft text-success"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  {isCorrect ? <Check className="size-5" /> : <X className="size-5" />}
                </span>

                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      Question {index + 1} of {quiz.questions.length}
                    </span>
                    <h2 className="mt-1 font-display text-lg font-black text-foreground leading-snug">
                      {item.question}
                    </h2>
                  </div>

                  {/* Answers Comparison */}
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div
                      className={cn(
                        "rounded-xl p-4 border",
                        isCorrect
                          ? "bg-success-soft/60 border-success/30"
                          : "bg-destructive/10 border-destructive/30"
                      )}
                    >
                      <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Your answer
                      </span>
                      <span
                        className={cn(
                          "mt-1 block font-extrabold text-base",
                          isCorrect ? "text-success" : "text-destructive"
                        )}
                      >
                        {userAnswer === undefined
                          ? "No answer selected"
                          : item.options[userAnswer]}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="rounded-xl bg-success-soft/70 border border-success/30 p-4">
                        <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          Correct answer
                        </span>
                        <span className="mt-1 block font-extrabold text-base text-success">
                          {item.options[item.answer]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gemini AI Explanation */}
                  {item.explanation && (
                    <div className="rounded-xl border border-primary/20 bg-accent/50 p-4 text-xs sm:text-sm leading-relaxed text-foreground flex items-start gap-3">
                      <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-primary block mb-0.5">
                          Gemini Explanation
                        </span>
                        <p className="text-muted-foreground">{item.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
