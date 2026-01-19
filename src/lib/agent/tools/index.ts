export * from './types';
export * from './ToolRegistry';
export * from './standardTools';
export * from './pedestrianTools';

import { ToolRegistry } from './ToolRegistry';
import { FareTool, FacilityTool, TimetableTool, WeatherTool, TrainStatusTool } from './standardTools';
import { NavigationTool } from './navigationTool';

export function registerStandardTools() {
    const registry = ToolRegistry.getInstance();

    // L2 Tools
    registry.register(new FareTool());
    registry.register(new TimetableTool());
    registry.register(new WeatherTool());
    registry.register(new TrainStatusTool());

    // L3 Tools
    registry.register(new FacilityTool());
    registry.register(new NavigationTool());

    console.log('✅ Standard AI Tools Registered');
}
