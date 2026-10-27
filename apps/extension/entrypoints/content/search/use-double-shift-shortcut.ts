// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef } from 'react';

import { isEditableTarget } from '../selection';
import { DoubleShiftDetector } from './double-shift';

export function useDoubleShiftShortcut(
  onOpen: () => void,
  enabled = true,
): void {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const detector = new DoubleShiftDetector();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        detector.reset();
        return;
      }

      if (!detector.register(event)) {
        return;
      }

      event.preventDefault();
      onOpenRef.current();
    };
    const reset = () => detector.reset();

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', reset);
    };
  }, [enabled]);
}
