
import CORE_TOPOLOGY from '../generated/coreTopology.json';
import EXTRA_TOPOLOGY from '../generated/extraTopology.json';

const DEFAULT_TOPOLOGY = [...(CORE_TOPOLOGY as any[]), ...(EXTRA_TOPOLOGY as any[])];

export function getDefaultTopology(): any[] {
    return DEFAULT_TOPOLOGY as any[];
}
