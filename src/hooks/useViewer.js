import { useContext } from 'react';
import { ViewerContext } from '../contexts/viewer-context';

export function useViewer() {
  return useContext(ViewerContext);
}
