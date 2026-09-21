import { createContext } from 'react';

export const ViewerContext = createContext({ isViewer: false, basePath: '', token: '' });
