# Issues and Improvements

This document outlines the key issues identified in the current codebase and a plan for improvements to create a robust and AI-powered knowledge graph application.

## Architectural Issues

The most critical issue is the disconnected architecture. The application is currently split into two parallel implementations:

*   **Simple Implementation:** Uses `graphStore.ts` and basic components. This is what is currently active in `App.tsx`.
*   **Enhanced Implementation:** Uses `enhancedGraphStore.ts`, `GraphEngine.ts`, and a rich set of AI-powered services and components. This implementation is currently dormant.

This separation is the root cause of the lost functionality and the lack of AI-powered features in the running application.

**The primary goal is to unify the application around the enhanced architecture.**

## Data Ingestion and Processing

✅ **Current Status:** The `EnhancedDocumentImporter` is now fully functional and integrated:

- PDF processing works correctly with unpkg.com CDN for PDF.js worker
- Uses `IntelligentGraphProcessor` for AI-powered concept extraction
- Creates meaningful nodes instead of "raw batched info"
- Processes ANY content type, not just hardcoded AI/ML terms

**Remaining Integration Tasks:**
- **Connect to `GraphEngine`:** The document importer should send the extracted text to the `GraphEngine` for processing, which will then use the AI agents to create enriched nodes and edges.
- **Define Clear Data Flow:** A clear data flow needs to be established:
    1. ✅ Document is uploaded through the `EnhancedDocumentImporter`.
    2. ✅ The text is sent to the `IntelligentGraphProcessor`.
    3. ✅ The processor uses AI services to create new `EnhancedGraphNode` and `EnhancedGraphEdge` objects.
    4. ✅ The new nodes and edges are added to the `enhancedGraphStore`.
    5. ✅ The UI updates to reflect the new data.
    6. ⏳ **TODO:** Wire through `GraphEngine` for centralized processing coordination

## AI-Powered Features

✅ **Current Status:** AI services are functional and integrated:

- `AIService` supports multiple providers (Gemini/OpenAI/Anthropic)
- `IntelligentGraphProcessor` uses real AI for concept extraction
- `ai-enhanced-graph-discovery.ts` provides intelligent graph expansion

**Integration Status:**
- ✅ **Discovery Agent:** Already integrated via `IntelligentGraphProcessor` for document processing
- ⏳ **Summarization Agent:** Defined in `ai-agents.ts` but needs workflow integration
- ⏳ **Linking Agent:** Defined in `ai-agents.ts` but needs automatic connection suggestions
- ⏳ **Critique Agent:** Defined in `ai-agents.ts` but needs periodic quality evaluation

**Next Steps:**
- Wire AI agents through `GraphEngine` for centralized coordination
- Implement automatic linking suggestions after node creation
- Add periodic graph quality assessment

## Recent Progress

- [x] **Fixed PDF Processing Issues:** Resolved PDF.js CORS errors by switching from cloudflare to unpkg.com CDN
- [x] **Fixed TypeScript Type Errors:** Removed invalid `aiGenerated` property usage, replaced with proper `aiMetadata.discoverySource` approach
- [x] **Removed Broken Document Processors:** Moved problematic `enhanced-document-processor.ts` and unused `DocumentImporter.tsx` to archives
- [x] **Fixed AI Enhanced Graph Discovery:** Resolved all TypeScript compilation errors in `ai-enhanced-graph-discovery.ts`
- [x] **Unified Document Processing:** Now using only the working `IntelligentGraphProcessor` with real AI instead of hardcoded NLP

## Architectural Status

✅ **Current Active Implementation:**
- Uses `enhancedGraphStore.ts` and `EnhancedDocumentImporter`
- PDF processing works with intelligent concept extraction
- AI-powered graph discovery service is functional

❌ **Legacy Simple Implementation:** Successfully removed problematic components

## Todos

### Core Architecture
- [x] **Refactor `App.tsx` to use `enhancedGraphStore`:** Renamed `AppFixed` to `App` and updated export. (Completed)
- [x] **Integrate `EnhancedDocumentImporter` into `App.tsx`:** Already active and working with PDF processing. (Completed)
- [ ] **Wire up the `GraphEngine`:** Ensure that all node and edge creation, updates, and deletions are handled by the `GraphEngine`.
- [ ] **Implement the `linking-agent`:** The `linking-agent` needs to be called after a new node is created to suggest connections to existing nodes.
- [ ] **Implement the `critique-agent`:** The `critique-agent` should be run periodically to provide feedback on the graph's quality.

### Component Fixes
- [x] **Update `MyGraphCanvas.tsx` to support `EnhancedGraphNode` and `EnhancedGraphEdge`:** The canvas needs to be able to render the richer data model. (Completed: Fixed `addNode` to `createNode`, imported `Button`, removed unused `layoutMenuAnchor` and handlers, adjusted initial layout `useEffect`.)
- [x] **Fix `AIPanel.tsx` `onConnectionSuggest` prop:** Removed the `onConnectionSuggest` prop from `AIPanelProps` as it was not being passed from `App.tsx` and causing an error.

### TypeScript Cleanup (48 remaining errors)
- [ ] **Fix ErrorBoundary.tsx:** Remove unused `error` parameter in `componentDidCatch`
- [ ] **Fix NodeEditor.tsx:** Handle potentially undefined `editingNode.connections`
- [ ] **Fix SavedGraphs.tsx:** Remove unused `Divider` import
- [ ] **Fix Edge Components:** Remove unused parameters in `HierarchicalEdge.tsx` and `SemanticEdge.tsx`
- [ ] **Fix SourceNode.tsx:** Remove unused `LinkOff` import
- [ ] **Fix advanced-ai-agents.ts:** Resolve TreeQuest action function type mismatch
- [ ] **Fix ai-agents.ts:** Remove unused `executionId` variable
- [ ] **Fix cognitive-graph-demo.ts:** Fix service status interface mismatches (12 errors)
- [ ] **Fix document-processor.ts:** Resolve service method calls and type issues (10 errors)
- [ ] **Fix enhanced-context-service.ts:** Remove unused variables (4 errors)
- [ ] **Fix service-manager.ts:** Remove unused import
- [ ] **Fix enhancedGraphStore.ts:** Remove unused `userContext` parameters
- [ ] **Fix utils files:** Remove unused imports and parameters
- [ ] **Fix graph-serializer.ts:** Handle EnhancedGraphNode to GraphNode conversion

### Data Model & Architecture
- [ ] **Create a unified data model:** Ensure all components and services use the types defined in `src/types/enhanced-graph.ts`.
- [ ] **Remove redundant code:** Once the enhanced architecture is fully integrated, the simple `graphStore.ts` and related components can be removed.

### Service Integration
- [ ] **Fix ServiceManager interface:** Add missing `generateAIContent` method or update callers
- [ ] **Fix Service Status types:** Update health check interfaces to match implementation

## Priority Tasks

### 🔥 Critical (App Functionality)
1. **Wire up GraphEngine coordination:** Central processing hub for all AI agents
2. **Fix service interface mismatches:** ServiceManager and health check types
3. **Implement automatic linking suggestions:** Post-node-creation connection discovery

### ⚠️ Important (User Experience)
4. **Fix NodeEditor undefined connections:** Prevents UI crashes
5. **Implement critique agent workflow:** Periodic graph quality assessment
6. **Fix TreeQuest integration:** Action function type resolution

### 🧹 Cleanup (Code Quality)
7. **Remove unused imports/variables:** 30+ TypeScript warnings
8. **Standardize type interfaces:** Ensure consistency across services
9. **Remove legacy simple implementation:** Final cleanup
