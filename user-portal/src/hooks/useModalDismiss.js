import { useEffect, useRef } from 'react';

// Module-scoped state to handle multiple / nested modals cleanly
let activeModalCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyPaddingRight = '';

// Global stack of currently open modals: array of { instanceId, modalId, depth, onCloseRef }
let modalStack = [];

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
 * Supports nested / stacked modals gracefully: closing a child modal (via UI button,
 * Escape key, or browser back button) never inadvertently closes parent modals.
 *
 * @param {boolean} isOpen - Whether the modal is currently open.
 * @param {function} onClose - Callback function to close the modal.
 * @param {string} [modalId='modal'] - Optional identifier for the modal.
 * @param {object|boolean} [options={}] - Optional configuration: { pushHistory: true }
 */
export function useModalDismiss(isOpen, onClose, modalId = 'modal', options = {}) {
  const { pushHistory = true } = typeof options === 'boolean' ? { pushHistory: options } : options;
  const hasPushedState = useRef(false);
  const myDepthRef = useRef(0);
  const instanceIdRef = useRef('');
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      // If modal was closed programmatically (e.g. clicking [X], Continue, Cancel)
      // and we had previously pushed a history state, pop it cleanly if history is still at our depth.
      if (hasPushedState.current && typeof window !== 'undefined') {
        hasPushedState.current = false;
        if (window.history.state && window.history.state._modalDepth === myDepthRef.current) {
          window.history.back();
        }
      }
      return;
    }

    // 1. Lock background scrolling while modal is open
    lockScroll();

    // 2. Generate a unique instance ID and register in global modalStack
    const instanceId = `${modalId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    instanceIdRef.current = instanceId;
    const depth = modalStack.length + 1;
    myDepthRef.current = depth;

    modalStack.push({
      instanceId,
      modalId,
      depth,
      onCloseRef
    });

    // 3. Push history state for mobile back gesture / Android hardware back button
    if (pushHistory && typeof window !== 'undefined') {
      window.history.pushState(
        { _modalOpen: true, _modalId: modalId, _modalDepth: depth, _instanceId: instanceId },
        ''
      );
      hasPushedState.current = true;
    }

    // 4. Handle popstate (mobile back swipe or browser back button or child modal back())
    const handlePopState = (e) => {
      const targetDepth = (e.state && typeof e.state._modalDepth === 'number') ? e.state._modalDepth : 0;
      const myDepth = myDepthRef.current;

      // If the browser navigated to a depth that is >= this modal's depth,
      // it means a deeper (child) modal was popped back to this modal.
      // This modal is STILL active in history — DO NOT close it!
      if (targetDepth >= myDepth) {
        return;
      }

      // The browser navigated back past this modal.
      if (hasPushedState.current) {
        hasPushedState.current = false;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    };

    // 5. Handle Desktop Escape Key (only the topmost modal in the stack handles it)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (modalStack.length === 0) return;
        const topModal = modalStack[modalStack.length - 1];
        if (topModal && topModal.instanceId === instanceIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      }
    };

    if (pushHistory && typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (pushHistory && typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
      window.removeEventListener('keydown', handleKeyDown);
      modalStack = modalStack.filter((m) => m.instanceId !== instanceId);
      unlockScroll();
    };
  }, [isOpen, modalId, pushHistory]);
}

export default useModalDismiss;

