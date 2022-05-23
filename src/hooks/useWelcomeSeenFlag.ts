import useLocalStorageState from "use-local-storage-state";
import type { LocalStorageState } from "use-local-storage-state";

interface WelcomeSeenFlag {
  welcomeSeen: boolean;
}

const useWelcomeSeenFlag = (): LocalStorageState<WelcomeSeenFlag> => {
  return useLocalStorageState<WelcomeSeenFlag>("welcomeSeenFlag", {
    defaultValue: { welcomeSeen: false },
  });
};

export default useWelcomeSeenFlag;
