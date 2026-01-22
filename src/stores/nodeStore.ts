import { create } from 'zustand';

interface NodeState {
    currentNodeId: string | null;
    setCurrentNode: (id: string | null) => void;
}

export const useNodeStore = create<NodeState>((set) => ({
    currentNodeId: null,
    setCurrentNode: (id) => set({ currentNodeId: id }),
}));
