import { useAuth } from "../contexts/AuthContext";

export const Header = () => {
  const { logout, isAuthenticated, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header>
      <span>Welcome, {user?.email}</span>
      <button onClick={handleLogout}>Sign Out</button>
    </header>
  );
};
