/**
 * A generic Min-Priority Queue implementation.
 * Elements are popped in ascending order of priority (lowest number comes out first).
 */
export class PriorityQueue<T> {
    private heap: { element: T; priority: number }[] = [];

    /**
     * Pushes an element into the queue with a given priority.
     * @param element The item to store.
     * @param priority The priority value (lower value = higher priority).
     */
    push(element: T, priority: number): void {
        const node = { element, priority };
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }

    /**
     * Removes and returns the element with the lowest priority value.
     */
    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;

        const min = this.heap[0];
        const end = this.heap.pop();

        if (this.heap.length > 0 && end) {
            this.heap[0] = end;
            this.sinkDown(0);
        }

        return min.element;
    }

    /**
     * Returns the lowest priority element without removing it.
     */
    peek(): T | undefined {
        return this.heap.length > 0 ? this.heap[0].element : undefined;
    }

    get length(): number {
        return this.heap.length;
    }

    get isEmpty(): boolean {
        return this.heap.length === 0;
    }

    private bubbleUp(n: number): void {
        const element = this.heap[n];

        while (n > 0) {
            const parentN = Math.floor((n + 1) / 2) - 1;
            const parent = this.heap[parentN];

            if (element.priority >= parent.priority) break;

            this.heap[parentN] = element;
            this.heap[n] = parent;
            n = parentN;
        }
    }

    private sinkDown(n: number): void {
        const length = this.heap.length;
        const element = this.heap[n];

        while (true) {
            const child2N = (n + 1) * 2;
            const child1N = child2N - 1;
            let swap: number | null = null;
            let child1Priority = Infinity;

            if (child1N < length) {
                const child1 = this.heap[child1N];
                child1Priority = child1.priority;
                if (child1Priority < element.priority) {
                    swap = child1N;
                }
            }

            if (child2N < length) {
                const child2 = this.heap[child2N];
                if (child2.priority < (swap === null ? element.priority : child1Priority)) {
                    swap = child2N;
                }
            }

            if (swap === null) break;

            this.heap[n] = this.heap[swap];
            this.heap[swap] = element;
            n = swap;
        }
    }
}
