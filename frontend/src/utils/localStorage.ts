export function getLocalStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export function setLocalStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {

    }
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
   
    }
  }
}
