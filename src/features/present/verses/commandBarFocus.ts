let focusBar: (() => void) | null = null;

export function registerCommandBar(fn: (() => void) | null): void {
  focusBar = fn;
}

/** Focuses the verse command bar from anywhere (the "/" shortcut). */
export function focusCommandBar(): void {
  focusBar?.();
}
