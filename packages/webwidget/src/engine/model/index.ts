export * from './types';
export * from './widget';
export * from './animation';
export * from './bindings';
export { widgetRegistry, type WidgetRegistration } from './registry';

// Ensure widget components are registered before any code uses createWidget()
import '../../components/text';
import '../../components/clock';
import '../../components/image';
import '../../components/video';
import '../../components/html';
import '../../components/iframe';
import '../../components/live2d';
