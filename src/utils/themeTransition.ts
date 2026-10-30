import { AppTheme, useUIStore } from '@/stores/uiStore';

type OriginInput =
  | { x: number; y: number }
  | React.MouseEvent<HTMLElement>
  | MouseEvent
  | HTMLElement
  | null
  | undefined;

/**
 * Executes a smooth circular reveal theme transition originating from
 * the theme toggle button's position.
 */
export const toggleThemeWithAnimation = (
  origin?: OriginInput,
  targetTheme?: AppTheme
): void => {
  const store = useUIStore.getState();
  const currentTheme = store.theme;
  const isCurrentlyDark =
    currentTheme === 'dark' ||
    (currentTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const nextTheme: AppTheme = targetTheme
    ? targetTheme
    : isCurrentlyDark
    ? 'light'
    : 'dark';

  if (targetTheme && targetTheme === currentTheme) {
    return;
  }

  // Calculate coordinates of the trigger element
  let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  let y = 0;

  if (origin) {
    if ('clientX' in origin && typeof origin.clientX === 'number') {
      x = origin.clientX;
      y = origin.clientY;
    } else if (
      'getBoundingClientRect' in origin &&
      typeof origin.getBoundingClientRect === 'function'
    ) {
      const rect = origin.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if ('x' in origin && 'y' in origin) {
      x = origin.x;
      y = origin.y;
    }
  }

  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fallback for browsers without View Transitions or if reduced motion is requested
  if (
    typeof document === 'undefined' ||
    typeof (document as any).startViewTransition !== 'function' ||
    isReducedMotion
  ) {
    store.setTheme(nextTheme);
    return;
  }

  // Maximum radius to guarantee covering all 4 viewport corners
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = (document as any).startViewTransition(() => {
    store.setTheme(nextTheme);
  });

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 460,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch((err: unknown) => {
      // In case transition was skipped or aborted
      console.debug('Theme transition:', err);
    });
};
