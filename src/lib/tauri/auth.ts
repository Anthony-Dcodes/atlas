import { invoke } from "@tauri-apps/api/core";

export async function checkFirstRun(): Promise<boolean> {
  return invoke<boolean>("check_first_run");
}

export async function setupDb(passphrase: string): Promise<void> {
  return invoke<void>("setup_db", { passphrase });
}

export async function unlockDb(passphrase: string): Promise<void> {
  return invoke<void>("unlock_db", { passphrase });
}
