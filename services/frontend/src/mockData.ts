import { LessonPlan, Note } from "./types";

export const MOCK_LESSON_PLANS: LessonPlan[] = [
    {
        id: "1",
        title: "Introduction to Photosynthesis",
        subject: "Biology",
        grade: "8th Grade",
        description: "Learn how plants convert sunlight into energy through photosynthesis.",
        objectives: [
            "Understand the process of photosynthesis",
            "Identify the key components needed for photosynthesis",
            "Explain the importance of photosynthesis in the ecosystem"
        ],
        materials: ["Plant samples", "Microscope", "Worksheets", "Videos"],
        activities: [
            "Introduction and video presentation (15 min)",
            "Hands-on observation with microscope (20 min)",
            "Group discussion and Q&A (15 min)",
            "Worksheet completion (10 min)"
        ],
        duration: "60 minutes",
        teacherName: "Ms. Johnson",
        createdAt: "2025-10-20",
        isPublic: true
    },
    {
        id: "2",
        title: "World War II: Causes and Effects",
        subject: "History",
        grade: "10th Grade",
        description: "Explore the major causes and global effects of World War II.",
        objectives: [
            "Identify key events leading to WWII",
            "Analyze the political and economic factors",
            "Understand the war's impact on modern society"
        ],
        materials: ["Textbook", "Historical documents", "Map", "Documentary clips"],
        activities: [
            "Timeline activity (20 min)",
            "Document analysis in groups (25 min)",
            "Class discussion on impacts (20 min)",
            "Exit ticket reflection (5 min)"
        ],
        duration: "70 minutes",
        teacherName: "Mr. Chen",
        createdAt: "2025-10-18",
        isPublic: false,
        password: "history2025"
    },
    {
        id: "3",
        title: "Solving Linear Equations",
        subject: "Mathematics",
        grade: "7th Grade",
        description: "Master techniques for solving linear equations with one variable.",
        objectives: [
            "Solve one-step and two-step equations",
            "Apply inverse operations correctly",
            "Check solutions for accuracy"
        ],
        materials: ["Whiteboard", "Practice worksheets", "Calculator", "Online quiz"],
        activities: [
            "Warm-up review of inverse operations (10 min)",
            "Teacher demonstration of examples (15 min)",
            "Guided practice in pairs (20 min)",
            "Independent practice and assessment (15 min)"
        ],
        duration: "60 minutes",
        teacherName: "Mrs. Rodriguez",
        createdAt: "2025-10-22",
        isPublic: true
    },
    {
        id: "calculus-101",
        title: "The Idiot's Guide to Calculus: Demystifying the Arcane",
        subject: "Mathematics",
        grade: "12th Grade",
        description: "A friendly introduction to limits, derivatives, and integrals.",
        objectives: ["Understand rate of change", "Grasp the concept of limits"],
        materials: ["Graphing Calculator", "Notebook"],
        activities: ["Video Lecture", "Traffic Control Protocol"],
        duration: "90 minutes",
        teacherName: "Prof. Newton",
        createdAt: "2025-10-25",
        isPublic: true,
        quiz: {
            question: "Which concept describes the instantaneous rate of change of a function?",
            options: ["Integration", "Differentiation", "Summation", "Factorization"],
            correctIndex: 1
        }
    }
];

export const MOCK_NOTES: Note[] = [
    {
        id: "1",
        title: "Photosynthesis Key Concepts",
        subject: "Biology",
        content: `Photosynthesis Overview:
- Process by which plants convert light energy into chemical energy
- Occurs in chloroplasts, specifically in chlorophyll
- Chemical equation: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂

Key Points:
1. Light-dependent reactions (occur in thylakoid membranes)
   - Light energy is captured by chlorophyll
   - Water molecules are split (photolysis)
   - Produces ATP and NADPH
   - Releases oxygen as byproduct

2. Light-independent reactions (Calvin Cycle - occurs in stroma)
   - Uses ATP and NADPH from light reactions
   - Carbon dioxide is fixed into glucose
   - Does not require direct light

Important Terms:
- Chlorophyll: Green pigment that absorbs light
- Stomata: Pores for gas exchange
- Glucose: Sugar product used for plant energy

Common Misconceptions:
- Plants don't only photosynthesize during the day (they also respire)
- Oxygen is a byproduct, not the main purpose
- Water provides electrons, not just hydrogen`,
        teacherName: "Ms. Johnson",
        createdAt: "2025-10-21",
        isPublic: true,
        lessonPlanId: "1"
    },
    {
        id: "2",
        title: "WWII Timeline and Major Events",
        subject: "History",
        content: `World War II Timeline (1939-1945)

Pre-War Events:
- 1933: Hitler becomes Chancellor of Germany
- 1936: Germany remilitarizes Rhineland
- 1938: Munich Agreement, Kristallnacht
- 1939: Germany invades Poland (Sept 1) - War begins

Major Events:
1940:
- Battle of Britain
- France falls to Germany
- Tripartite Pact signed

1941:
- Germany invades Soviet Union (Operation Barbarossa)
- Pearl Harbor attack (Dec 7) - US enters war
- Atlantic Charter

1942:
- Battle of Midway
- Stalingrad begins
- El Alamein

1943:
- Stalingrad ends - turning point
- Italy surrenders
- Tehran Conference

1944:
- D-Day (June 6)
- Liberation of Paris
- Battle of the Bulge

1945:
- Yalta Conference
- Germany surrenders (May 8 - VE Day)
- Atomic bombs dropped on Japan
- Japan surrenders (Aug 15 - VJ Day)

Key Themes:
- Totalitarianism vs Democracy
- Alliance systems
- Total war
- Holocaust
- Technological advancement`,
        teacherName: "Mr. Chen",
        createdAt: "2025-10-19",
        isPublic: false,
        password: "history2025",
        lessonPlanId: "2"
    }
];
