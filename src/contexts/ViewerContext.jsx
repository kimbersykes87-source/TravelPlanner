import { createContext, useContext } from 'react';

const ViewerContext = createContext({ isViewer: false, basePath: '' });

export function ViewerProvider({ children, value }) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}
