import React, { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import { useAuth } from "../contexts/AuthContext";
import type {
  ListPasswordEntriesResponse,
  PasswordEntry,
} from "../types/passwords";

export const Home: React.FC = () => {
  const { api } = useApi();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const data = await api.get<ListPasswordEntriesResponse>("/passwords");
        setPasswords(data.items);
      } catch (error) {
        console.error("Failed to fetch passwords:", error);
        setError("Failed to load passwords.");
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchPasswords();
  }, [api]);

  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome, {user?.firstName}!</p>
      {loading && <p>Loading passwords...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {passwords && (
        <ul>
          {passwords.map((entry: PasswordEntry) => (
            <li key={entry.entryId}>
              {entry.label} - {entry.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
