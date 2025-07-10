# Issues and Improvements

This document outlines the key issues identified in the current codebase and a plan for improvements to create a robust and AI-powered knowledge graph application.

## Architectural Issues

The most critical issue is the disconnected architecture. The application is currently split into two parallel implementations:

*   **Simple Implementation:** Uses `graphStore.ts` and basic components. This is what is currently active in `App.tsx`.
*   **Enhanced Implementation:** Uses `enhancedGraphStore.ts`, `GraphEngine.ts`, and a rich set of AI-powered services and components. This implementation is currently dormant.

This separation is the root cause of the lost functionality and the lack of AI-powered features in the running application.

**The primary goal is to unify the application around the enhanced architecture.**

## Data Ingestion and Processing

The current data ingestion process is not fully integrated with the `GraphEngine`. To enable intelligent data processing, the following improvements are needed:

*   **Integrate `EnhancedDocumentImporter`:** The `EnhancedDocumentImporter` component, which is capable of semantic processing, needs to be the primary way to import documents.
*   **Connect to `GraphEngine`:** The document importer should send the extracted text to the `GraphEngine` for processing, which will then use the AI agents to create enriched nodes and edges.
*   **Define Clear Data Flow:** A clear data flow needs to be established:
    1.  Document is uploaded through the `EnhancedDocumentImporter`.
    2.  The text is sent to the `GraphEngine`.
    3.  The `GraphEngine` uses the `DiscoveryAgent` to process the text and create new `EnhancedGraphNode` and `EnhancedGraphEdge` objects.
    4.  The new nodes and edges are added to the `enhancedGraphStore`.
    5.  The UI updates to reflect the new data.

## AI-Powered Features

The AI agents defined in `ai-agents.ts` are the core of the application's intelligence. They need to be fully integrated into the application's workflow:

*   **Discovery Agent:** This agent should be used by the `GraphEngine` to process new documents and create new nodes and edges.
*   **Summarization Agent:** This agent should be used to automatically generate summaries for nodes with large amounts of text.
*   **Linking Agent:** This agent should be used to automatically suggest and create connections between nodes based on semantic similarity.
*   **Critique Agent:** This agent should be used to evaluate the quality of the graph and suggest improvements.

## Todos

- [x] **Refactor `App.tsx` to use `enhancedGraphStore`:** Renamed `AppFixed` to `App` and updated export. (Completed)
- [ ] **Integrate `EnhancedDocumentImporter` into `App.tsx`:** Replace the current `DocumentImporter` with the enhanced version.
- [ ] **Wire up the `GraphEngine`:** Ensure that all node and edge creation, updates, and deletions are handled by the `GraphEngine`.
- [ ] **Implement the `linking-agent`:** The `linking-agent` needs to be called after a new node is created to suggest connections to existing nodes.
- [ ] **Implement the `critique-agent`:** The `critique-agent` should be run periodically to provide feedback on the graph's quality.
- [x] **Update `MyGraphCanvas.tsx` to support `EnhancedGraphNode` and `EnhancedGraphEdge`:** The canvas needs to be able to render the richer data model. (Completed: Fixed `addNode` to `createNode`, imported `Button`, removed unused `layoutMenuAnchor` and handlers, adjusted initial layout `useEffect`.)
- [x] **Fix `AIPanel.tsx` `onConnectionSuggest` prop:** Removed the `onConnectionSuggest` prop from `AIPanelProps` as it was not being passed from `App.tsx` and causing an error.
- [ ] **Create a unified data model:** Ensure all components and services use the types defined in `src/types/enhanced-graph.ts`.
- [ ] **Remove redundant code:** Once the enhanced architecture is fully integrated, the simple `graphStore.ts` and related components can be removed.
