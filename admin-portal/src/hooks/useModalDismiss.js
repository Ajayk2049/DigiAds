import { useEffect, useRef } from 'react';

/**
 * Universal hook for Escape key (Desktop) and Back gesture / hardware back button (Mobile)
 * dismissal on popups, modals, drawers, and lightboxes.
 *
 * @param {boolean} isOpen - Whether the modal is currently open.
 * @param {function} onClose - Callback function to close the modal.
 * @param {string} [modalId='modal'] - Optional identifier for the modal.
 */
export function useModalDismiss(isOpen, onClose, modalId = 'modal') {
  const hasPushedState = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      // If modal was closed by user action (e.g. clicking [X] or backdrop)
      // and we had previously pushed a history state, pop it cleanly.
      if (hasPushedState.current && typeof window !== 'undefined') {
        hasPushedState.current = false;
        if (window.history.state && window.history.state._modalId === modalId) {
          window.history.back();
        }
      }
      return;
    }

    // 1. Push history state for mobile back gesture / Android hardware back button
    if (typeof window !== 'undefined') {
      window.history.pushState({ _modalOpen: true, _modalId: modalId }, '');
      hasPushedState.current = true;
    }

    // 2. Handle popstate (mobile back swipe or browser back button)
    const handlePopState = (e) => {
      if (hasPushedState.current) {
        hasPushedState.current = false;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    };

    // 3. Handle Desktop Escape Key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, modalId]);
}

export default useModalDismiss;
