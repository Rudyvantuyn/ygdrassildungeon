import type { Profile, WalletLedgerEntry } from "@ygd/shared";

export interface ProfileRepository {
  get(playerId: string): Profile | undefined;
  save(profile: Profile): Profile;
  list(): Profile[];
  appendLedger(entry: WalletLedgerEntry): void;
  getLedger(playerId: string): WalletLedgerEntry[];
}

class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();
  private readonly ledger = new Map<string, WalletLedgerEntry[]>();

  get(playerId: string): Profile | undefined {
    return this.profiles.get(playerId);
  }

  save(profile: Profile): Profile {
    this.profiles.set(profile.playerId, profile);
    return profile;
  }

  list(): Profile[] {
    return [...this.profiles.values()];
  }

  appendLedger(entry: WalletLedgerEntry): void {
    const items = this.ledger.get(entry.playerId) ?? [];
    items.push(entry);
    this.ledger.set(entry.playerId, items);
  }

  getLedger(playerId: string): WalletLedgerEntry[] {
    return this.ledger.get(playerId) ?? [];
  }
}

export const profileRepository: ProfileRepository = new InMemoryProfileRepository();
