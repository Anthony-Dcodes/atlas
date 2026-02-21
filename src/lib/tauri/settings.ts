import { invoke } from "@tauri-apps/api/core";

export async function saveApiKey(
  provider: string,
  key: string,
): Promise<void> {
  return invoke<void>("save_api_key", { provider, key });
}

export async function hasApiKey(provider: string): Promise<boolean> {
  return invoke<boolean>("has_api_key", { provider });
}

export async function removeApiKey(provider: string): Promise<void> {
  return invoke<void>("remove_api_key", { provider });
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

export async function saveSetting(
  key: string,
  value: string,
): Promise<void> {
  return invoke<void>("save_setting", { key, value });
}
