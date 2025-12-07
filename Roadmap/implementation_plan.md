# Talosopolis Implementation Plan

## Goal Description
Build "Talosopolis", a cloud-native, gamified learning platform powered by Gemini 2.5 Flash. The app uses a microservices architecture on Kubernetes (GKE), secured by privacy-first principles (AIUPI, GDPR, COPPA). It aims to replace traditional LMS experiences with an arcade-style, mythos-driven engagement loop.

## Architecture Overview
- **Orchestration**: Kubernetes (GKE)
- **Infrastructure as Code**: Terraform
- **Identity**: Google SSO (Firebase Auth or GCP IAP)
- **Database**: Firestore (User data, Public Courses), Vector Search (RAG)
- **Backend stack**: Python (FastAPI) or Go for microservices.
- **Frontend**: React + Vite (Cyberpunk/Greek Myth aesthetic).

## Proposed Changes

### Infrastructure / DevOps
#### [NEW] [terraform_main.tf](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/infra/main.tf)
- Definition of GKE Cluster (Regional: us-central1, europe-west3).
- VPC and Subnet configuration.
- Artifact Registry for container images.

#### [NEW] [k8s_manifests](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/k8s/)
- `namespace.yaml`: Namespaces for games, core, community.
- `deployment-frontend.yaml`: Frontend scaling rules.
- `deployment-ai-backend.yaml`: Gemini service.
- `service-mesh.yaml`: (Optional) Istio or standard K8s services.

### Microservices
#### [NEW] [service-frontend](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/services/frontend)
- React app with "Arcade" routing.
- Space Invaders game using Canvas API.
- Course dashboard.

#### [NEW] [service-ai-backend](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/services/ai-backend)
- Python FastAPI.
- Endpoint `/generate-quiz`: Calls Gemini 2.5 Flash.
- Endpoint `/rag-query`: Handles vector search for courses.
- Middleware: Compliance scrubber (PII removal).

#### [NEW] [service-payment](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/services/payment)
- Mock payment processor.
- Ledger for Obols (Currency) and Lepta (XP).

#### [NEW] [service-community](file:///home/bpdc-deb0/.gemini/antigravity/scratch/talosopolis/services/community)
- WebSocket server for "Discord-like" chat features.

### Game: Space Invaders
- Located in `services/frontend/src/games/SpaceInvaders`.
- Logic: Ships represent answers. Shooting the correct ship awards points.

## User Review Required
> [!IMPORTANT]
> **Gemini 2.5 Flash**: The plan assumes access to Vertex AI models. Ensure the GCP project has the Vertex AI API enabled.
> **Compliance**: The "Rupert's Drop" AI protection mechanism is implemented as a core library that disables the app if tampered with.

## Verification Plan
### Automated Tests
- Unit tests for the AI backend (mocking Gemini).
- React component tests for the Game engine.
- `terraform validate` for infra scripts.

### Manual Verification
- Deploy to local Kind cluster or simulated environment.
- Verify "Space Invaders" game loop generates questions via the mocked AI backend.
