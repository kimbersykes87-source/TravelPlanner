import { ViewerContext } from './viewer-context';

export function ViewerProvider({ children, value }) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}
