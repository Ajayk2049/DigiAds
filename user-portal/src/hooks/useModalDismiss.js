import { useEffect, useRef } from 'react';

// Module-scoped state to handle multiple / nested modals cleanly
let activeModalCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyPaddingRight = '';

function lockScroll() {
  if (typeof document === 'undefined') return;
  if (activeModalCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalBodyOverflow = document.body.style.overflow || '';
    originalHtmlOverflow = document.documentElement.style.overflow || '';
    originalBodyPaddingRight = document.body.style.paddingRight || '';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  activeModalCount++;
}

function unlockScroll() {
  if (typeof document === 'undefined') return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.documentElement.style.overflow = originalHtmlOverflow;
    document.body.style.paddingRight = originalBodyPaddingRight;
  }
}

/**
 * Universal hook for Escape key (Desktop), Back gesture / hardware back button (Mobile),
 * and background scroll locking on popups, modals, drawers, and lightboxes.
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

    // 1. Lock background scrolling while modal is open
    lockScroll();

    // 2. Push history state for mobile back gesture / Android hardware back button
    if (typeof window !== 'undefined') {
      window.history.pushState({ _modalOpen: true, _modalId: modalId }, '');
      hasPushedState.current = true;
    }

    // 3. Handle popstate (mobile back swipe or browser back button)
    const handlePopState = (e) => {
      if (hasPushedState.current) {
        hasPushedState.current = false;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    };

    // 4. Handle Desktop Escape Key
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
      unlockScroll();
    };
  }, [isOpen, modalId]);
}

export default useModalDismiss;
