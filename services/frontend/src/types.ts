export type Lesson = {
    title: string;
    duration: string;
    description?: string;
    content?: string; // Markdown/HTML content
};

export type Module = {
    title: string;
    description: string;
    lessons: Lesson[];
};

export type LessonPlan = {
    id: string;
    title: string;
    subject: string;
    grade: string;
    description: string;
    objectives: string[];
    materials: string[];
    activities: string[];
    duration: string;
    teacherName: string;
    createdAt: string;
    isPublic: boolean;
    password?: string;
    ownerId?: string;
    // New fields for Course Wizard
    modules?: Module[];
    status?: 'draft' | 'published';
    totalFileSize?: number;
};

export type Note = {
    id: string;
    title: string;
    subject: string;
    content: string;
    teacherName: string;
    createdAt: string;
    fileUrl?: string; // Base64 or URL
    isPublic: boolean;
    password?: string;
    lessonPlanId?: string;
    ownerId?: string;
};

export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    relatedPlans?: string[];
    editedByTeacher?: boolean;
    rating?: "helpful" | "not-helpful" | null;
    citation?: {
        noteId?: string;
        noteTitle?: string;
        lessonPlanId?: string;
        lessonPlanTitle?: string;
    };
};

export type Conversation = {
    id: string;
    studentName: string;
    messages: Message[];
    timestamp: string;
    archived?: boolean;
    ownerId?: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    username?: string;
    role: 'student' | 'teacher' | 'undecided';
    createdAt: string;
    onboardingCompleted: boolean;
    ageBracket?: '<13' | '13-17' | '18+';
    gradeLevel?: string;
    educationLevel?: string;
    continent?: string;
    interests?: string[];
    bio?: string;
    pronouns?: string;
    agreedToEULA?: boolean;
    agreedToAIUPI?: boolean;
};
