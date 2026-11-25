// PWA install/service worker do not apply inside an Orca panel.
export const subscribeInstall = (_fn: () => void): (() => void) => () => {};
export const canPromptInstall = (): boolean => false;
export const isStandalone = (): boolean => true;
export const isIosSafari = (): boolean => false;
export const promptInstall = async (): Promise<boolean> => false;
export const registerPwa = (): (() => void) => () => {};
